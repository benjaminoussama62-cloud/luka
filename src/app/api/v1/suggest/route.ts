import { NextResponse } from "next/server";
import { logApiCall, validateApiKey } from "@/lib/developers/console";
import { suggestQueries } from "@/lib/ayeba-index";

export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * Public developer API — Ayeba Suggest.
 * GET /api/v1/suggest?q=...&limit=8
 * Auth: Authorization: Bearer ayb_live_... or ?key=
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const endpoint = "suggest";
  const started = Date.now();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
  const presented = bearer || url.searchParams.get("key");
  const check = validateApiKey(presented, "suggest", req, endpoint);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const q = (url.searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });
  }
  const limit = Math.min(10, Math.max(1, Number(url.searchParams.get("limit")) || 8));

  try {
    const suggestions = suggestQueries(q).slice(0, limit);
    logApiCall(check.keyId, check.projectId, endpoint, started, ip);
    return NextResponse.json({ query: q, suggestions });
  } catch {
    return NextResponse.json({ error: "Suggestions indisponibles" }, { status: 500 });
  }
}
