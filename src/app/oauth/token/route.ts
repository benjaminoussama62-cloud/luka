import { NextResponse } from "next/server";
import { consumeAuthorizationCode } from "@/lib/oauth-provider/codes";
import { verifyOAuthClientSecret } from "@/lib/oauth-provider/clients";
import { logOAuthAudit } from "@/lib/oauth-provider/audit";
import { oauthJsonError, parseBasicAuth, readOAuthFormBody, OAUTH_NO_STORE } from "@/lib/oauth-provider/http";
import { issueTokens, refreshAccessToken } from "@/lib/oauth-provider/tokens";
import { clientIp, oauthRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** POST /oauth/token — authorization_code | refresh_token */
export async function POST(req: Request) {
  if (!oauthRateLimit(req, "oauth-token", 60)) return rateLimitResponse();

  const ip = clientIp(req);
  try {
    const body = await readOAuthFormBody(req);
    const basic = parseBasicAuth(req);
    const clientId = basic?.clientId || body.client_id?.trim();
    const clientSecret = basic?.clientSecret || body.client_secret?.trim();
    const grantType = body.grant_type?.trim();

    if (!clientId || !clientSecret) {
      return oauthJsonError("invalid_client", "client_id et client_secret requis", 401);
    }
    if (!verifyOAuthClientSecret(clientId, clientSecret)) {
      return oauthJsonError("invalid_client", "Identifiants client invalides", 401);
    }

    if (grantType === "authorization_code") {
      const code = body.code?.trim();
      const redirectUri = body.redirect_uri?.trim();
      const codeVerifier = body.code_verifier?.trim();
      if (!code || !redirectUri) {
        return oauthJsonError("invalid_request", "code et redirect_uri requis");
      }

      const consumed = consumeAuthorizationCode({
        code,
        clientId,
        redirectUri,
        codeVerifier,
      });
      if (!consumed) {
        return oauthJsonError("invalid_grant", "Code invalide ou expiré");
      }

      const tokens = await issueTokens({
        clientId,
        userId: consumed.userId,
        scope: consumed.scope,
      });

      logOAuthAudit({
        event: "token_issued",
        clientId,
        userId: consumed.userId,
        ip,
        detail: "authorization_code",
      });

      return NextResponse.json(tokens, { headers: OAUTH_NO_STORE });
    }

    if (grantType === "refresh_token") {
      const refreshToken = body.refresh_token?.trim();
      if (!refreshToken) return oauthJsonError("invalid_request", "refresh_token requis");

      const tokens = await refreshAccessToken({ refreshToken, clientId });
      if (!tokens) return oauthJsonError("invalid_grant", "Refresh token invalide");

      logOAuthAudit({ event: "token_refreshed", clientId, ip });

      return NextResponse.json(tokens, { headers: OAUTH_NO_STORE });
    }

    return oauthJsonError("unsupported_grant_type", "grant_type non supporté");
  } catch (e) {
    console.error("[oauth/token]", e);
    return oauthJsonError("server_error", "Erreur serveur", 500);
  }
}
