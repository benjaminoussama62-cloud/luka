import { createHash, randomBytes } from "crypto";
import { getDb } from "@/lib/storage/database";

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function secret(prefix: string) {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

function ownsClient(clientId: string, userId: string) {
  const row = getDb().prepare("SELECT owner_user_id FROM oauth_clients WHERE client_id = ?").get(clientId) as
    | { owner_user_id: string }
    | undefined;
  return row?.owner_user_id === userId;
}

export function listApiKeys(clientId: string, userId: string) {
  if (!ownsClient(clientId, userId)) return null;
  return getDb().prepare(
    "SELECT id, name, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at FROM developer_api_keys WHERE client_id = ? ORDER BY created_at DESC",
  ).all(clientId);
}

export function createApiKey(input: { clientId: string; userId: string; name: string; scopes?: string; expiresAt?: string }) {
  if (!ownsClient(input.clientId, input.userId)) return null;
  const value = secret("ayeba_key");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  getDb().prepare(
    "INSERT INTO developer_api_keys (id, client_id, name, key_prefix, key_hash, scopes, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(id, input.clientId, input.name.trim(), value.slice(0, 18), digest(value), input.scopes?.trim() || "", input.expiresAt || null, now);
  return { id, name: input.name.trim(), key: value, keyPrefix: value.slice(0, 18), createdAt: now };
}

export function revokeApiKey(id: string, clientId: string, userId: string) {
  if (!ownsClient(clientId, userId)) return false;
  return Boolean(getDb().prepare("UPDATE developer_api_keys SET revoked_at = ? WHERE id = ? AND client_id = ?").run(new Date().toISOString(), id, clientId));
}

export function listServiceAccounts(clientId: string, userId: string) {
  if (!ownsClient(clientId, userId)) return null;
  return getDb().prepare(
    "SELECT id, name, scopes, last_used_at, revoked_at, created_at FROM developer_service_accounts WHERE client_id = ? ORDER BY created_at DESC",
  ).all(clientId);
}

export function createServiceAccount(input: { clientId: string; userId: string; name: string; scopes?: string }) {
  if (!ownsClient(input.clientId, input.userId)) return null;
  const value = secret("ayeba_sa");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  getDb().prepare(
    "INSERT INTO developer_service_accounts (id, client_id, name, token_hash, scopes, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, input.clientId, input.name.trim(), digest(value), input.scopes?.trim() || "", now);
  return { id, name: input.name.trim(), token: value, createdAt: now };
}

export function resolveApiCredential(value: string) {
  const db = getDb();
  const hash = digest(value);
  const apiKey = db.prepare(
    "SELECT client_id, scopes, expires_at FROM developer_api_keys WHERE key_hash = ? AND revoked_at IS NULL",
  ).get(hash) as { client_id: string; scopes: string; expires_at: string | null } | undefined;
  if (apiKey && (!apiKey.expires_at || new Date(apiKey.expires_at).getTime() > Date.now())) {
    db.prepare("UPDATE developer_api_keys SET last_used_at = ? WHERE key_hash = ?").run(new Date().toISOString(), hash);
    return { clientId: apiKey.client_id, scopes: apiKey.scopes };
  }
  const service = db.prepare(
    "SELECT client_id, scopes FROM developer_service_accounts WHERE token_hash = ? AND revoked_at IS NULL",
  ).get(hash) as { client_id: string; scopes: string } | undefined;
  if (!service) return null;
  db.prepare("UPDATE developer_service_accounts SET last_used_at = ? WHERE token_hash = ?").run(new Date().toISOString(), hash);
  return { clientId: service.client_id, scopes: service.scopes };
}
