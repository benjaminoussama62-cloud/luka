import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/storage/database";

export const runtime = "nodejs";

/** GET /api/admin/users?q=&limit= — user accounts + aggregates. */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const db = getDb();

  const users = q
    ? db
        .prepare(
          `SELECT id, name, email, provider, role, created_at
           FROM users WHERE name LIKE ? OR email LIKE ?
           ORDER BY created_at DESC LIMIT ?`,
        )
        .all(`%${q}%`, `%${q}%`, limit)
    : db
        .prepare(
          `SELECT id, name, email, provider, role, created_at
           FROM users ORDER BY created_at DESC LIMIT ?`,
        )
        .all(limit);

  const count = (sql: string) =>
    (db.prepare(sql).get() as { n: number } | undefined)?.n ?? 0;

  return NextResponse.json({
    ok: true,
    users,
    stats: {
      totalUsers: count("SELECT COUNT(*) AS n FROM users"),
      ayebiContributions: count("SELECT COUNT(*) AS n FROM ayebi_revisions"),
      studioSites: count("SELECT COUNT(*) AS n FROM studio_sites"),
      ayebiArticles: count("SELECT COUNT(*) AS n FROM ayebi_articles"),
      admins: count("SELECT COUNT(*) AS n FROM admin_users WHERE status = 'active'"),
    },
  });
}
