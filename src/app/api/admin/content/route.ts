import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/storage/database";

export const runtime = "nodejs";

/**
 * GET /api/admin/content — Ayebi encyclopedia, Studio sites, OAuth clients.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const all = (sql: string) => db.prepare(sql).all();
  const count = (sql: string) =>
    (db.prepare(sql).get() as { n: number } | undefined)?.n ?? 0;

  return NextResponse.json({
    ok: true,
    ayebi: {
      stats: {
        articles: count("SELECT COUNT(*) AS n FROM ayebi_articles"),
        revisions: count("SELECT COUNT(*) AS n FROM ayebi_revisions"),
        openFlags: count("SELECT COUNT(*) AS n FROM ayebi_flags WHERE status = 'open'"),
        portals: count("SELECT COUNT(*) AS n FROM ayebi_portals"),
        categories: count("SELECT COUNT(*) AS n FROM ayebi_categories"),
        pageViews: count("SELECT COUNT(*) AS n FROM ayebi_page_views"),
      },
      flags: all("SELECT * FROM ayebi_flags ORDER BY created_at DESC LIMIT 200"),
      recentArticles: all(
        "SELECT slug, title, category, protection, revision, updated_at, updated_by_name FROM ayebi_articles ORDER BY updated_at DESC LIMIT 100",
      ),
    },
    studio: {
      sites: all(
        `SELECT s.id, s.domain, s.status, s.verified_at, s.created_at, u.email AS owner_email
         FROM studio_sites s LEFT JOIN users u ON u.id = s.user_id
         ORDER BY s.created_at DESC LIMIT 200`,
      ),
      stats: {
        sites: count("SELECT COUNT(*) AS n FROM studio_sites"),
        traceEvents: count("SELECT COUNT(*) AS n FROM trace_events"),
        velocityAudits: count("SELECT COUNT(*) AS n FROM velocity_audits"),
      },
    },
    oauth: {
      clients: all(
        `SELECT c.client_id, c.name, c.verified, c.tier, c.created_at, u.email AS owner_email
         FROM oauth_clients c LEFT JOIN users u ON u.id = c.owner_user_id
         ORDER BY c.created_at DESC LIMIT 200`,
      ),
      stats: {
        clients: count("SELECT COUNT(*) AS n FROM oauth_clients"),
        tokens: count("SELECT COUNT(*) AS n FROM oauth_access_tokens"),
        consents: count("SELECT COUNT(*) AS n FROM oauth_user_consents"),
      },
    },
  });
}
