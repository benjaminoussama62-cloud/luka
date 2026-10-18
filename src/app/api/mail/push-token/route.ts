import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { getAccountByUser, registerPushToken, unregisterPushToken } from "@/lib/mail/mail";

export const runtime = "nodejs";

/** Enregistre le token FCM de l'appareil (app mobile Ayeba Mail). */
export async function POST(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const account = getAccountByUser(user.id);
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { token?: string; platform?: string } | null;
  if (!body?.token || typeof body.token !== "string" || body.token.length < 20 || body.token.length > 4096) {
    return NextResponse.json({ error: "token invalide" }, { status: 400 });
  }
  registerPushToken(account.id, body.token, body.platform === "ios" ? "ios" : "android");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const account = getAccountByUser(user.id);
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  if (body?.token) unregisterPushToken(body.token);
  return NextResponse.json({ ok: true });
}
