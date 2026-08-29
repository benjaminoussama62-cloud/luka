import { NextResponse } from "next/server";
import { resolveAccessToken } from "@/lib/oauth-provider/tokens";
import { oauthJsonError, parseBasicAuth, readOAuthFormBody, OAUTH_NO_STORE } from "@/lib/oauth-provider/http";
import { verifyOAuthClientSecret } from "@/lib/oauth-provider/clients";

export const runtime = "nodejs";

/** POST /oauth/introspect — RFC 7662 */
export async function POST(req: Request) {
  const body = await readOAuthFormBody(req);
  const basic = parseBasicAuth(req);
  const clientId = basic?.clientId || body.client_id?.trim();
  const clientSecret = basic?.clientSecret || body.client_secret?.trim();
  const token = body.token?.trim();

  if (!clientId || !clientSecret || !verifyOAuthClientSecret(clientId, clientSecret)) {
    return oauthJsonError("invalid_client", undefined, 401);
  }
  if (!token) return oauthJsonError("invalid_request", "token requis");

  const session = resolveAccessToken(token);
  if (!session) {
    return NextResponse.json({ active: false }, { headers: OAUTH_NO_STORE });
  }

  return NextResponse.json(
    {
      active: true,
      sub: session.userId,
      client_id: session.clientId,
      scope: session.scope,
      token_type: "Bearer",
    },
    { headers: OAUTH_NO_STORE },
  );
}
