import { adb } from "@/lib/storage/adb";
import type { OAuthClient, OAuthClientTier, OAuthClientType, OAuthClientWithSecret } from "./types";
import { generateClientId, generateClientSecret, hashClientSecret, verifyClientSecret } from "./crypto";

type ClientRow = {
  client_id: string;
  client_secret_hash: string;
  name: string;
  description: string;
  logo_url: string;
  website_url: string;
  owner_user_id: string;
  client_type: string;
  tier: string;
  verified: number;
  created_at: string;
  updated_at: string;
};

async function loadRedirectUris(clientId: string): Promise<string[]> {
  const db = adb();
  const rows = (await db.all(
    "SELECT uri FROM oauth_redirect_uris WHERE client_id = ? ORDER BY id",
    [clientId],
  )) as { uri: string }[];
  return rows.map((r) => r.uri);
}

async function rowToClient(row: ClientRow): Promise<OAuthClient> {
  return {
    clientId: row.client_id,
    name: row.name,
    description: row.description,
    logoUrl: row.logo_url || "",
    websiteUrl: row.website_url || "",
    ownerUserId: row.owner_user_id,
    clientType: row.client_type as OAuthClientType,
    tier: (row.tier || "public") as OAuthClientTier,
    verified: row.verified === 1,
    redirectUris: await loadRedirectUris(row.client_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getOAuthClient(clientId: string): Promise<OAuthClient | null> {
  const db = adb();
  const row = (await db.get("SELECT * FROM oauth_clients WHERE client_id = ?", [clientId])) as
    | ClientRow
    | undefined;
  if (!row) return null;
  return rowToClient(row);
}

/** Apps tier public must be verified before authorize (like Google app review). */
export function isClientAllowedForAuthorize(client: OAuthClient): boolean {
  if (client.tier === "sister" || client.tier === "partner") return true;
  return client.verified;
}

export async function verifyOAuthClientSecret(
  clientId: string,
  secret: string,
): Promise<boolean> {
  const db = adb();
  const row = (await db.get("SELECT client_secret_hash FROM oauth_clients WHERE client_id = ?", [
    clientId,
  ])) as { client_secret_hash: string } | undefined;
  if (!row) return false;
  return verifyClientSecret(secret, row.client_secret_hash);
}

export async function isRedirectUriAllowed(
  clientId: string,
  redirectUri: string,
): Promise<boolean> {
  const uris = await loadRedirectUris(clientId);
  return uris.includes(redirectUri);
}

/**
 * Allowed scopes configured on the client in the developer console.
 * Returns null when unrestricted (default).
 */
export async function getClientAllowedScopes(clientId: string): Promise<string[] | null> {
  const row = (await adb().get("SELECT scopes FROM oauth_clients WHERE client_id = ?", [
    clientId,
  ])) as { scopes: string } | undefined;
  if (!row?.scopes) return null;
  try {
    const list = JSON.parse(row.scopes) as string[];
    return Array.isArray(list) && list.length ? list : null;
  } catch {
    return null;
  }
}

export async function listOAuthClientsByOwner(ownerUserId: string): Promise<OAuthClient[]> {
  const db = adb();
  const rows = (await db.all(
    "SELECT * FROM oauth_clients WHERE owner_user_id = ? ORDER BY created_at DESC",
    [ownerUserId],
  )) as ClientRow[];
  return Promise.all(rows.map(rowToClient));
}

export async function createOAuthClient(input: {
  name: string;
  description?: string;
  websiteUrl?: string;
  ownerUserId: string;
  redirectUris: string[];
  clientType?: OAuthClientType;
}): Promise<OAuthClientWithSecret> {
  const db = adb();
  const clientId = generateClientId();
  const clientSecret = generateClientSecret();
  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    await tx.run(
      `INSERT INTO oauth_clients
       (client_id, client_secret_hash, name, description, logo_url, website_url, owner_user_id, client_type, tier, verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, '', ?, ?, ?, 'public', 0, ?, ?)`,
      [
        clientId,
        hashClientSecret(clientSecret),
        input.name.trim(),
        input.description?.trim() || "",
        input.websiteUrl?.trim() || "",
        input.ownerUserId,
        input.clientType || "confidential",
        now,
        now,
      ],
    );

    for (const uri of input.redirectUris) {
      await tx.run(
        "INSERT INTO oauth_redirect_uris (client_id, uri, created_at) VALUES (?, ?, ?)",
        [clientId, uri.trim(), now],
      );
    }
  });

  const client = (await getOAuthClient(clientId))!;
  return { ...client, clientSecret };
}

export async function requestClientVerification(
  clientId: string,
  ownerUserId: string,
): Promise<boolean> {
  const db = adb();
  const row = (await db.get(
    "SELECT owner_user_id, verified, tier FROM oauth_clients WHERE client_id = ?",
    [clientId],
  )) as { owner_user_id: string; verified: number; tier: string } | undefined;
  if (!row || row.owner_user_id !== ownerUserId) return false;
  if (row.verified === 1 || row.tier === "sister") return true;
  await db.run("UPDATE oauth_clients SET updated_at = ? WHERE client_id = ?", [
    new Date().toISOString(),
    clientId,
  ]);
  return true;
}

export async function verifyOAuthClient(clientId: string): Promise<boolean> {
  const db = adb();
  const row = await db.get("SELECT client_id FROM oauth_clients WHERE client_id = ?", [clientId]);
  if (!row) return false;
  await db.run(
    "UPDATE oauth_clients SET verified = 1, tier = CASE WHEN tier = 'public' THEN 'partner' ELSE tier END, updated_at = ? WHERE client_id = ?",
    [new Date().toISOString(), clientId],
  );
  return true;
}

export async function updateOAuthClient(
  clientId: string,
  ownerUserId: string,
  patch: { name?: string; description?: string; websiteUrl?: string; redirectUris?: string[] },
): Promise<OAuthClient | null> {
  const db = adb();
  const row = (await db.get("SELECT * FROM oauth_clients WHERE client_id = ?", [clientId])) as
    | ClientRow
    | undefined;
  if (!row || (row.owner_user_id !== ownerUserId && row.owner_user_id !== "system")) return null;

  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    if (patch.name || patch.description !== undefined || patch.websiteUrl !== undefined) {
      await tx.run(
        "UPDATE oauth_clients SET name = ?, description = ?, website_url = ?, updated_at = ? WHERE client_id = ?",
        [
          patch.name ?? row.name,
          patch.description ?? row.description,
          patch.websiteUrl ?? row.website_url,
          now,
          clientId,
        ],
      );
    }

    if (patch.redirectUris) {
      await tx.run("DELETE FROM oauth_redirect_uris WHERE client_id = ?", [clientId]);
      for (const uri of patch.redirectUris) {
        await tx.run(
          "INSERT INTO oauth_redirect_uris (client_id, uri, created_at) VALUES (?, ?, ?)",
          [clientId, uri.trim(), now],
        );
      }
      await tx.run("UPDATE oauth_clients SET updated_at = ? WHERE client_id = ?", [
        now,
        clientId,
      ]);
    }
  });

  return getOAuthClient(clientId);
}

