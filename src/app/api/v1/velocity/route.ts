import { NextResponse } from "next/server";
import { logApiCall, validateApiKey } from "@/lib/developers/console";
import { getDb } from "@/lib/storage/database";
import { runPsiAudit, psiAuditHistory } from "@/lib/studio/velocity-psi";
import type { StudioSite } from "@/lib/studio/types";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * Public developer API — Velocity (PageSpeed Insights réel).
 * POST /api/v1/velocity  { domain, url?, strategy? }
 * Auth: Bearer ayb_live_… scope velocity
 * Déclenche un audit Lighthouse via Google PSI pour un domaine Studio vérifié du projet.
 */
export async function POST(req: Request) {
  const endpoint = "velocity";
  const started = Date.now();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
  const urlObj = new URL(req.url);
  const presented = bearer || urlObj.searchParams.get("key");
  const check = validateApiKey(presented, "velocity", req, endpoint);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const body = (await req.json().catch(() => ({}))) as {
    domain?: string;
    url?: string;
    strategy?: "mobile" | "desktop";
  };
  const domain = (body.domain || "").trim().toLowerCase().replace(/^www\./, "");
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

  const strategy = body.strategy === "desktop" ? "desktop" : "mobile";

  try {
    const audit = await runPsiAudit(site, body.url, strategy);
    logApiCall(check.keyId, check.projectId, endpoint, started, ip);
    return NextResponse.json({
      domain: site.domain,
      source: "pagespeed_insights",
      audit: {
        id: audit.id,
        url: audit.url,
        strategy: audit.strategy,
        timestamp: audit.timestamp,
        scores: audit.scores,
        metrics: audit.metrics,
        fieldData: audit.fieldData,
        opportunities: audit.opportunities.slice(0, 8),
      },
      history: psiAuditHistory(site.id).slice(0, 10),
    });
  } catch (e) {
    const status = e && typeof e === "object" && "status" in e ? Number((e as { status: number }).status) : 502;
    return NextResponse.json(
      {
        error: "Audit Velocity indisponible",
        message: e instanceof Error ? e.message : "error",
      },
      { status: status === 429 ? 429 : 502 },
    );
  }
}
