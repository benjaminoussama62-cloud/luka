import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { drainTxQueue } from "@/lib/mail/transactional";

export const runtime = "nodejs";

/**
 * GET /api/cron/tx-drain — reprend les envois transactionnels en attente
 * (backoff 30 s → 5 min → 30 min). Appelé par Vercel Cron toutes les heures
 * et opportunistement à chaque envoi.
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const drained = await drainTxQueue(100);
  return NextResponse.json({ ok: true, drained, at: new Date().toISOString() });
}
