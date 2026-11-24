import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import {
  audit,
  getWalletById,
  getWalletByUserId,
  listWallets,
  normalizeHandle,
  reverseWithdrawal,
  setWalletStatus,
} from "@/lib/money/core";
import { minorToMajorString } from "@/lib/money/amounts";
import { moneyDb } from "@/lib/money/db";
import { moneyError } from "@/lib/money/http";

export const runtime = "nodejs";

const clamp = (v: string | null, max = 200) =>
  Math.min(max, Math.max(1, Number(v) || 50));

function txRow(t: Record<string, unknown>) {
  const cur = String(t.currency ?? "USD") as "USD" | "CDF";
  return {
    id: t.id,
    kind: t.kind,
    status: t.status,
    currency: cur,
    amount: { minor: t.amount_minor, display: minorToMajorString(Number(t.amount_minor), cur) },
    from: { walletId: t.from_wallet_id, handle: t.from_handle ? `@${t.from_handle}` : null },
    to: { walletId: t.to_wallet_id, handle: t.to_handle ? `@${t.to_handle}` : null },
    provider: t.provider ?? null,
    providerRef: t.provider_ref ?? null,
    parentId: t.parent_id ?? null,
    createdAt: t.created_at,
    completedAt: t.completed_at ?? null,
  };
}

/**
 * GET /api/admin/money — console Mbongo.
 * ?view=wallets      (défaut) wallets + stats ops ; ?status= ?q= ?audit=1
 * ?view=transactions ?status= ?kind= ?q= ?limit=  (q = tx id / handle / user)
 * ?view=ledger&wallet=<id>                        écritures double-entrée
 * ?view=kyc&status=pending|verified|rejected      file KYC (+ user email)
 * ?view=kyc_doc&user=<id>                         pièce jointe (review)
 * ?view=requests&status=open                      demandes de paiement
 */
