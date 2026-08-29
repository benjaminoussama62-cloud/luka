import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OAuthAuthorizeClient } from "@/components/oauth/OAuthAuthorizeClient";
import { getSessionFromCookies } from "@/lib/auth-server";
import {
  createAuthorizationCode,
  hasUserConsent,
  recordUserConsent,
} from "@/lib/oauth-provider/codes";
import { getOAuthClient } from "@/lib/oauth-provider/clients";
import { parseScopeString } from "@/lib/oauth-provider/scopes";
import {
  buildRedirectWithCode,
  buildRedirectWithError,
  parseAuthorizeParams,
} from "@/lib/oauth-provider/validate";

export const metadata: Metadata = {
  title: "Autoriser l’accès — Compte Ayeba",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OAuthAuthorizePage({ searchParams }: Props) {
  const raw = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") qs.set(k, v);
    else if (Array.isArray(v) && v[0]) qs.set(k, v[0]);
  }

  const parsed = parseAuthorizeParams(qs);
  if ("error" in parsed) {
    return (
      <div className="oauth-consent-shell">
        <div className="oauth-consent-card ayeba-panel">
          <h1 className="oauth-consent-title">Requête OAuth invalide</h1>
          <p className="oauth-consent-error">{parsed.error}</p>
        </div>
      </div>
    );
  }

  const client = getOAuthClient(parsed.clientId);
  if (!client) {
    redirect(buildRedirectWithError(parsed.redirectUri, "invalid_client", parsed.state));
  }

  const session = await getSessionFromCookies();
  if (session && hasUserConsent(session.id, parsed.clientId, parsed.scope)) {
    const scopes = parseScopeString(parsed.scope);
    const code = createAuthorizationCode({
      clientId: parsed.clientId,
      userId: session.id,
      redirectUri: parsed.redirectUri,
      scopes,
      state: parsed.state,
      codeChallenge: parsed.codeChallenge,
      codeChallengeMethod: parsed.codeChallengeMethod,
    });
    recordUserConsent(session.id, parsed.clientId, parsed.scope);
    redirect(buildRedirectWithCode(parsed.redirectUri, code, parsed.state));
  }

  return (
    <OAuthAuthorizeClient
        client={client}
        params={{
          clientId: parsed.clientId,
          redirectUri: parsed.redirectUri,
          scope: parsed.scope,
          state: parsed.state,
          codeChallenge: parsed.codeChallenge,
          codeChallengeMethod: parsed.codeChallengeMethod,
        }}
        user={session ? { name: session.name, email: session.email } : null}
    />
  );
}
