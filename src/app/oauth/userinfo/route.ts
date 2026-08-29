import { NextResponse } from "next/server";
import { findUserById } from "@/lib/db";
import { buildUserInfoClaims } from "@/lib/oauth-provider/oidc";
import { resolveAccessToken } from "@/lib/oauth-provider/tokens";

export const runtime = "nodejs";

/** GET /oauth/userinfo — Bearer access_token */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const token = auth.slice(7).trim();
  const session = resolveAccessToken(token);
  if (!session) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const scopes = new Set(session.scope.split(/\s+/));
  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const claims = await buildUserInfoClaims({
    userId: user.id,
    email: user.email,
    name: user.name,
    clientId: session.clientId,
  });

  const out: Record<string, unknown> = { sub: claims.sub };
  if (scopes.has("email")) {
    out.email = claims.email;
    out.email_verified = claims.email_verified;
  }
  if (scopes.has("profile")) {
    out.name = claims.name;
    out.picture = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=${user.avatarColor.replace("#", "")}&color=fff`;
  }

  return NextResponse.json(out, {
    headers: { "Cache-Control": "no-store" },
  });
}