export async function GET(req: Request) {
  const auth = await requireSection("billing");
  if (auth instanceof NextResponse) return auth;

  try {
  const url = new URL(req.url);
  const view = url.searchParams.get("view") || "wallets";
  const db = await moneyDb();

  if (view === "transactions") {
    const status = url.searchParams.get("status") || "";
    const kind = url.searchParams.get("kind") || "";
    const q = (url.searchParams.get("q") || "").trim();
    const limit = clamp(url.searchParams.get("limit"), 300);
    const where: string[] = [];
    const args: unknown[] = [];
    if (status) { where.push("t.status = ?"); args.push(status); }
    if (kind) { where.push("t.kind = ?"); args.push(kind); }
    if (q) {
      where.push("(t.id = ? OR wf.handle = ? OR wt.handle = ? OR wf.user_id = ? OR wt.user_id = ? OR t.provider_ref = ?)");
      args.push(q, normalizeHandle(q), normalizeHandle(q), q, q, q);
    }
    const rows = await db.all(`SELECT t.*, wf.handle AS from_handle, wt.handle AS to_handle
       FROM money_transactions t
       LEFT JOIN money_wallets wf ON wf.id = t.from_wallet_id
       LEFT JOIN money_wallets wt ON wt.id = t.to_wallet_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY t.created_at DESC LIMIT ?`, [...args, limit]);
    return NextResponse.json({ ok: true, transactions: (rows as Record<string, unknown>[]).map(txRow) });
  }

  if (view === "ledger") {
    const wallet = url.searchParams.get("wallet") || "";
    if (!wallet) return NextResponse.json({ error: "wallet requis" }, { status: 400 });
    const rows = await db.all(`SELECT e.id, e.transaction_id, e.currency, e.delta_minor, e.balance_after_minor, e.created_at,
              t.kind AS tx_kind, t.status AS tx_status
       FROM money_entries e JOIN money_transactions t ON t.id = e.transaction_id
       WHERE e.wallet_id = ? ORDER BY e.id DESC LIMIT ?`, [wallet, clamp(url.searchParams.get("limit"), 500)]);
    return NextResponse.json({
      ok: true,
      entries: (rows as Record<string, unknown>[]).map((e) => ({
        id: e.id, txId: e.transaction_id, kind: e.tx_kind, txStatus: e.tx_status,
        currency: e.currency,
        delta: minorToMajorString(Number(e.delta_minor), String(e.currency) as "USD" | "CDF"),
        balanceAfter: minorToMajorString(Number(e.balance_after_minor), String(e.currency) as "USD" | "CDF"),
        at: e.created_at,
      })),
    });
  }

  if (view === "kyc") {
    const status = url.searchParams.get("status") || "pending";
    const rows = await db.all(`SELECT k.user_id, k.full_name, k.birthdate, k.id_type, k.status, k.submitted_at, k.reviewed_at,
              u.email, u.name AS account_name,
              d.doc_number, CASE WHEN d.doc_image != '' THEN 1 ELSE 0 END AS has_doc
       FROM money_kyc k
       LEFT JOIN users u ON u.id = k.user_id
       LEFT JOIN money_kyc_docs d ON d.user_id = k.user_id
       WHERE k.status = ? ORDER BY k.submitted_at ASC LIMIT 300`, [status]);
    return NextResponse.json({ ok: true, kyc: rows });
  }

  if (view === "kyc_doc") {
    const user = url.searchParams.get("user") || "";
    const doc = (await db.get("SELECT doc_image FROM money_kyc_docs WHERE user_id = ?", [user])) as { doc_image?: string } | undefined;
    if (!doc?.doc_image) return NextResponse.json({ error: "Aucune pièce" }, { status: 404 });
    // data URL ou base64 — renvoyé brut pour l'aperçu de review.
    return NextResponse.json({ ok: true, docImage: doc.doc_image });
  }

  if (view === "requests") {
    const status = url.searchParams.get("status") || "open";
    const rows = await db.all(`SELECT r.*, w.handle AS from_handle
       FROM money_requests r LEFT JOIN money_wallets w ON w.id = r.from_wallet_id
       WHERE r.status = ? ORDER BY r.created_at DESC LIMIT 300`, [status]);
    return NextResponse.json({
      ok: true,
      requests: (rows as Record<string, unknown>[]).map((r) => ({
        id: r.id, from: { userId: r.from_user_id, handle: r.from_handle ? `@${r.from_handle}` : null },
        to: r.to_identifier, currency: r.currency,
        amount: minorToMajorString(Number(r.amount_minor), String(r.currency) as "USD" | "CDF"),
        note: r.note, status: r.status, createdAt: r.created_at,
      })),
    });
  }

  // view=wallets — comportement existant + statistiques opérationnelles.
  const status = url.searchParams.get("status");
  const q = (url.searchParams.get("q") || "").trim();
  const wallets = await listWallets(300);
  const filtered = wallets.filter(
    (w) =>
      (!status || w.status === status) &&
      (!q ||
        w.handle === normalizeHandle(q) ||
        w.user_id === q ||
        w.id === q)
  );

  const count = async (sql: string, args: unknown[] = []) =>
    Number(((await db.get(sql, [args])) as { n?: number } | undefined)?.n ?? 0);
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const stats = {
    wallets: await count("SELECT COUNT(*) AS n FROM money_wallets"),
    frozen: await count("SELECT COUNT(*) AS n FROM money_wallets WHERE status = 'frozen'"),
    pendingTx: await count("SELECT COUNT(*) AS n FROM money_transactions WHERE status = 'pending'"),
    failedEvents: await count("SELECT COUNT(*) AS n FROM money_events WHERE signature_valid = 0 OR status = 'failed'"),
    kycPending: await count("SELECT COUNT(*) AS n FROM money_kyc WHERE status = 'pending'"),
    openRequests: await count("SELECT COUNT(*) AS n FROM money_requests WHERE status = 'open'"),
    volume24h: {
      USD: minorToMajorString(Number(((await db.get("SELECT COALESCE(SUM(amount_minor),0) AS n FROM money_transactions WHERE currency='USD' AND status='completed' AND completed_at > ?", [since24h])) as { n?: number })?.n ?? 0), "USD"),
      CDF: minorToMajorString(Number(((await db.get("SELECT COALESCE(SUM(amount_minor),0) AS n FROM money_transactions WHERE currency='CDF' AND status='completed' AND completed_at > ?", [since24h])) as { n?: number })?.n ?? 0), "CDF"),
    },
  };

  const out: Record<string, unknown> = {
    ok: true,
    stats,
    wallets: filtered.map((w) => ({
      id: w.id,
      userId: w.user_id,
      handle: w.handle ? `@${w.handle}` : null,
      status: w.status,
      hasPin: Boolean(w.pin_hash),
      createdAt: w.created_at,
      balances: {
        USD: { minor: w.balances.USD, display: minorToMajorString(w.balances.USD, "USD") },
        CDF: { minor: w.balances.CDF, display: minorToMajorString(w.balances.CDF, "CDF") },
      },
    })),
  };
  if (url.searchParams.get("audit") === "1") {
    out.recentAudit = await db.all(
      "SELECT user_id, wallet_id, action, detail, ip, created_at FROM money_audit ORDER BY id DESC LIMIT 100"
    );
  }
  return NextResponse.json(out);
  } catch (e) {
    return moneyError(e);
  }
}

