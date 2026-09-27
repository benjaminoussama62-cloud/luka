import { NextResponse } from "next/server";
import { logApiCall, validateApiKey } from "@/lib/developers/console";
import { getDb } from "@/lib/storage/database";
import { radarCoverage } from "@/lib/studio/radar-console";
import { radarOverview } from "@/lib/studio/radar";
import type { StudioSite } from "@/lib/studio/types";

export const runtime = "nodejs";

/**
 * Public developer API — statut d'indexation / crawl.
 * GET /api/v1/crawl/status?domain=example.com
 * Auth: Bearer ayb_live_… scope crawl
 * Domaines Studio vérifiés du propriétaire du projet uniquement — données crawl_documents réelles.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const endpoint = "crawl/status";
  const started = Date.now();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
  const presented = bearer || url.searchParams.get("key");
  const check = validateApiKey(presented, "crawl", req, endpoint);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const domain = (url.searchParams.get("domain") || "").trim().toLowerCase().replace(/^www\./, "");
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return NextResponse.json({ error: "Paramètre domain requis (ex. example.com)" }, { status: 400 });
  }

  const db = getDb();
  const project = db
    .prepare("SELECT owner_user_id FROM developer_projects WHERE id = ?")
    .get(check.projectId) as { owner_user_id: string } | undefined;
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const row = db
    .prepare(
      `SELECT id, user_id, domain, display_name, sitemap_url, status, verify_token, verified_at, created_at
       FROM studio_sites
       WHERE user_id = ? AND status = 'verified'
         AND (lower(domain) = ? OR lower(domain) = ?)
       LIMIT 1`,
    )
    .get(project.owner_user_id, domain, `www.${domain}`) as
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

  if (!row) {
    return NextResponse.json(
      { error: "Domaine non autorisé — ajoutez-le dans Ayeba Studio puis vérifiez-le" },
      { status: 403 },
    );
  }

  const site: StudioSite = {
    id: row.id,
    userId: row.user_id,
    domain: row.domain.replace(/^www\./, ""),
    displayName: row.display_name,
    sitemapUrl: row.sitemap_url,
    status: row.status as StudioSite["status"],
    verifyToken: row.verify_token,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
  };

  try {
    const overview = radarOverview(site);
    const coverage = radarCoverage(site);
    logApiCall(check.keyId, check.projectId, endpoint, started, ip);
    return NextResponse.json({
      domain: site.domain,
      status: "verified",
      overview: {
        indexedPages: overview.indexedPages,
        submittedUrls: overview.submittedUrls,
        coveragePct: overview.coveragePct,
        queuePending: overview.queuePending,
        queueFailed: overview.queueFailed,
        clicks7d: overview.clicks7d,
        impressions7d: overview.impressions7d,
      },
      coverage: {
        totals: coverage.totals,
        recentIndexed: (coverage.pages || []).slice(0, 25).map((p: { url: string; title: string; crawledAt: string }) => ({
          url: p.url,
          title: p.title,
          crawledAt: p.crawledAt,
        })),
        pendingCount: (coverage.pending || []).length,
        failedCount: (coverage.failed || []).length,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Statut crawl indisponible", message: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
