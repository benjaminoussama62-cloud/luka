import { NextResponse } from "next/server";
import { readSessionToken } from "@/lib/auth-server";
import { jfcCorsHeaders, jfcPreflight } from "@/lib/jfc-cors";
import { jfcApplyRankedResult, jfcGetRanked } from "@/lib/jfc-store";

async function userFromReq(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  return readSessionToken(token);
}

export async function OPTIONS(req: Request) {
  return jfcPreflight(req);
}

export async function GET(req: Request) {
  const cors = jfcCorsHeaders(req);
  const user = await userFromReq(req);
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401, headers: cors });
  const r = jfcGetRanked(user.id);
  return NextResponse.json(
    { mmr: r.mmr, wins: r.wins, losses: r.losses, streak: r.streak, division: r.division, updated_at: r.updated_at },
    { headers: cors },
  );
}

export async function POST(req: Request) {
  const cors = jfcCorsHeaders(req);
  const user = await userFromReq(req);
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401, headers: cors });
  const body = (await req.json()) as { won?: boolean; foeMmr?: number; matchId?: string };
  if (typeof body.won !== "boolean" || typeof body.foeMmr !== "number" || !body.matchId?.trim()) {
    return NextResponse.json({ error: "Payload ranked invalide." }, { status: 400, headers: cors });
  }
  const out = jfcApplyRankedResult(user.id, body.won, Math.round(body.foeMmr), body.matchId.trim());
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: 409, headers: cors });
  return NextResponse.json(out, { headers: cors });
}
