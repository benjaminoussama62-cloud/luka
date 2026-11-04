import { adb } from "@/lib/storage/adb";
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
  const db = adb();
  const accessToken = generateOpaqueToken();
  const refreshToken = generateOpaqueToken();
  const accessHash = hashToken(accessToken);
  const refreshHash = hashToken(refreshToken);
  const now = new Date();
  const accessExp = new Date(now.getTime() + ACCESS_TTL_SEC * 1000).toISOString();
  const refreshExp = new Date(now.getTime() + REFRESH_TTL_SEC * 1000).toISOString();

  await db.transaction(async (tx) => {
    await tx.run(
      `INSERT INTO oauth_access_tokens (token_hash, client_id, user_id, scope, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [accessHash, input.clientId, input.userId, input.scope, accessExp, now.toISOString()],
    );

    await tx.run(
      `INSERT INTO oauth_refresh_tokens (token_hash, access_token_hash, client_id, user_id, scope, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        refreshHash,
        accessHash,
        input.clientId,
        input.userId,
        input.scope,
        refreshExp,
        now.toISOString(),
      ],
    );
  });

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

export async function resolveAccessToken(token: string): Promise<{
  userId: string;
  clientId: string;
  scope: string;
} | null> {
  const db = adb();
  const hash = hashToken(token);
  const row = (await db.get(
    "SELECT user_id, client_id, scope, expires_at, revoked_at FROM oauth_access_tokens WHERE token_hash = ?",
    [hash],
  )) as
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
  const db = adb();
  const hash = hashToken(input.refreshToken);
  const row = (await db.get(
    "SELECT access_token_hash, user_id, scope, expires_at, revoked_at FROM oauth_refresh_tokens WHERE token_hash = ? AND client_id = ?",
    [hash, input.clientId],
  )) as
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

  // Rotation atomique : l'ancien couple access/refresh est révoqué dans la
  // même transaction — un refresh rejoué après rotation ne peut rien émettre.
  await db.transaction(async (tx) => {
    await tx.run("UPDATE oauth_access_tokens SET revoked_at = ? WHERE token_hash = ?", [
      new Date().toISOString(),
      row.access_token_hash,
    ]);
    await tx.run("UPDATE oauth_refresh_tokens SET revoked_at = ? WHERE token_hash = ?", [
      new Date().toISOString(),
      hash,
    ]);
  });

  return issueTokens({
    clientId: input.clientId,
    userId: row.user_id,
    scope: row.scope,
  });
}

export async function revokeToken(token: string) {
  const db = adb();
  const hash = hashToken(token);
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx.run("UPDATE oauth_access_tokens SET revoked_at = ? WHERE token_hash = ?", [
      now,
      hash,
    ]);
    await tx.run("UPDATE oauth_refresh_tokens SET revoked_at = ? WHERE token_hash = ?", [
      now,
      hash,
    ]);
  });
}
