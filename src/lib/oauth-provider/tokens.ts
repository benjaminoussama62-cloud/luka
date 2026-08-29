import { getDb } from "@/lib/storage/database";
import { findUserById } from "@/lib/db";
import { generateOpaqueToken, hashToken } from "./crypto";
import { createIdToken } from "./oidc";
import type { TokenResponse } from "./types";

const ACCESS_TTL_SEC = 3600;
const REFRESH_TTL_SEC = 30 * 24 * 3600;

export async function issueTokens(input: {
  clientId: string;
  userId: string;
  scope: string;
  includeIdToken?: boolean;
}): Promise<TokenResponse> {
  const db = getDb();
  const accessToken = generateOpaqueToken();
  const refreshToken = generateOpaqueToken();
  const accessHash = hashToken(accessToken);
  const refreshHash = hashToken(refreshToken);
  const now = new Date();
  const accessExp = new Date(now.getTime() + ACCESS_TTL_SEC * 1000).toISOString();
  const refreshExp = new Date(now.getTime() + REFRESH_TTL_SEC * 1000).toISOString();

  db.prepare(
    `INSERT INTO oauth_access_tokens (token_hash, client_id, user_id, scope, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(accessHash, input.clientId, input.userId, input.scope, accessExp, now.toISOString());

  db.prepare(
    `INSERT INTO oauth_refresh_tokens (token_hash, access_token_hash, client_id, user_id, scope, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    refreshHash,
    accessHash,
    input.clientId,
    input.userId,
    input.scope,
    refreshExp,
    now.toISOString(),
  );

  const response: TokenResponse = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TTL_SEC,
    refresh_token: refreshToken,
    scope: input.scope,
  };

  const scopes = input.scope.split(/\s+/);
  if (input.includeIdToken !== false && scopes.includes("openid")) {
    const user = await findUserById(input.userId);
    if (user) {
      response.id_token = await createIdToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        clientId: input.clientId,
        accessToken,
      });
    }
  }

  return response;
}

export function resolveAccessToken(token: string): {
  userId: string;
  clientId: string;
  scope: string;
} | null {
  const db = getDb();
  const hash = hashToken(token);
  const row = db
    .prepare(
      "SELECT user_id, client_id, scope, expires_at, revoked_at FROM oauth_access_tokens WHERE token_hash = ?",
    )
    .get(hash) as
    | {
        user_id: string;
        client_id: string;
        scope: string;
        expires_at: string;
        revoked_at: string | null;
      }
    | undefined;

  if (!row || row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  return { userId: row.user_id, clientId: row.client_id, scope: row.scope };
}

export async function refreshAccessToken(input: {
  refreshToken: string;
  clientId: string;
}): Promise<TokenResponse | null> {
  const db = getDb();
  const hash = hashToken(input.refreshToken);
  const row = db
    .prepare(
      "SELECT access_token_hash, user_id, scope, expires_at, revoked_at FROM oauth_refresh_tokens WHERE token_hash = ? AND client_id = ?",
    )
    .get(hash, input.clientId) as
    | {
        access_token_hash: string;
        user_id: string;
        scope: string;
        expires_at: string;
        revoked_at: string | null;
      }
    | undefined;

  if (!row || row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  db.prepare("UPDATE oauth_access_tokens SET revoked_at = ? WHERE token_hash = ?").run(
    new Date().toISOString(),
    row.access_token_hash,
  );
  db.prepare("UPDATE oauth_refresh_tokens SET revoked_at = ? WHERE token_hash = ?").run(
    new Date().toISOString(),
    hash,
  );

  return issueTokens({
    clientId: input.clientId,
    userId: row.user_id,
    scope: row.scope,
  });
}

export function revokeToken(token: string) {
  const db = getDb();
  const hash = hashToken(token);
  const now = new Date().toISOString();
  db.prepare("UPDATE oauth_access_tokens SET revoked_at = ? WHERE token_hash = ?").run(now, hash);
  db.prepare("UPDATE oauth_refresh_tokens SET revoked_at = ? WHERE token_hash = ?").run(now, hash);
}
