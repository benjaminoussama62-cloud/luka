/**
 * Ayeba Mbongo — fonctionnalités portefeuille étendues.
 * Conversion USD↔CDF, limites, KYC, reset PIN, demandes de paiement.
 */
import crypto from "crypto";
import { findUserById } from "@/lib/db";
import { verifyPassword } from "@/lib/auth-server";
import { moneyDb } from "./db";
import {
  MoneyError,
  audit,
  getOrCreateWallet,
  requirePin,
  resolveRecipient,
  setPin,
  type MoneyWallet,
} from "./core";
import {
  MAX_MINOR,
  minorToMajorString,
  type MoneyCurrency,
} from "./amounts";

function now() {
  return new Date().toISOString();
}
function id(prefix: string) {
  return `${prefix}_${crypto.randomBytes(9).toString("hex")}`;
}

// ── Conversion USD ↔ CDF ─────────────────────────────────────────

/** Taux CDF pour 1 USD — pilotable par env, jamais codé en dur côté client. */
export function usdCdfRate(): number {
  const n = Number(process.env.MBONGO_USD_CDF_RATE || "2800");
  return Number.isFinite(n) && n > 0 ? n : 2800;
}

export async function convertFunds(input: {
  userId: string;
  from: MoneyCurrency;
  amountMinor: number;
  pin: unknown;
  ip?: string;
  userAgent?: string;
}) {
  const d = await moneyDb();
  const wallet = await requirePin(input.userId, input.pin);
  const to: MoneyCurrency = input.from === "USD" ? "CDF" : "USD";
  const rate = usdCdfRate();
  // USD minor = cents (2 décimales), CDF minor = centimes. La conversion se
  // fait sur les montants majeurs puis repasse en minor de la devise cible.
  const outMinor =
    input.from === "USD"
      ? Math.round((input.amountMinor / 100) * rate * 100)
      : Math.round((input.amountMinor / 100 / rate) * 100);
  if (outMinor <= 0 || outMinor > MAX_MINOR[to]) {
    throw new MoneyError("amount_out_of_range", "Montant hors limites", 400);
  }

  const txId = id("mcv");
  await d.transaction(async (t) => {
    await t.run(
      `INSERT INTO money_transactions (id, kind, status, currency, amount_minor, from_wallet_id, to_wallet_id, meta, created_at)
       VALUES (?, 'transfer', 'completed', ?, ?, ?, ?, ?, ?)`,
      [
        txId, input.from, input.amountMinor, wallet.id, wallet.id,
        JSON.stringify({ conversion: true, to, outMinor, rate }),
        now(),
      ],
    );
    const r1 = await t.run(
      "UPDATE money_balances SET amount_minor = amount_minor - ?, updated_at = ? WHERE wallet_id = ? AND currency = ? AND amount_minor >= ?",
      [input.amountMinor, now(), wallet.id, input.from, input.amountMinor],
    );
    if (r1.changes === 0) throw new MoneyError("insufficient_funds", "Solde insuffisant", 402);
    const d1 = await t.get("SELECT amount_minor AS m FROM money_balances WHERE wallet_id = ? AND currency = ?", [wallet.id, input.from]) as { m: number };
    await t.run(
      "INSERT INTO money_entries (transaction_id, wallet_id, currency, delta_minor, balance_after_minor, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [txId, wallet.id, input.from, -input.amountMinor, Number(d1.m), now()],
    );
    await t.run(
      "INSERT INTO money_balances (wallet_id, currency, amount_minor, updated_at) VALUES (?, ?, 0, ?) ON CONFLICT(wallet_id, currency) DO NOTHING",
      [wallet.id, to, now()],
    );
    await t.run(
      "UPDATE money_balances SET amount_minor = amount_minor + ?, updated_at = ? WHERE wallet_id = ? AND currency = ?",
      [outMinor, now(), wallet.id, to],
    );
    const d2 = await t.get("SELECT amount_minor AS m FROM money_balances WHERE wallet_id = ? AND currency = ?", [wallet.id, to]) as { m: number };
    await t.run(
      "INSERT INTO money_entries (transaction_id, wallet_id, currency, delta_minor, balance_after_minor, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [txId, wallet.id, to, outMinor, Number(d2.m), now()],
    );
  });
  await audit(input.userId, wallet.id, "convert", {
    from: input.from, to, inMinor: input.amountMinor, outMinor, rate,
  }, input.ip || "", input.userAgent || "");
  return { txId, outMinor, rate, to };
}

