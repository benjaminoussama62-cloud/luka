import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { adb } from "@/lib/storage/adb";
import { moneyDb } from "@/lib/money/db";
import { minorToMajorString } from "@/lib/money/amounts";

export const runtime = "nodejs";

/** GET /api/admin/users?q=&limit= — user accounts + aggregates. */
export async function GET(req: Request) {
  const auth = await requireSection("users");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const detail = url.searchParams.get("id") || "";
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const db = adb();

  // Single-user dossier: sites, articles, OAuth consents, sessions.
  if (detail) {
    const user = await db.get("SELECT id, name, email, provider, role, status, created_at FROM users WHERE id = ?", [detail]);
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    const count = async (sql: string, ...args: string[]) =>
      Number(((await db.get(sql, [args])) as { n?: number } | undefined)?.n ?? 0);
    const all = (sql: string, ...args: string[]) => db.all(sql, args);

    const [sites, articles, revisions, oauthConsents, developerKeys, searches, tickets, mailAccount, mailMessages, totpCount, oauthClients] =
      await Promise.all([
        await all("SELECT id, display_name AS name, domain, status, created_at FROM studio_sites WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", detail),
        await all("SELECT slug, title, created_at FROM ayebi_articles WHERE created_by = ? ORDER BY created_at DESC LIMIT 50", detail),
        await count("SELECT COUNT(*) AS n FROM ayebi_revisions WHERE author_id = ?", detail),
        await all("SELECT client_id, scope, granted_at FROM oauth_user_consents WHERE user_id = ?", detail),
        await count("SELECT COUNT(*) AS n FROM developer_api_keys WHERE owner_user_id = ? AND status != 'revoked'", detail),
        await count("SELECT COUNT(*) AS n FROM search_history WHERE user_id = ?", detail),
        await all("SELECT id, subject, status, created_at FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", detail),
        db.get("SELECT email, display_name, status, created_at FROM mail_accounts WHERE user_id = ?", [detail]),
        await count("SELECT COUNT(*) AS n FROM mail_messages m JOIN mail_accounts a ON a.id = m.account_id WHERE a.user_id = ?", detail),
        await count("SELECT COUNT(*) AS n FROM user_security WHERE user_id = ? AND totp_enabled = 1", detail),
        await all("SELECT client_id, name, client_type, tier, verified, created_at FROM oauth_clients WHERE owner_user_id = ? ORDER BY created_at DESC LIMIT 20", detail),
      ]);

    // Dossier financier Mbongo — soldes, statut, activité (jamais de secrets).
    let wallet: Record<string, unknown> | null = null;
    let money: Record<string, unknown> | null = null;
    try {
      const mdb = await moneyDb();
      const w = (await mdb.get(
        "SELECT id, handle, status, created_at FROM money_wallets WHERE user_id = ?", [detail]
      )) as Record<string, unknown> | undefined;
      if (w) {
        const balances = await mdb.all(
          "SELECT currency, balance_minor FROM money_balances WHERE wallet_id = ?", [w.id]
        );
        const txCount = Number(((await mdb.get(
          "SELECT COUNT(*) AS n FROM money_transactions WHERE from_wallet_id = ? OR to_wallet_id = ?",
          [w.id, w.id]
        )) as { n?: number })?.n ?? 0);
        const kyc = (await mdb.get(
          "SELECT status, submitted_at, reviewed_at FROM money_kyc WHERE user_id = ?", [detail]
        )) as Record<string, unknown> | undefined;
        wallet = {
          id: w.id, handle: w.handle ? `@${w.handle}` : null, status: w.status, createdAt: w.created_at,
          balances: Object.fromEntries(
            (balances as Record<string, unknown>[]).map((b) => [
              b.currency,
              minorToMajorString(Number(b.balance_minor), String(b.currency) as "USD" | "CDF"),
            ])
          ),
        };
        money = { transactions: txCount, kycStatus: kyc?.status ?? null };
      }
    } catch {
      /* money tables may not exist yet */
    }

    return NextResponse.json({
      ok: true,
      user,
      detail: {
        sites, articles, revisions, oauthConsents, oauthClients, developerKeys, searches, tickets,
        mailAccount: mailAccount ?? null,
        mailMessages,
        totpEnabled: totpCount === 1,
        wallet, money,
      },
    });
  }

  const users = q
    ? await db.all(`SELECT id, name, email, provider, role, status, created_at
         FROM users WHERE name LIKE ? OR email LIKE ?
         ORDER BY created_at DESC LIMIT ?`, [`%${q}%`, `%${q}%`, limit])
    : await db.all(`SELECT id, name, email, provider, role, status, created_at
         FROM users ORDER BY created_at DESC LIMIT ?`, [limit]);

  const count = async (sql: string) =>
    Number(((await db.get(sql)) as { n?: number } | undefined)?.n ?? 0);

  return NextResponse.json({
    ok: true,
    users,
    stats: {
      totalUsers: await count("SELECT COUNT(*) AS n FROM users"),
      suspendedUsers: await count("SELECT COUNT(*) AS n FROM users WHERE status = 'suspended'"),
      ayebiContributions: await count("SELECT COUNT(*) AS n FROM ayebi_revisions"),
      studioSites: await count("SELECT COUNT(*) AS n FROM studio_sites"),
      ayebiArticles: await count("SELECT COUNT(*) AS n FROM ayebi_articles"),
      admins: await count("SELECT COUNT(*) AS n FROM admin_users WHERE status = 'active'"),
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

  const db = adb();
  const target = await db.get("SELECT id, email, name FROM users WHERE id = ?", [body.userId]) as
    { id: string; email: string; name: string } | undefined;
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  // Safety: never suspend an active admin or oneself.
  const isTargetAdmin = await db.get("SELECT COUNT(*) AS n FROM admin_users WHERE user_id = ? AND status = 'active'", [body.userId]) as { n: number } | undefined;
  if (body.action === "suspend" && (Number(isTargetAdmin?.n ?? 0) > 0 || body.userId === auth.user.id)) {
    return NextResponse.json(
      { error: "Impossible de suspendre un administrateur actif ou toi-même." },
      { status: 400 }
    );
  }

  const status = body.action === "suspend" ? "suspended" : "active";
  await db.run("UPDATE users SET status = ? WHERE id = ?", [status, body.userId]);
  // Kill every admin session the target might hold.
  if (status === "suspended") {
    await db.run("UPDATE admin_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL", [new Date().toISOString(), body.userId]);
  }

  try {
    await db.run(`INSERT INTO admin_audit_log (id, admin_id, admin_name, action, entity_type, entity_id, changes, timestamp)
       VALUES (?, ?, ?, ?, 'user', ?, ?, ?)`, [
        crypto.randomUUID(),
        auth.admin?.id ?? "env",
        auth.admin?.name ?? auth.user.name,
        body.action === "suspend" ? "suspend_user" : "reactivate_user",
        body.userId,
        JSON.stringify({ email: target.email }),
        new Date().toISOString(),
      ]);
  } catch {
    /* audit best-effort */
  }

  return NextResponse.json({ ok: true, status });
}
