import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { getDb } from "@/lib/storage/database";
import { listAdminSessions, listLoginAttempts, revokeAdminSession } from "@/lib/admin/session";

export const runtime = "nodejs";

/** GET /api/admin/security — sessions admin, tentatives, événements OAuth. */
export async function GET() {
  const auth = await requireSection("security");
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const now = new Date().toISOString();
  const count = (sql: string, ...args: unknown[]) =>
    (db.prepare(sql).get(...args) as { n: number } | undefined)?.n ?? 0;
  const all = (sql: string, ...args: unknown[]) =>
    db.prepare(sql).all(...args) as Record<string, unknown>[];

  return NextResponse.json({
    ok: true,
    sessions: listAdminSessions().filter((s) => !s.revoked_at && String(s.expires_at) > now),
    recentSessions: listAdminSessions().slice(0, 30),
    loginAttempts: listLoginAttempts(60),
    oauthEvents: all(
      "SELECT event_type, client_id, user_id, ip, detail, created_at FROM oauth_audit_log ORDER BY created_at DESC LIMIT 50",
    ),
    stats: {
      activeSessions: count(
        "SELECT COUNT(*) AS n FROM admin_sessions WHERE revoked_at IS NULL AND expires_at > ?",
        now,
      ),
      failedLogins24h: count(
        "SELECT COUNT(*) AS n FROM admin_login_attempts WHERE success = 0 AND created_at >= ?",
        new Date(Date.now() - 86400_000).toISOString(),
      ),
      users2fa: count("SELECT COUNT(*) AS n FROM user_security WHERE totp_enabled = 1"),
      oauthTokens: count("SELECT COUNT(*) AS n FROM oauth_access_tokens"),
      revokedTokens: count(
        "SELECT COUNT(*) AS n FROM oauth_access_tokens WHERE revoked_at IS NOT NULL",
      ),
    },
  });
}

/** POST /api/admin/security — revoke an admin session. */
export async function POST(req: Request) {
  const auth = await requireSection("security");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => null)) as { action?: string; sessionId?: string } | null;
  if (body?.action === "revoke" && body.sessionId) {
    await revokeAdminSession(body.sessionId);
    try {
      getDb()
        .prepare(
          `INSERT INTO admin_audit_log (id, admin_id, admin_name, action, entity_type, entity_id, changes, timestamp)
           VALUES (?, ?, ?, 'revoke_admin_session', 'admin_session', ?, '{}', ?)`,
        )
        .run(
          crypto.randomUUID(),
          auth.admin?.id ?? "env",
          auth.admin?.name ?? auth.user.name,
          body.sessionId,
          new Date().toISOString(),
        );
    } catch {
      /* audit best-effort */
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
