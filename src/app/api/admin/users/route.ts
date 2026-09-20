import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { getDb } from "@/lib/storage/database";

export const runtime = "nodejs";

/** GET /api/admin/users?q=&limit= — user accounts + aggregates. */
export async function GET(req: Request) {
  const auth = await requireSection("users");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const detail = url.searchParams.get("id") || "";
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const db = getDb();

  // Single-user dossier: sites, articles, OAuth consents, sessions.
  if (detail) {
    const user = db
      .prepare("SELECT id, name, email, provider, role, status, created_at FROM users WHERE id = ?")
      .get(detail) as Record<string, unknown> | undefined;
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    const count = (sql: string, ...args: string[]) =>
      (db.prepare(sql).get(...args) as { n: number } | undefined)?.n ?? 0;
    const all = (sql: string, ...args: string[]) =>
      db.prepare(sql).all(...args) as Record<string, unknown>[];
    return NextResponse.json({
      ok: true,
      user,
      detail: {
        sites: all("SELECT id, display_name AS name, domain, status, created_at FROM studio_sites WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", detail),
        articles: all("SELECT slug, title, created_at FROM ayebi_articles WHERE created_by = ? ORDER BY created_at DESC LIMIT 50", detail),
        revisions: count("SELECT COUNT(*) AS n FROM ayebi_revisions WHERE author_id = ?", detail),
        oauthConsents: all("SELECT client_id, scope, granted_at FROM oauth_user_consents WHERE user_id = ?", detail),
        developerKeys: count("SELECT COUNT(*) AS n FROM developer_api_keys WHERE owner_user_id = ? AND status != 'revoked'", detail),
        searches: count("SELECT COUNT(*) AS n FROM search_history WHERE user_id = ?", detail),
        tickets: all("SELECT id, subject, status, created_at FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", detail),
        totpEnabled: count("SELECT COUNT(*) AS n FROM user_security WHERE user_id = ? AND totp_enabled = 1", detail) === 1,
      },
    });
  }

  const users = q
    ? db
        .prepare(
          `SELECT id, name, email, provider, role, status, created_at
           FROM users WHERE name LIKE ? OR email LIKE ?
           ORDER BY created_at DESC LIMIT ?`,
        )
        .all(`%${q}%`, `%${q}%`, limit)
    : db
        .prepare(
          `SELECT id, name, email, provider, role, status, created_at
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
      suspendedUsers: count("SELECT COUNT(*) AS n FROM users WHERE status = 'suspended'"),
      ayebiContributions: count("SELECT COUNT(*) AS n FROM ayebi_revisions"),
      studioSites: count("SELECT COUNT(*) AS n FROM studio_sites"),
      ayebiArticles: count("SELECT COUNT(*) AS n FROM ayebi_articles"),
      admins: count("SELECT COUNT(*) AS n FROM admin_users WHERE status = 'active'"),
    },
  });
}

/** POST /api/admin/users — suspend / reactivate an account (super_admin only via section). */
export async function POST(req: Request) {
  const auth = await requireSection("users");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => null)) as {
    action?: string;
    userId?: string;
  } | null;
  if (!body?.userId || !["suspend", "activate"].includes(body.action ?? "")) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const db = getDb();
  const target = db
    .prepare("SELECT id, email, name FROM users WHERE id = ?")
    .get(body.userId) as { id: string; email: string; name: string } | undefined;
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  // Safety: never suspend an active admin or oneself.
  const isTargetAdmin = db
    .prepare("SELECT COUNT(*) AS n FROM admin_users WHERE user_id = ? AND status = 'active'")
    .get(body.userId) as { n: number };
  if (body.action === "suspend" && (isTargetAdmin.n > 0 || body.userId === auth.user.id)) {
    return NextResponse.json(
      { error: "Impossible de suspendre un administrateur actif ou toi-même." },
      { status: 400 },
    );
  }

  const status = body.action === "suspend" ? "suspended" : "active";
  db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, body.userId);
  // Kill every admin session the target might hold.
  if (status === "suspended") {
    db.prepare(
      "UPDATE admin_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
    ).run(new Date().toISOString(), body.userId);
  }

  try {
    db.prepare(
      `INSERT INTO admin_audit_log (id, admin_id, admin_name, action, entity_type, entity_id, changes, timestamp)
       VALUES (?, ?, ?, ?, 'user', ?, ?, ?)`,
    ).run(
      crypto.randomUUID(),
      auth.admin?.id ?? "env",
      auth.admin?.name ?? auth.user.name,
      body.action === "suspend" ? "suspend_user" : "reactivate_user",
      body.userId,
      JSON.stringify({ email: target.email }),
      new Date().toISOString(),
    );
  } catch {
    /* audit best-effort */
  }

  return NextResponse.json({ ok: true, status });
}
