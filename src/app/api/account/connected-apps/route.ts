import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { listUserConnectedApps, revokeUserAppAccess } from "@/lib/oauth-provider/consents";
import { clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  return NextResponse.json({ apps: listUserConnectedApps(user.id) });
}

export async function DELETE(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });

  const body = (await req.json()) as { client_id?: string };
  if (!body.client_id) return NextResponse.json({ error: "client_id requis" }, { status: 400 });

  revokeUserAppAccess(user.id, body.client_id, clientIp(req));
  return NextResponse.json({ ok: true });
}
