import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { getDb } from "@/lib/storage/database";
import { SISTER_APPS } from "@/lib/oauth-provider/sister-apps";

export const runtime = "nodejs";

/** GET /api/admin/ecosystem — apps sœurs, clients OAuth, distribution. */
export async function GET() {
  const auth = await requireSection("ecosystem");
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const all = (sql: string, ...args: unknown[]) =>
    db.prepare(sql).all(...args) as Record<string, unknown>[];

  const clients = all(
    `SELECT c.client_id, c.name, c.client_type, c.tier, c.verified, c.created_at,
            u.email AS owner_email,
            (SELECT COUNT(*) FROM oauth_access_tokens t WHERE t.client_id = c.client_id AND t.revoked_at IS NULL) AS active_tokens,
            (SELECT COUNT(*) FROM oauth_user_consents uc WHERE uc.client_id = c.client_id) AS consents
     FROM oauth_clients c LEFT JOIN users u ON u.id = c.owner_user_id
     ORDER BY c.created_at DESC`,
  );

  const registeredIds = new Set(clients.map((c) => String(c.client_id)));

  return NextResponse.json({
    ok: true,
    sisters: SISTER_APPS.map((app) => ({
      slug: app.slug,
      name: app.name,
      description: app.description,
      domain: app.productionDomain,
      websiteUrl: app.websiteUrl,
      registered: registeredIds.has(process.env[app.clientIdEnv]?.trim() || app.clientId),
      clientIdConfigured: Boolean(process.env[app.clientIdEnv]?.trim()),
      secretConfigured: Boolean(process.env[app.secretEnv]?.trim()),
    })),
    clients,
    totals: {
      clients: clients.length,
      verified: clients.filter((c) => c.verified === 1 || c.verified === true).length,
      sister: clients.filter((c) => c.tier === "sister").length,
      activeTokens: clients.reduce((s, c) => s + (Number(c.active_tokens) || 0), 0),
    },
  });
}
