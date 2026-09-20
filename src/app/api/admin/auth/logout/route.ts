import { NextResponse } from "next/server";
import { clearAdminCookie, getAdminSession, revokeAdminSession } from "@/lib/admin/session";

export const runtime = "nodejs";

export async function POST() {
  const session = await getAdminSession();
  if (session) await revokeAdminSession(session.sessionId);
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}
