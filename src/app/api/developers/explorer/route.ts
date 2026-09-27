import { NextResponse } from "next/server";
import { getDb } from "@/lib/storage/database";
import { requireDeveloperSession } from "@/lib/developers/session";
import { listEnabledApis, projectAccess } from "@/lib/developers/console";
import { catalogEntry } from "@/lib/developers/catalog";
import { liveSearch } from "@/lib/real-search";
import { suggestQueries } from "@/lib/ayeba-index";
import { advancedSearch } from "@/lib/ayebi/db-sqlite";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Explorateur d'API — exécute une vraie requête au nom du projet sélectionné.
 * L'appel est journalisé dans developer_api_logs (endpoint "explorer:<api>")
 * comme n'importe quel appel /api/v1, avec la clé active du projet si présente.
 * POST {projectId, apiId, params: {q, limit}}
 */
export async function POST(req: Request) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => null)) as
    | { projectId?: string; apiId?: string; params?: Record<string, string> }
    | null;
  if (!body?.projectId || !body.apiId) {
    return NextResponse.json({ error: "projectId et apiId requis" }, { status: 400 });
  }
  if (!projectAccess(body.projectId, auth.user.id)) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }
  const api = catalogEntry(body.apiId);
  if (!api) return NextResponse.json({ error: "API inconnue" }, { status: 404 });
  if (!listEnabledApis(body.projectId).includes(api.id)) {
    return NextResponse.json(
      { error: `Activez d'abord « ${api.name} » pour ce projet` },
      { status: 403 },
    );
  }

  const q = (body.params?.q || body.params?.domain || "").trim();
  if (!q && !["radar", "crawl", "velocity"].includes(api.id)) {
    return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });
  }
  const limit = Math.min(50, Math.max(1, Number(body.params?.limit) || 10));

  const db = getDb();
  const key = db
    .prepare(
      "SELECT id FROM developer_api_keys WHERE project_id = ? AND status = 'active' ORDER BY created_at LIMIT 1",
    )
    .get(body.projectId) as { id: string } | undefined;
  const started = Date.now();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";

  const log = (status: number) => {
    db.prepare(
      "INSERT INTO developer_api_logs (key_id, project_id, endpoint, status_code, latency_ms, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      key?.id || "console",
      body.projectId,
      `explorer:${api.id}`,
      status,
      Date.now() - started,
      ip,
      new Date().toISOString(),
    );
  };

  try {
    if (api.id === "search") {
      const serp = await liveSearch(q, {
        skipUpstream: true,
        zeroAi: true,
        zeroAds: true,
        privateMode: true,
        sliders: { audience: 35, authority: 55, locality: 40 },
        timings: {},
      });
      log(200);
      return NextResponse.json({
        status: 200,
        latencyMs: Date.now() - started,
        body: {
          query: q,
          total: serp.results.length,
          results: serp.results.slice(0, limit).map((r) => ({
            title: r.title,
            url: r.url,
            domain: r.domain,
            description: r.snippet,
          })),
          knowledge: serp.knowledge || null,
        },
      });
    }
    if (api.id === "suggest") {
      const suggestions = suggestQueries(q).slice(0, Math.min(10, limit));
      log(200);
      return NextResponse.json({
        status: 200,
        latencyMs: Date.now() - started,
        body: { query: q, suggestions },
      });
    }
    if (api.id === "ayebi") {
      const category = (body.params?.category || "").trim() || undefined;
      const results = advancedSearch(q, { category, sortBy: "relevance", limit });
      log(200);
      return NextResponse.json({
        status: 200,
        latencyMs: Date.now() - started,
        body: {
          query: q,
          total: results.length,
          source: "ayebi",
          results: results.map((a) => ({
            slug: a.slug,
            title: a.title,
            subtitle: a.subtitle,
            category: a.category,
            summary: a.summary,
            url: `https://ayeba.app/ayebi/${a.slug}`,
            stub: a.stub,
          })),
        },
      });
    }
    if (api.id === "radar") {
      const domain = (body.params?.domain || "").trim().toLowerCase().replace(/^www\./, "");
      if (!domain) {
        return NextResponse.json({ error: "Paramètre domain requis" }, { status: 400 });
      }
      const owned = db
        .prepare(
          `SELECT id FROM studio_sites
           WHERE user_id = ? AND status = 'verified'
             AND (lower(domain) = ? OR lower(domain) = ?)
           LIMIT 1`,
        )
        .get(auth.user.id, domain, `www.${domain}`) as { id: string } | undefined;
      if (!owned) {
        return NextResponse.json(
          { error: "Domaine Studio non vérifié pour ce compte" },
          { status: 403 },
        );
      }
      const days = Math.min(90, Math.max(1, Number(body.params?.days) || 28));
      const dim = (body.params?.dim || "query") as "query" | "url" | "country" | "device";
      const {
        radarBreakdown,
        radarPerformanceCompare,
        radarPerformanceSeries,
        radarPerformanceTotals,
      } = await import("@/lib/studio/radar-console");
      log(200);
      return NextResponse.json({
        status: 200,
        latencyMs: Date.now() - started,
        body: {
          domain,
          days,
          totals: radarPerformanceTotals(domain, days),
          compare: radarPerformanceCompare(domain, days),
          series: radarPerformanceSeries(domain, days),
          breakdown: radarBreakdown(
            domain,
            ["query", "url", "country", "device"].includes(dim) ? dim : "query",
            days,
            50,
          ),
        },
      });
    }
    if (api.id === "crawl") {
      const domain = (body.params?.domain || "").trim().toLowerCase().replace(/^www\./, "");
      if (!domain) {
        return NextResponse.json({ error: "Paramètre domain requis" }, { status: 400 });
      }
      const siteRow = db
        .prepare(
          `SELECT id, user_id, domain, display_name, sitemap_url, status, verify_token, verified_at, created_at
           FROM studio_sites
           WHERE user_id = ? AND status = 'verified'
             AND (lower(domain) = ? OR lower(domain) = ?)
           LIMIT 1`,
        )
        .get(auth.user.id, domain, `www.${domain}`) as
        | {
            id: string;
            user_id: string;
            domain: string;
            display_name: string;
            sitemap_url: string;
            status: string;
            verify_token: string;
            verified_at: string | null;
            created_at: string;
          }
        | undefined;
      if (!siteRow) {
        return NextResponse.json(
          { error: "Domaine Studio non vérifié pour ce compte" },
          { status: 403 },
        );
      }
      const { radarCoverage } = await import("@/lib/studio/radar-console");
      const { radarOverview } = await import("@/lib/studio/radar");
      const site = {
        id: siteRow.id,
        userId: siteRow.user_id,
        domain: siteRow.domain.replace(/^www\./, ""),
        displayName: siteRow.display_name,
        sitemapUrl: siteRow.sitemap_url,
        status: siteRow.status as "verified",
        verifyToken: siteRow.verify_token,
        verifiedAt: siteRow.verified_at,
        createdAt: siteRow.created_at,
      };
      const overview = radarOverview(site);
      const coverage = radarCoverage(site);
      log(200);
      return NextResponse.json({
        status: 200,
        latencyMs: Date.now() - started,
        body: {
          domain: site.domain,
          status: "verified",
          overview: {
            indexedPages: overview.indexedPages,
            submittedUrls: overview.submittedUrls,
            coveragePct: overview.coveragePct,
            queuePending: overview.queuePending,
            queueFailed: overview.queueFailed,
          },
          coverage: {
            totals: coverage.totals,
            pendingCount: (coverage.pending || []).length,
            failedCount: (coverage.failed || []).length,
          },
        },
      });
    }
    if (api.id === "velocity") {
      const domain = (body.params?.domain || "").trim().toLowerCase().replace(/^www\./, "");
      if (!domain) {
        return NextResponse.json({ error: "Paramètre domain requis" }, { status: 400 });
      }
      const siteRow = db
        .prepare(
          `SELECT id, user_id, domain, display_name, sitemap_url, status, verify_token, verified_at, created_at
           FROM studio_sites
           WHERE user_id = ? AND status = 'verified'
             AND (lower(domain) = ? OR lower(domain) = ?)
           LIMIT 1`,
        )
        .get(auth.user.id, domain, `www.${domain}`) as
        | {
            id: string;
            user_id: string;
            domain: string;
            display_name: string;
            sitemap_url: string;
            status: string;
            verify_token: string;
            verified_at: string | null;
            created_at: string;
          }
        | undefined;
      if (!siteRow) {
        return NextResponse.json(
          { error: "Domaine Studio non vérifié pour ce compte" },
          { status: 403 },
        );
      }
      const { runPsiAudit, psiAuditHistory } = await import("@/lib/studio/velocity-psi");
      const site = {
        id: siteRow.id,
        userId: siteRow.user_id,
        domain: siteRow.domain.replace(/^www\./, ""),
        displayName: siteRow.display_name,
        sitemapUrl: siteRow.sitemap_url,
        status: siteRow.status as "verified",
        verifyToken: siteRow.verify_token,
        verifiedAt: siteRow.verified_at,
        createdAt: siteRow.created_at,
      };
      const strategy = body.params?.strategy === "desktop" ? "desktop" : "mobile";
      const audit = await runPsiAudit(site, body.params?.url, strategy);
      log(200);
      return NextResponse.json({
        status: 200,
        latencyMs: Date.now() - started,
        body: {
          domain: site.domain,
          source: "pagespeed_insights",
          audit: {
            id: audit.id,
            url: audit.url,
            strategy: audit.strategy,
            scores: audit.scores,
            metrics: audit.metrics,
          },
          history: psiAuditHistory(site.id).slice(0, 5),
        },
      });
    }
    log(501);
    return NextResponse.json({ error: "API non exécutable" }, { status: 501 });
  } catch (e) {
    log(500);
    return NextResponse.json(
      { error: "Exécution échouée", message: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
