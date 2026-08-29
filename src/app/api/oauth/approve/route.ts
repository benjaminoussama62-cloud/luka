import { NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionFromCookies,
  loginUser,
  registerUser,
  setSessionCookie,
} from "@/lib/auth-server";
import { logOAuthAudit } from "@/lib/oauth-provider/audit";
import { createAuthorizationCode, hasUserConsent, recordUserConsent } from "@/lib/oauth-provider/codes";
import { getOAuthClient } from "@/lib/oauth-provider/clients";
import { parseScopeString } from "@/lib/oauth-provider/scopes";
import {
  buildRedirectWithCode,
  buildRedirectWithError,
  parseAuthorizeParams,
} from "@/lib/oauth-provider/validate";
import { oauthRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { userRequiresTotp, verifyUserTotp } from "@/lib/security/user-security";

export const runtime = "nodejs";

/** POST /api/oauth/approve — consent or login+consent */
export async function POST(req: Request) {
  if (!oauthRateLimit(req, "oauth-approve", 40)) return rateLimitResponse();

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const body = (await req.json()) as {
    action?: "approve" | "deny" | "login";
    client_id?: string;
    redirect_uri?: string;
    scope?: string;
    state?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    email?: string;
    password?: string;
    name?: string;
    mode?: "login" | "register";
    totp_code?: string;
  };

  const qs = new URLSearchParams();
  if (body.client_id) qs.set("client_id", body.client_id);
  if (body.redirect_uri) qs.set("redirect_uri", body.redirect_uri);
  qs.set("response_type", "code");
  if (body.scope) qs.set("scope", body.scope);
  if (body.state) qs.set("state", body.state);
  if (body.code_challenge) qs.set("code_challenge", body.code_challenge);
  if (body.code_challenge_method) qs.set("code_challenge_method", body.code_challenge_method);

  const parsed = parseAuthorizeParams(qs);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (body.action === "deny") {
    logOAuthAudit({ event: "authorize_denied", clientId: parsed.clientId, ip });
    return NextResponse.json({
      redirect: buildRedirectWithError(parsed.redirectUri, "access_denied", parsed.state),
    });
  }

  let session = await getSessionFromCookies();

  if (body.action === "login" && body.email && body.password) {
    const result =
      body.mode === "register"
        ? await registerUser(body.email, body.password, body.name)
        : await loginUser(body.email, body.password);

    if ("error" in result && result.error) {
      logOAuthAudit({ event: "login_failed", clientId: parsed.clientId, ip, detail: body.email });
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    const token = await createSessionToken(result.user!);
    await setSessionCookie(token);
    session = result.user!;
    logOAuthAudit({ event: "login_success", clientId: parsed.clientId, userId: session.id, ip });
  }

  if (!session) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const client = getOAuthClient(parsed.clientId)!;
  const scopes = parseScopeString(parsed.scope);

  if (body.action === "login") {
    return NextResponse.json({
      user: { name: session.name, email: session.email },
      requiresTotp: userRequiresTotp(session.id),
    });
  }

  if (body.action === "approve") {
    if (userRequiresTotp(session.id)) {
      if (!body.totp_code) {
        return NextResponse.json({ error: "Code 2FA requis", requiresTotp: true }, { status: 403 });
      }
      if (!verifyUserTotp(session.id, body.totp_code)) {
        return NextResponse.json({ error: "Code 2FA invalide", requiresTotp: true }, { status: 403 });
      }
    }

    recordUserConsent(session.id, parsed.clientId, parsed.scope);

    const code = createAuthorizationCode({
      clientId: parsed.clientId,
      userId: session.id,
      redirectUri: parsed.redirectUri,
      scopes,
      state: parsed.state,
      codeChallenge: parsed.codeChallenge,
      codeChallengeMethod: parsed.codeChallengeMethod,
    });

    logOAuthAudit({
      event: "authorize_granted",
      clientId: parsed.clientId,
      userId: session.id,
      ip,
      detail: parsed.scope,
    });

    return NextResponse.json({
      redirect: buildRedirectWithCode(parsed.redirectUri, code, parsed.state),
      clientName: client.name,
    });
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}

/** GET — check if user already consented (optional prefetch) */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = parseAuthorizeParams(url.searchParams);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ loggedIn: false });

  return NextResponse.json({
    loggedIn: true,
    hasConsent: hasUserConsent(session.id, parsed.clientId, parsed.scope),
    requiresTotp: userRequiresTotp(session.id),
    user: { name: session.name, email: session.email },
  });
}
