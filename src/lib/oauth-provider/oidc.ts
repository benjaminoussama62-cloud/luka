import { createHash } from "crypto";
import { SignJWT } from "jose";
import { siteBaseUrl } from "@/lib/site-url";
import { getOAuthSigningKey } from "./jwks";
import type { UserInfoClaims } from "./types";

export function issuerUrl() {
  return siteBaseUrl();
}

export async function createIdToken(input: {
  userId: string;
  email: string;
  name: string;
  clientId: string;
  accessToken?: string;
  nonce?: string;
}) {
  const { privateKey, kid } = await getOAuthSigningKey();
  const iss = issuerUrl();
  const payload: Record<string, unknown> = {
    sub: input.userId,
    email: input.email,
    email_verified: true,
    name: input.name,
  };

  if (input.accessToken) {
    const atHash = createHash("sha256")
      .update(input.accessToken)
      .digest()
      .subarray(0, 16)
      .toString("base64url");
    payload.at_hash = atHash;
  }

  if (input.nonce) payload.nonce = input.nonce;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid })
    .setIssuer(iss)
    .setAudience(input.clientId)
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
}

export function openIdConfiguration() {
  const base = issuerUrl();
  return {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    userinfo_endpoint: `${base}/oauth/userinfo`,
    revocation_endpoint: `${base}/oauth/revoke`,
    introspection_endpoint: `${base}/oauth/introspect`,
    jwks_uri: `${base}/.well-known/jwks.json`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "email", "profile"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    claims_supported: [
      "sub",
      "email",
      "email_verified",
      "name",
      "picture",
      "iss",
      "aud",
      "iat",
      "exp",
      "at_hash",
      "nonce",
    ],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256", "plain"],
    service_documentation: `${base}/developers/docs`,
    op_policy_uri: `${base}/developers/policy`,
  };
}

export async function buildUserInfoClaims(input: {
  userId: string;
  email: string;
  name: string;
  clientId: string;
}): Promise<UserInfoClaims> {
  return {
    sub: input.userId,
    name: input.name,
    email: input.email,
    email_verified: true,
    iss: issuerUrl(),
    aud: input.clientId,
  };
}
