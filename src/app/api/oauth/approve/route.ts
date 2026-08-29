import { NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionFromCookies,
  loginUser,
  registerUser,
  setSessionCookie,
} from "@/lib/auth-server";
import { createAuthorizationCode, hasUserConsent, recordUserConsent } from "@/lib/oauth-provider/codes";
import { getOAuthClient } from "@/lib/oauth-provider/clients";
import { parseScopeString } from "@/lib/oauth-provider/scopes";
import {
  buildRedirectWithCode,
  buildRedirectWithError,
  parseAuthorizeParams,
} from "@/lib/oauth-provider/validate";

export const runtime = "nodejs";

/** POST /api/oauth/approve — consent or login+consent */
export async function POST(req: Request) {
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
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    const token = await createSessionToken(result.user!);
    await setSessionCookie(token);
    session = result.user!;
  }

  if (!session) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const client = getOAuthClient(parsed.clientId)!;
  const scopes = parseScopeString(parsed.scope);

  if (body.action === "login") {
    return NextResponse.json({
      user: { name: session.name, email: session.email },
    });
  }

  if (body.action === "approve") {
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
    user: { name: session.name, email: session.email },
  });
}
