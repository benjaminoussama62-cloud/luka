import { NextResponse } from "next/server";
import { logApiCall, validateApiKey } from "@/lib/developers/console";
import { getDb } from "@/lib/storage/database";
import {
  radarBreakdown,
  radarPerformanceCompare,
  radarPerformanceSeries,
  radarPerformanceTotals,
  type RadarDimension,
} from "@/lib/studio/radar-console";

export const runtime = "nodejs";

/**
 * Public developer API — Radar Performance (Search Console-like).
 * GET /api/v1/radar?domain=example.com&days=28&dim=query
 * Auth: Bearer ayb_live_… scope radar
 * Ne renvoie que les domaines des sites Studio appartenant au projet (via clés).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const endpoint = "radar";
  const started = Date.now();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
  const presented = bearer || url.searchParams.get("key");
  const check = validateApiKey(presented, "radar", req, endpoint);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const domain = (url.searchParams.get("domain") || "").trim().toLowerCase().replace(/^www\./, "");
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return NextResponse.json({ error: "Paramètre domain requis (ex. example.com)" }, { status: 400 });
  }

  // Autorise uniquement un domaine rattaché à un site Studio du propriétaire du projet.
  const db = getDb();
  const project = db
    .prepare("SELECT owner_user_id FROM developer_projects WHERE id = ?")
    .get(check.projectId) as { owner_user_id: string } | undefined;
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }
  const owned = db
    .prepare(
      `SELECT id FROM studio_sites
       WHERE user_id = ? AND status = 'verified'
         AND (lower(domain) = ? OR lower(domain) = ?)
       LIMIT 1`,
    )
    .get(project.owner_user_id, domain, `www.${domain}`) as { id: string } | undefined;
  if (!owned) {
    return NextResponse.json(
      { error: "Domaine non autorisé — ajoutez-le dans Ayeba Studio puis vérifiez-le" },
      { status: 403 },
    );
  }

  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 28));
  const dim = (url.searchParams.get("dim") || "query") as RadarDimension;
  const safeDim = ["query", "url", "country", "device"].includes(dim) ? dim : "query";

  try {
    logApiCall(check.keyId, check.projectId, endpoint, started, ip);
    return NextResponse.json({
      domain,
      days,
      totals: radarPerformanceTotals(domain, days),
      compare: radarPerformanceCompare(domain, days),
      series: radarPerformanceSeries(domain, days),
      breakdown: radarBreakdown(domain, safeDim, days, 100),
      dim: safeDim,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Radar indisponible", message: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
