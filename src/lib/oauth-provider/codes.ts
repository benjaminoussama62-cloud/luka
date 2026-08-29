import { getDb } from "@/lib/storage/database";
import { generateAuthCode, verifyPkce } from "./crypto";
import type { OAuthScopeId } from "./scopes";
import { scopeToString } from "./scopes";

const CODE_TTL_MS = 10 * 60 * 1000;

export function createAuthorizationCode(input: {
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: OAuthScopeId[];
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}) {
  const db = getDb();
  const code = generateAuthCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS).toISOString();

  db.prepare(
    `INSERT INTO oauth_authorization_codes
     (code, client_id, user_id, redirect_uri, scope, state, code_challenge, code_challenge_method, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    code,
    input.clientId,
    input.userId,
    input.redirectUri,
    scopeToString(input.scopes),
    input.state || "",
    input.codeChallenge || null,
    input.codeChallengeMethod || null,
    expiresAt,
    now.toISOString(),
  );

  return code;
}

type CodeRow = {
  code: string;
  client_id: string;
  user_id: string;
  redirect_uri: string;
  scope: string;
  state: string;
  code_challenge: string | null;
  code_challenge_method: string | null;
  expires_at: string;
  used_at: string | null;
};

export function consumeAuthorizationCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier?: string;
}): { userId: string; scope: string } | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM oauth_authorization_codes WHERE code = ?")
    .get(input.code) as CodeRow | undefined;

  if (!row) return null;
  if (row.used_at) return null;
  if (row.client_id !== input.clientId) return null;
  if (row.redirect_uri !== input.redirectUri) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  if (row.code_challenge) {
    if (!input.codeVerifier) return null;
    const method = row.code_challenge_method || "S256";
    if (!verifyPkce(input.codeVerifier, row.code_challenge, method)) return null;
  }

  db.prepare("UPDATE oauth_authorization_codes SET used_at = ? WHERE code = ?").run(
    new Date().toISOString(),
    input.code,
  );

  return { userId: row.user_id, scope: row.scope };
}

export function recordUserConsent(userId: string, clientId: string, scope: string) {
  const db = getDb();
  db.prepare(
    `INSERT INTO oauth_user_consents (user_id, client_id, scope, granted_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, client_id) DO UPDATE SET scope = excluded.scope, granted_at = excluded.granted_at`,
  ).run(userId, clientId, scope, new Date().toISOString());
}

export function hasUserConsent(userId: string, clientId: string, requestedScope: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT scope FROM oauth_user_consents WHERE user_id = ? AND client_id = ?")
    .get(userId, clientId) as { scope: string } | undefined;
  if (!row) return false;
  const granted = new Set(row.scope.split(/\s+/));
  const needed = requestedScope.split(/\s+/).filter(Boolean);
  return needed.every((s) => granted.has(s));
}
