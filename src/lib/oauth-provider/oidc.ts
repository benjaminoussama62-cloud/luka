import { createHash } from "crypto";
import { SignJWT } from "jose";
import { siteBaseUrl } from "@/lib/site-url";
import type { UserInfoClaims } from "./types";

function secretKey() {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === "development" ? "ayeba-dev-secret-min-32-chars!!" : undefined);
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET manquant");
  }
  return new TextEncoder().encode(secret);
}

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
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(iss)
    .setAudience(input.clientId)
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secretKey());
}

export function openIdConfiguration() {
  const base = issuerUrl();
  return {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    userinfo_endpoint: `${base}/oauth/userinfo`,
    revocation_endpoint: `${base}/oauth/revoke`,
    jwks_uri: `${base}/.well-known/jwks.json`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["HS256"],
    scopes_supported: ["openid", "email", "profile"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    claims_supported: ["sub", "email", "email_verified", "name", "iss", "aud", "iat", "exp"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256", "plain"],
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