/**
 * POST /api/admin/money — actions financières auditées.
 * {action:"freeze"|"unfreeze"|"close", walletId|userId|handle, reason}
 * {action:"kyc_approve"|"kyc_reject", userId, reason?}
 * {action:"reverse_withdrawal", txId, reason} — recrédit via écriture reversal
 */
export async function POST(req: Request) {
  const auth = await requireSection("billing");
  if (auth instanceof NextResponse) return auth;

  let body: {
    walletId?: string;
    userId?: string;
    handle?: string;
    txId?: string;
    action?: string;
    reason?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  // ── Review KYC ────────────────────────────────────────────────────
  if (body.action === "kyc_approve" || body.action === "kyc_reject") {
    if (!body.userId) return NextResponse.json({ error: "userId requis" }, { status: 400 });
    if (body.action === "kyc_reject" && !body.reason?.trim()) {
      return NextResponse.json({ error: "Motif obligatoire pour un rejet KYC" }, { status: 400 });
    }
    try {
      const db = await moneyDb();
      const kyc = (await db.get("SELECT user_id, status FROM money_kyc WHERE user_id = ?", [body.userId])) as
        { user_id: string; status: string } | undefined;
      if (!kyc) return NextResponse.json({ error: "Dossier KYC introuvable" }, { status: 404 });
      if (kyc.status !== "pending") {
        return NextResponse.json({ error: `Dossier déjà ${kyc.status}` }, { status: 409 });
      }
      const next = body.action === "kyc_approve" ? "verified" : "rejected";
      await db.run("UPDATE money_kyc SET status = ?, reviewed_at = ? WHERE user_id = ?", [next, new Date().toISOString(), body.userId]);
      await audit(auth.user.id, "", `admin_${body.action}`, {
        targetUser: body.userId,
        reason: body.reason?.trim() || null,
        admin: auth.user.email,
      });
      return NextResponse.json({ ok: true, userId: body.userId, status: next });
    } catch (e) {
      return moneyError(e);
    }
  }

  // ── Reversal d'un retrait échoué ──────────────────────────────────
  if (body.action === "reverse_withdrawal") {
    if (!body.txId || !body.reason?.trim()) {
      return NextResponse.json({ error: "txId et reason requis" }, { status: 400 });
    }
    try {
      const done = await reverseWithdrawal(body.txId, `admin: ${body.reason.trim()} (${auth.user.email})`);
      if (!done) {
        return NextResponse.json({ error: "Retrait non réversible (déjà soldé ou inexistant)" }, { status: 409 });
      }
      await audit(auth.user.id, "", "admin_reverse_withdrawal", {
        txId: body.txId, reason: body.reason.trim(), admin: auth.user.email,
      });
      return NextResponse.json({ ok: true, txId: body.txId, status: "reversed" });
    } catch (e) {
      return moneyError(e);
    }
  }

  // ── Gel / dégel / fermeture de portefeuille ───────────────────────
  const action = body.action === "freeze" ? "frozen" : body.action === "unfreeze" ? "active" : body.action === "close" ? "closed" : null;
  if (!action) {
    return NextResponse.json({ error: "action ∈ freeze | unfreeze | close | kyc_approve | kyc_reject | reverse_withdrawal" }, { status: 400 });
  }
  if (action !== "active" && !body.reason?.trim()) {
    return NextResponse.json({ error: "Un motif est obligatoire pour geler ou fermer" }, { status: 400 });
  }

  try {
  // Cible : walletId, userId ou @handle.
  let wallet = body.walletId
    ? await getWalletById(body.walletId)
    : body.userId
      ? await getWalletByUserId(body.userId)
      : null;
  if (!wallet && body.handle) {
    const db = await moneyDb();
    const row = (await db.get("SELECT * FROM money_wallets WHERE handle = ?", [
      normalizeHandle(body.handle),
    ])) as { id: string } | undefined;
    wallet = row ? await getWalletById(row.id) : null;
  }
  if (!wallet) {
    return NextResponse.json({ error: "Portefeuille introuvable" }, { status: 404 });
  }

  const updated = await setWalletStatus(wallet.id, action, body.reason?.trim());
  await audit(auth.user.id, wallet.id, `admin_${body.action}`, {
    targetUser: wallet.user_id,
    reason: body.reason?.trim() || null,
    admin: auth.user.email,
  });

  return NextResponse.json({
    ok: true,
    wallet: { id: updated.id, userId: updated.user_id, status: updated.status },
  });
  } catch (e) {
    return moneyError(e);
  }
}
