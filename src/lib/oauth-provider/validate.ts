import type { AuthorizeRequest } from "./types";
import { getOAuthClient, isClientAllowedForAuthorize, isRedirectUriAllowed } from "./clients";
import { parseScopeString } from "./scopes";

export function parseAuthorizeParams(searchParams: URLSearchParams): AuthorizeRequest | { error: string } {
  const clientId = searchParams.get("client_id")?.trim();
  const redirectUri = searchParams.get("redirect_uri")?.trim();
  const responseType = searchParams.get("response_type")?.trim();
  const scopeRaw = searchParams.get("scope")?.trim() || "openid email profile";
  const state = searchParams.get("state")?.trim() || "";
  const codeChallenge = searchParams.get("code_challenge")?.trim() || undefined;
  const codeChallengeMethod = (searchParams.get("code_challenge_method")?.trim() || "S256") as
    | "S256"
    | "plain";

  if (!clientId) return { error: "client_id requis" };
  if (!redirectUri) return { error: "redirect_uri requis" };
  if (responseType !== "code") return { error: "response_type=code requis" };

  const client = getOAuthClient(clientId);
  if (!client) return { error: "client_id inconnu" };
  if (!isClientAllowedForAuthorize(client)) {
    return { error: "Application en attente de vérification Ayeba. Contactez developers@ayeba.app" };
  }
  if (!isRedirectUriAllowed(clientId, redirectUri)) {
    return { error: "redirect_uri non autorisé pour cette application" };
  }

  parseScopeString(scopeRaw);

  return {
    clientId,
    redirectUri,
    responseType: "code",
    scope: scopeRaw,
    state,
    codeChallenge,
    codeChallengeMethod: codeChallenge ? codeChallengeMethod : undefined,
  };
}

export function buildRedirectWithError(redirectUri: string, error: string, state?: string) {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  if (state) url.searchParams.set("state", state);
  return url.toString();
}

export function buildRedirectWithCode(redirectUri: string, code: string, state?: string) {
  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  return url.toString();
}
