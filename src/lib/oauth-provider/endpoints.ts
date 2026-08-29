import { siteBaseUrl } from "@/lib/site-url";

export function oauthIssuer() {
  return siteBaseUrl();
}

export const OAUTH_PATHS = {
  authorize: "/oauth/authorize",
  token: "/oauth/token",
  userinfo: "/oauth/userinfo",
  revoke: "/oauth/revoke",
  discovery: "/.well-known/openid-configuration",
  jwks: "/.well-known/jwks.json",
} as const;

export function oauthEndpoint(path: keyof typeof OAUTH_PATHS) {
  return `${oauthIssuer()}${OAUTH_PATHS[path]}`;
}

export function buildAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  scope?: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}) {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: input.scope || "openid email profile",
  });
  if (input.state) params.set("state", input.state);
  if (input.codeChallenge) {
    params.set("code_challenge", input.codeChallenge);
    params.set("code_challenge_method", input.codeChallengeMethod || "S256");
  }
  return `${oauthEndpoint("authorize")}?${params.toString()}`;
}
