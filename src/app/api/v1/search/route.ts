import { NextResponse } from "next/server";
import { logApiCall, validateApiKey } from "@/lib/developers/console";
import { liveSearch } from "@/lib/real-search";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Public developer API — Ayeba Search.
 * GET /api/v1/search?q=...&limit=10
 * Auth: Authorization: Bearer ayb_live_... or ?key=
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const endpoint = "search";
  const started = Date.now();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
  const presented = bearer || url.searchParams.get("key");
  const check = validateApiKey(presented, "search", req, endpoint);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const q = (url.searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });
  }
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 10));

  try {
    // Local index only — deterministic latency for API consumers, real crawled data.
    const serp = await liveSearch(q, {
      skipUpstream: true,
      zeroAi: true,
      zeroAds: true,
      privateMode: true,
      sliders: { audience: 35, authority: 55, locality: 40 },
      timings: {},
    });
    logApiCall(check.keyId, check.projectId, endpoint, started, ip);
    return NextResponse.json({
      query: q,
      total: serp.results.length,
      results: serp.results.slice(0, limit).map((r) => ({
        title: r.title,
        url: r.url,
        domain: r.domain,
        description: r.snippet,
      })),
      knowledge: serp.knowledge || null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Recherche indisponible", message: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
