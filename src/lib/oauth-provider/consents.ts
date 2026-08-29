import { getDb } from "@/lib/storage/database";
import { logOAuthAudit } from "./audit";

export type ConnectedApp = {
  clientId: string;
  name: string;
  description: string;
  logoUrl: string;
  websiteUrl: string;
  scope: string;
  grantedAt: string;
  tier: string;
  verified: boolean;
};

export function listUserConnectedApps(userId: string): ConnectedApp[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.client_id, c.name, c.description, c.logo_url, c.website_url, c.tier, c.verified,
              uc.scope, uc.granted_at
       FROM oauth_user_consents uc
       JOIN oauth_clients c ON c.client_id = uc.client_id
       WHERE uc.user_id = ?
       ORDER BY uc.granted_at DESC`,
    )
    .all(userId) as {
    client_id: string;
    name: string;
    description: string;
    logo_url: string;
    website_url: string;
    tier: string;
    verified: number;
    scope: string;
    granted_at: string;
  }[];

  return rows.map((r) => ({
    clientId: r.client_id,
    name: r.name,
    description: r.description,
    logoUrl: r.logo_url,
    websiteUrl: r.website_url,
    scope: r.scope,
    grantedAt: r.granted_at,
    tier: r.tier,
    verified: r.verified === 1,
  }));
}

export function revokeUserAppAccess(userId: string, clientId: string, ip?: string) {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare("DELETE FROM oauth_user_consents WHERE user_id = ? AND client_id = ?").run(
    userId,
    clientId,
  );

  db.prepare(
    `UPDATE oauth_access_tokens SET revoked_at = ?
     WHERE user_id = ? AND client_id = ? AND revoked_at IS NULL`,
  ).run(now, userId, clientId);

  db.prepare(
    `UPDATE oauth_refresh_tokens SET revoked_at = ?
     WHERE user_id = ? AND client_id = ? AND revoked_at IS NULL`,
  ).run(now, userId, clientId);

  logOAuthAudit({
    event: "consent_revoked",
    clientId,
    userId,
    ip,
    detail: "User revoked app access",
  });
}