// ── Limites (transparence, côté serveur) ─────────────────────────

export const LIMITS = {
  txMaxMinor: { USD: 10_000_00, CDF: 20_000_000_00 },
  dailyMinor: { USD: 25_000_00, CDF: 50_000_000_00 },
} as const;

export async function checkLimits(
  wallet: MoneyWallet,
  currency: MoneyCurrency,
  amountMinor: number,
): Promise<void> {
  if (amountMinor > LIMITS.txMaxMinor[currency]) {
    throw new MoneyError(
      "limit_tx",
      `Montant max par opération : ${minorToMajorString(LIMITS.txMaxMinor[currency], currency)} ${currency === "USD" ? "USD" : "FC"}`,
      400,
    );
  }
  const d = await moneyDb();
  const row = (await d.get(
    `SELECT COALESCE(SUM(amount_minor),0) AS s FROM money_transactions
     WHERE from_wallet_id = ? AND currency = ? AND kind = 'transfer'
       AND status IN ('pending','completed') AND created_at >= ?`,
    [wallet.id, currency, new Date(Date.now() - 86_400_000).toISOString()],
  )) as { s: number };
  if (Number(row.s) + amountMinor > LIMITS.dailyMinor[currency]) {
    throw new MoneyError(
      "limit_daily",
      `Plafond journalier atteint : ${minorToMajorString(LIMITS.dailyMinor[currency], currency)} ${currency === "USD" ? "USD" : "FC"}`,
      400,
    );
  }
}

// ── KYC ──────────────────────────────────────────────────────────

export async function getKyc(userId: string) {
  const d = await moneyDb();
  return (await d.get("SELECT * FROM money_kyc WHERE user_id = ?", [userId])) as
    | { full_name: string; birthdate: string; id_type: string; status: string }
    | undefined;
}

export async function submitKyc(input: {
  userId: string;
  fullName: string;
  birthdate: string;
  idType: string;
}) {
  const d = await moneyDb();
  await d.run(
    `INSERT INTO money_kyc (user_id, full_name, birthdate, id_type, status, submitted_at)
     VALUES (?, ?, ?, ?, 'pending', ?)
     ON CONFLICT(user_id) DO UPDATE SET full_name=excluded.full_name,
       birthdate=excluded.birthdate, id_type=excluded.id_type,
       status='pending', submitted_at=excluded.submitted_at`,
    [input.userId, input.fullName, input.birthdate, input.idType, now()],
  );
  return { status: "pending" };
}

// ── Reset PIN via mot de passe du compte ─────────────────────────

export async function resetPinWithPassword(input: {
  userId: string;
  password: string;
  newPin: string;
}) {
  const u = await findUserById(input.userId);
  if (!u) throw new MoneyError("no_user", "Compte introuvable", 404);
  const ok = u.passwordHash ? await verifyPassword(input.password, u.passwordHash) : false;
  if (!ok) throw new MoneyError("bad_password", "Mot de passe du compte incorrect", 403);
  await setPin(input.userId, input.newPin);
  const w = await getOrCreateWallet(input.userId);
  await audit(input.userId, w.id, "pin_reset_pwd", {});
}

// ── Demandes de paiement ─────────────────────────────────────────