export async function rotateClientSecret(
  clientId: string,
  ownerUserId: string,
): Promise<string | null> {
  const db = adb();
  const row = (await db.get("SELECT owner_user_id FROM oauth_clients WHERE client_id = ?", [
    clientId,
  ])) as { owner_user_id: string } | undefined;
  if (!row || row.owner_user_id !== ownerUserId) return null;
  const secret = generateClientSecret();
  await db.run(
    "UPDATE oauth_clients SET client_secret_hash = ?, updated_at = ? WHERE client_id = ?",
    [hashClientSecret(secret), new Date().toISOString(), clientId],
  );
  return secret;
}

export async function deleteOAuthClient(clientId: string, ownerUserId: string): Promise<boolean> {
  const db = adb();
  const row = (await db.get("SELECT owner_user_id, tier FROM oauth_clients WHERE client_id = ?", [
    clientId,
  ])) as { owner_user_id: string; tier: string } | undefined;
  if (!row || row.owner_user_id !== ownerUserId || row.tier === "sister") return false;
  await db.transaction(async (tx) => {
    await tx.run("DELETE FROM oauth_redirect_uris WHERE client_id = ?", [clientId]);
    await tx.run("DELETE FROM oauth_clients WHERE client_id = ?", [clientId]);
  });
  return true;
}
