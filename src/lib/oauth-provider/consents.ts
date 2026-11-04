import { adb } from "@/lib/storage/adb";
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

export async function listUserConnectedApps(userId: string): Promise<ConnectedApp[]> {
  const db = adb();
  const rows = (await db.all(
    `SELECT c.client_id, c.name, c.description, c.logo_url, c.website_url, c.tier, c.verified,
            uc.scope, uc.granted_at
     FROM oauth_user_consents uc
     JOIN oauth_clients c ON c.client_id = uc.client_id
     WHERE uc.user_id = ?
     ORDER BY uc.granted_at DESC`,
    [userId],
  )) as {
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

export async function revokeUserAppAccess(userId: string, clientId: string, ip?: string) {
  const db = adb();
  const now = new Date().toISOString();

  // Consentement + jetons révoqués dans la même transaction — jamais un état
  // où le consentement est retiré mais un refresh token reste vivant.
  await db.transaction(async (tx) => {
    await tx.run("DELETE FROM oauth_user_consents WHERE user_id = ? AND client_id = ?", [
      userId,
      clientId,
    ]);

    await tx.run(
      `UPDATE oauth_access_tokens SET revoked_at = ?
       WHERE user_id = ? AND client_id = ? AND revoked_at IS NULL`,
      [now, userId, clientId],
    );

    await tx.run(
      `UPDATE oauth_refresh_tokens SET revoked_at = ?
       WHERE user_id = ? AND client_id = ? AND revoked_at IS NULL`,
      [now, userId, clientId],
    );
  });

  await logOAuthAudit({
    event: "consent_revoked",
    clientId,
    userId,
    ip,
    detail: "User revoked app access",
  });
}
