import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { getDb } from "@/lib/storage/database";
import { sendSystemMessage, setAccountStatus } from "@/lib/mail/mail";

export const runtime = "nodejs";

const maskPhone = (p: string) =>
  p && p.length > 5 ? `${p.slice(0, 5)}•••${p.slice(-2)}` : p || "—";

/** GET /api/admin/mail — stats + comptes Ayeba Mail. */
export async function GET(req: Request) {
  const auth = await requireSection("mail");
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100));

  const count = (sql: string, ...args: unknown[]) =>
    (db.prepare(sql).get(...args) as { n: number } | undefined)?.n ?? 0;

  const accounts = (
    (q
      ? db
          .prepare(
            `SELECT a.id, a.email, a.address, a.phone, a.display_name, a.status, a.created_at, u.email AS user_email
             FROM mail_accounts a JOIN users u ON u.id = a.user_id
             WHERE a.email LIKE ? OR a.display_name LIKE ? OR u.email LIKE ?
             ORDER BY a.created_at DESC LIMIT ?`,
          )
          .all(`%${q}%`, `%${q}%`, `%${q}%`, limit)
      : db
          .prepare(
            `SELECT a.id, a.email, a.address, a.phone, a.display_name, a.status, a.created_at, u.email AS user_email
             FROM mail_accounts a JOIN users u ON u.id = a.user_id
             ORDER BY a.created_at DESC LIMIT ?`,
          )
          .all(limit)) as Record<string, unknown>[]
  ).map((a) => ({
    ...a,
    phone: maskPhone(String(a.phone || "")),
    messages: count(
      "SELECT COUNT(*) AS n FROM mail_messages WHERE account_id = ? AND folder != 'trash'",
      a.id,
    ),
  }));

  return NextResponse.json({
    ok: true,
    accounts,
    stats: {
      accounts: count("SELECT COUNT(*) AS n FROM mail_accounts"),
      suspended: count("SELECT COUNT(*) AS n FROM mail_accounts WHERE status = 'suspended'"),
      messages: count("SELECT COUNT(*) AS n FROM mail_messages"),
      bounces: count("SELECT COUNT(*) AS n FROM mail_messages WHERE kind = 'bounce'"),
      pendingVerifications: count(
        "SELECT COUNT(*) AS n FROM mail_verifications WHERE expires_at > ?",
        new Date().toISOString(),
      ),
      unreadInboxes: count(
        "SELECT COUNT(*) AS n FROM mail_messages WHERE folder = 'inbox' AND is_read = 0",
      ),
    },
  });
}

/** POST /api/admin/mail — notify : message système dans la boîte d'un compte. */
export async function POST(req: Request) {
  const auth = await requireSection("mail");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => null)) as
    | { action?: string; accountId?: string; subject?: string; message?: string }
    | null;
  if (body?.action === "notify" && body.accountId && body.subject && body.message) {
    const ok = sendSystemMessage(body.accountId, body.subject.slice(0, 200), body.message.slice(0, 5000));
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }
  return NextResponse.json({ error: "action invalide" }, { status: 400 });
}

/** PATCH /api/admin/mail — suspend / reactivate un compte mail. */
export async function PATCH(req: Request) {
  const auth = await requireSection("mail");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => null)) as
    | { accountId?: string; status?: string }
    | null;
  const status = body?.status === "suspended" ? "suspended" : body?.status === "active" ? "active" : null;
  if (!body?.accountId || !status) {
    return NextResponse.json({ error: "accountId + status requis" }, { status: 400 });
  }
  setAccountStatus(body.accountId, status);
  return NextResponse.json({ ok: true });
}
