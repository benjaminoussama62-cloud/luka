import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { adb } from "@/lib/storage/adb";

export const runtime = "nodejs";

/**
 * GET /api/admin/content — Ayebi encyclopedia, Studio sites, OAuth clients.
 */
export async function GET() {
  const auth = await requireSection("content");
  if (auth instanceof NextResponse) return auth;

  const db = adb();
  const all = async (sql: string) => db.all(sql);
  const count = async (sql: string) =>
    (await db.get(sql) as { n: number } | undefined)?.n ?? 0;

  return NextResponse.json({
    ok: true,
    ayebi: {
      stats: {
        articles: await count("SELECT COUNT(*) AS n FROM ayebi_articles"),
        revisions: await count("SELECT COUNT(*) AS n FROM ayebi_revisions"),
        openFlags: await count("SELECT COUNT(*) AS n FROM ayebi_flags WHERE status = 'open'"),
        portals: await count("SELECT COUNT(*) AS n FROM ayebi_portals"),
        categories: await count("SELECT COUNT(*) AS n FROM ayebi_categories"),
        pageViews: await count("SELECT COUNT(*) AS n FROM ayebi_page_views"),
      },
      flags: await all("SELECT * FROM ayebi_flags ORDER BY created_at DESC LIMIT 200"),
      recentArticles: await all("SELECT slug, title, category, protection, revision, updated_at, updated_by_name FROM ayebi_articles ORDER BY updated_at DESC LIMIT 100"
      ),
    },
    studio: {
      sites: await all(`SELECT s.id, s.domain, s.status, s.verified_at, s.created_at, u.email AS owner_email
         FROM studio_sites s LEFT JOIN users u ON u.id = s.user_id
         ORDER BY s.created_at DESC LIMIT 200`
      ),
      stats: {
        sites: await count("SELECT COUNT(*) AS n FROM studio_sites"),
        traceEvents: await count("SELECT COUNT(*) AS n FROM trace_events"),
        velocityAudits: await count("SELECT COUNT(*) AS n FROM velocity_audits"),
      },
    },
    oauth: {
      clients: await all(`SELECT c.client_id, c.name, c.verified, c.tier, c.created_at, u.email AS owner_email
         FROM oauth_clients c LEFT JOIN users u ON u.id = c.owner_user_id
         ORDER BY c.created_at DESC LIMIT 200`
      ),
      stats: {
        clients: await count("SELECT COUNT(*) AS n FROM oauth_clients"),
        tokens: await count("SELECT COUNT(*) AS n FROM oauth_access_tokens"),
        consents: await count("SELECT COUNT(*) AS n FROM oauth_user_consents"),
      },
    },
  });
}
