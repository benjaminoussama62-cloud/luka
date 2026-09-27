import { NextResponse } from "next/server";
import { logApiCall, validateApiKey } from "@/lib/developers/console";
import { advancedSearch } from "@/lib/ayebi/db-sqlite";

export const runtime = "nodejs";

/**
 * Public developer API — Ayebi (encyclopédie congolaise).
 * GET /api/v1/ayebi?q=...&limit=10&category=
 * Auth: Authorization: Bearer ayb_live_... or ?key=
 * Distinct de Wikipédia — corpus Ayebi uniquement.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const endpoint = "ayebi";
  const started = Date.now();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
  const presented = bearer || url.searchParams.get("key");
  const check = validateApiKey(presented, "ayebi", req, endpoint);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const q = (url.searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });
  }
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 10));
  const category = url.searchParams.get("category") || undefined;

  try {
    const results = advancedSearch(q, {
      category,
      sortBy: "relevance",
      limit,
    });
    logApiCall(check.keyId, check.projectId, endpoint, started, ip);
    return NextResponse.json({
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
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Ayebi indisponible", message: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