export async function createRequest(input: {
  userId: string;
  to: string;
  amountMinor: number;
  currency: MoneyCurrency;
  note?: string;
}) {
  const wallet = await getOrCreateWallet(input.userId);
  const recipient = await resolveRecipient(input.to);
  if (!recipient) {
    throw new MoneyError("recipient_not_found", "Destinataire introuvable", 404);
  }
  if (recipient.wallet.id === wallet.id) {
    throw new MoneyError("self_request", "Impossible de se demander à soi-même");
  }
  const d = await moneyDb();
  const rid = id("mrq");
  await d.run(
    `INSERT INTO money_requests (id, from_user_id, from_wallet_id, to_identifier, to_user_id, to_wallet_id, currency, amount_minor, note, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
    [
      rid, input.userId, wallet.id, input.to.slice(0, 120),
      recipient.userId, recipient.wallet.id, input.currency,
      input.amountMinor, (input.note || "").slice(0, 160), now(),
    ],
  );
  await audit(input.userId, wallet.id, "request_create", { rid, to: input.to, amountMinor: input.amountMinor, currency: input.currency });
  return rid;
}

export async function listRequests(userId: string) {
  const d = await moneyDb();
  const wallet = await getOrCreateWallet(userId);
  const rows = (await d.all(
    `SELECT * FROM money_requests WHERE (from_user_id = ? OR to_user_id = ?)
       AND status = 'open' ORDER BY created_at DESC LIMIT 50`,
    [userId, userId],
  )) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    direction: String(r.from_user_id) === userId ? "out" : "in",
    fromUserId: String(r.from_user_id),
    toIdentifier: String(r.to_identifier),
    currency: String(r.currency) as MoneyCurrency,
    amountMinor: Number(r.amount_minor),
    note: String(r.note || ""),
    createdAt: String(r.created_at),
    mine: String(r.from_wallet_id) === wallet.id,
  }));
}

export async function resolveRequest(input: {
  userId: string;
  requestId: string;
  action: "pay" | "decline" | "cancel";
  pin?: unknown;
  idemKey?: string;
  ip?: string;
  userAgent?: string;
}) {
  const d = await moneyDb();
  const r = (await d.get("SELECT * FROM money_requests WHERE id = ?", [input.requestId])) as
    | Record<string, unknown> | undefined;
  if (!r) throw new MoneyError("not_found", "Demande introuvable", 404);
  if (String(r.status) !== "open") {
    throw new MoneyError("closed", "Cette demande est déjà clôturée", 409);
  }
  const isPayer = String(r.to_user_id) === input.userId;
  const isAsker = String(r.from_user_id) === input.userId;

  if (input.action === "cancel") {
    if (!isAsker) throw new MoneyError("forbidden", "Action réservée au demandeur", 403);
    await d.run("UPDATE money_requests SET status='cancelled', resolved_at=? WHERE id=?", [now(), input.requestId]);
    return { status: "cancelled" };
  }
  if (input.action === "decline") {
    if (!isPayer) throw new MoneyError("forbidden", "Action réservée au destinataire", 403);
    await d.run("UPDATE money_requests SET status='declined', resolved_at=? WHERE id=?", [now(), input.requestId]);
    return { status: "declined" };
  }
  if (!isPayer) throw new MoneyError("forbidden", "Seul le destinataire peut payer", 403);

  // Paiement : transfert direct payer → demandeur (le ledger reste la source).
  const { executeTransfer } = await import("./core");
  const { tx } = await executeTransfer({
    userId: input.userId,
    to: String(r.from_user_id) === input.userId ? "" : `user:${r.from_user_id}`,
    amountMinor: Number(r.amount_minor),
    currency: String(r.currency) as MoneyCurrency,
    pin: input.pin,
    idemKey: input.idemKey || `req-${input.requestId}`,
    meta: { requestId: input.requestId },
    ip: input.ip,
    userAgent: input.userAgent,
  });
  await d.run("UPDATE money_requests SET status='paid', tx_id=?, resolved_at=? WHERE id=?", [tx.id, now(), input.requestId]);
  return { status: "paid", txId: tx.id };
}
