import { getDb } from "@/lib/storage/database";
import type { OAuthClient, OAuthClientType, OAuthClientWithSecret } from "./types";
import { generateClientId, generateClientSecret, hashClientSecret, verifyClientSecret } from "./crypto";

type ClientRow = {
  client_id: string;
  client_secret_hash: string;
  name: string;
  description: string;
  logo_url: string;
  owner_user_id: string;
  client_type: string;
  created_at: string;
  updated_at: string;
};

function loadRedirectUris(clientId: string): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT uri FROM oauth_redirect_uris WHERE client_id = ? ORDER BY id")
    .all(clientId) as { uri: string }[];
  return rows.map((r) => r.uri);
}

function rowToClient(row: ClientRow): OAuthClient {
  return {
    clientId: row.client_id,
    name: row.name,
    description: row.description,
    logoUrl: row.logo_url,
    ownerUserId: row.owner_user_id,
    clientType: row.client_type as OAuthClientType,
    redirectUris: loadRedirectUris(row.client_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getOAuthClient(clientId: string): OAuthClient | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM oauth_clients WHERE client_id = ?").get(clientId) as
    | ClientRow
    | undefined;
  if (!row) return null;
  return rowToClient(row);
}

export function verifyOAuthClientSecret(clientId: string, secret: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT client_secret_hash FROM oauth_clients WHERE client_id = ?")
    .get(clientId) as { client_secret_hash: string } | undefined;
  if (!row) return false;
  return verifyClientSecret(secret, row.client_secret_hash);
}

export function isRedirectUriAllowed(clientId: string, redirectUri: string): boolean {
  const uris = loadRedirectUris(clientId);
  return uris.includes(redirectUri);
}

export function listOAuthClientsByOwner(ownerUserId: string): OAuthClient[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM oauth_clients WHERE owner_user_id = ? ORDER BY created_at DESC")
    .all(ownerUserId) as ClientRow[];
  return rows.map(rowToClient);
}

export function createOAuthClient(input: {
  name: string;
  description?: string;
  ownerUserId: string;
  redirectUris: string[];
  clientType?: OAuthClientType;
}): OAuthClientWithSecret {
  const db = getDb();
  const clientId = generateClientId();
  const clientSecret = generateClientSecret();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO oauth_clients
     (client_id, client_secret_hash, name, description, owner_user_id, client_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    clientId,
    hashClientSecret(clientSecret),
    input.name.trim(),
    input.description?.trim() || "",
    input.ownerUserId,
    input.clientType || "confidential",
    now,
    now,
  );

  const ins = db.prepare(
    "INSERT INTO oauth_redirect_uris (client_id, uri, created_at) VALUES (?, ?, ?)",
  );
  for (const uri of input.redirectUris) {
    ins.run(clientId, uri.trim(), now);
  }

  const client = getOAuthClient(clientId)!;
  return { ...client, clientSecret };
}

export function updateOAuthClient(
  clientId: string,
  ownerUserId: string,
  patch: { name?: string; description?: string; redirectUris?: string[] },
): OAuthClient | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM oauth_clients WHERE client_id = ?").get(clientId) as
    | ClientRow
    | undefined;
  if (!row || (row.owner_user_id !== ownerUserId && row.owner_user_id !== "system")) return null;

  const now = new Date().toISOString();
  if (patch.name || patch.description !== undefined) {
    db.prepare(
      "UPDATE oauth_clients SET name = ?, description = ?, updated_at = ? WHERE client_id = ?",
    ).run(patch.name ?? row.name, patch.description ?? row.description, now, clientId);
  }

  if (patch.redirectUris) {
    db.prepare("DELETE FROM oauth_redirect_uris WHERE client_id = ?").run(clientId);
    const ins = db.prepare(
      "INSERT INTO oauth_redirect_uris (client_id, uri, created_at) VALUES (?, ?, ?)",
    );
    for (const uri of patch.redirectUris) {
      ins.run(clientId, uri.trim(), now);
    }
    db.prepare("UPDATE oauth_clients SET updated_at = ? WHERE client_id = ?").run(now, clientId);
  }

  return getOAuthClient(clientId);
}

export function rotateClientSecret(clientId: string, ownerUserId: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT owner_user_id FROM oauth_clients WHERE client_id = ?").get(clientId) as
    | { owner_user_id: string }
    | undefined;
  if (!row || row.owner_user_id !== ownerUserId) return null;
  const secret = generateClientSecret();
  db.prepare("UPDATE oauth_clients SET client_secret_hash = ?, updated_at = ? WHERE client_id = ?").run(
    hashClientSecret(secret),
    new Date().toISOString(),
    clientId,
  );
  return secret;
}

export function deleteOAuthClient(clientId: string, ownerUserId: string): boolean {
  const db = getDb();
  const row = db.prepare("SELECT owner_user_id FROM oauth_clients WHERE client_id = ?").get(clientId) as
    | { owner_user_id: string }
    | undefined;
  if (!row || row.owner_user_id !== ownerUserId) return false;
  db.prepare("DELETE FROM oauth_redirect_uris WHERE client_id = ?").run(clientId);
  db.prepare("DELETE FROM oauth_clients WHERE client_id = ?").run(clientId);
  return true;
}
