import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { totpProvisioningUri } from "@/lib/security/totp";
import {
  beginTotpSetup,
  confirmTotpSetup,
  disableTotp,
  getUserSecurity,
} from "@/lib/security/user-security";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  return NextResponse.json(getUserSecurity(user.id));
}

export async function POST(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });

  const body = (await req.json()) as { action?: string; code?: string };
  if (body.action === "begin") {
    const secret = beginTotpSetup(user.id);
    return NextResponse.json({
      secret,
      uri: totpProvisioningUri(secret, user.email),
    });
  }
  if (body.action === "confirm" && body.code) {
    const result = confirmTotpSetup(user.id, body.code);
    if ("error" in result) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  }
  if (body.action === "disable" && body.code) {
    const result = disableTotp(user.id, body.code);
    if ("error" in result) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  }
  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
