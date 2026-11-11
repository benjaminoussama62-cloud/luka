import { NextResponse } from "next/server";
import { requireMoneyUser } from "@/lib/money/http";
import { registerPushToken } from "@/lib/money/push";

export const runtime = "nodejs";

/** POST /api/money/push-token — {token} enregistre le token FCM de l'appareil. */
export async function POST(req: Request) {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;
  let body: { token?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  await registerPushToken(user.id, String(body.token || ""));
  return NextResponse.json({ ok: true });
}
