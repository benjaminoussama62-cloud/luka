/**
 * Ayeba Money — moteur du grand livre (100% async).
 *
 * Invariants garantis par le code :
 *  1. Aucun solde ne peut devenir négatif (UPDATE gardé + CHECK >= 0).
 *  2. Chaque mouvement de solde s'accompagne d'écritures money_entries dans
 *     la MÊME transaction → un solde est toujours re-calculable.
 *  3. Une clé d'idempotence ne produit qu'un seul mouvement ; un webhook
 *     provider n'est appliqué qu'une fois (UNIQUE sur money_events).
 *  4. Tout mouvement interne exige un PIN valide (vérifié avant la mutation,
 *     verrouillage progressif persisté).
 *  5. Les échecs provider ne laissent jamais de fonds bloqués :
 *     withdrawal = débit + pending → échec → reversal automatique.
 *  6. Toutes les transactions sont sérialisées par adapter (file d'attente)
 *     → pas d'entrelacement de writers même en async.
 *
 * Les appels réseau provider ne sont JAMAIS faits à l'intérieur d'une
 * transaction DB (un lock écriture ne doit pas attendre le réseau).
 */
import { createHmac } from "node:crypto";
import { findUserByEmail } from "@/lib/db";
import { signingSecret } from "@/lib/security/sign";
import { moneyDb, MoneyStorageError, TxRollback, type MoneyDb, type MoneyRow } from "./db";
import {
  checkPin,
  hashPin,
  isValidPinFormat,
  PIN_MAX_FREE_ATTEMPTS,
  pinFailureUpdate,
  pinLockState,
} from "./pin";
import { MONEY_CURRENCIES, type MoneyCurrency } from "./amounts";
import {
  notifyDepositResult,
  notifyPinChanged,
  notifyPinLocked,
  notifyTransferReceived,
  notifyTransferSent,
  notifyWalletStatus,
  notifyWithdrawalResult,
} from "./notify";

export class MoneyError extends Error {
  status: number;
  code: string;
  retryAfterSec?: number;
  constructor(code: string, message: string, status = 400, retryAfterSec?: number) {
    super(message);
    this.name = "MoneyError";
    this.code = code;
    this.status = status;
    this.retryAfterSec = retryAfterSec;
  }
}

export type MoneyTxKind = "transfer" | "deposit" | "withdrawal" | "reversal";
export type MoneyTxStatus = "pending" | "completed" | "failed" | "reversed";

export type MoneyWallet = {
  id: string;
  user_id: string;
  handle: string | null;
  pin_hash: string;
  pin_attempts: number;
  pin_lock_level: number;
  pin_locked_until: string | null;
  status: "active" | "frozen" | "closed";
  created_at: string;
  updated_at: string;
};

export type MoneyTransaction = {
  id: string;
  kind: MoneyTxKind;
  status: MoneyTxStatus;
  currency: MoneyCurrency;
  amount_minor: number;
  from_wallet_id: string | null;
  to_wallet_id: string | null;
  parent_id: string | null;
  provider: string | null;
  provider_ref: string | null;
  checkout_url: string | null;
  meta: string;
  created_at: string;
  completed_at: string | null;
};

const now = () => new Date().toISOString();
const txId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;

/** La couche DB ou une erreur 503 explicite — jamais de ledger simulé. */
async function db(): Promise<MoneyDb> {
  try {
    return await moneyDb();
  } catch (e) {
    if (e instanceof MoneyStorageError) {
      throw new MoneyError("storage_unavailable", "Service Money temporairement indisponible", 503);
    }
    throw e;
  }
}

// ── Wallets ─────────────────────────────────────────────────────────

export async function getWalletByUserId(userId: string): Promise<MoneyWallet | null> {
  const row = await (await db()).get("SELECT * FROM money_wallets WHERE user_id = ?", [userId]);
  return (row as MoneyWallet | undefined) ?? null;
}

export async function getWalletById(id: string): Promise<MoneyWallet | null> {
  const row = await (await db()).get("SELECT * FROM money_wallets WHERE id = ?", [id]);
  return (row as MoneyWallet | undefined) ?? null;
}

export async function getOrCreateWallet(userId: string): Promise<MoneyWallet> {
  const existing = await getWalletByUserId(userId);
  if (existing) return existing;
  const id = txId("wal");
  const ts = now();
  const d = await db();
  try {
    await d.run("INSERT INTO money_wallets (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)", [id, userId, ts, ts]);
    for (const currency of MONEY_CURRENCIES) {
      await d.run(
        "INSERT INTO money_balances (wallet_id, currency, amount_minor, updated_at) VALUES (?, ?, 0, ?)",
        [id, currency, ts],
      );
    }
  } catch {
    // Course simultanée à la création : la ligne gagnante existe déjà.
  }
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new MoneyError("wallet_error", "Portefeuille indisponible", 500);
  return wallet;
}

export async function getBalances(walletId: string): Promise<Record<MoneyCurrency, number>> {
  const rows = (await (await db()).all(
    "SELECT currency, amount_minor FROM money_balances WHERE wallet_id = ?",
    [walletId],
  )) as Array<{ currency: MoneyCurrency; amount_minor: number }>;
  const out: Record<MoneyCurrency, number> = { USD: 0, CDF: 0 };
  for (const r of rows) out[r.currency] = Number(r.amount_minor) || 0;
  return out;
}

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

export async function claimHandle(userId: string, rawHandle: string): Promise<string> {
  const handle = normalizeHandle(rawHandle);
  if (!HANDLE_RE.test(handle)) {
    throw new MoneyError(
      "invalid_handle",
      "Adresse invalide — 3 à 20 caractères : lettres minuscules, chiffres, _",
    );
  }
  const wallet = await getOrCreateWallet(userId);
  assertWalletUsable(wallet);
  const taken = (await (await db()).get(
    "SELECT user_id FROM money_wallets WHERE handle = ?",
    [handle],
  )) as { user_id: string } | undefined;
  if (taken && taken.user_id !== userId) {
    throw new MoneyError("handle_taken", "Cette adresse est déjà prise", 409);
  }
  await (await db()).run(
    "UPDATE money_wallets SET handle = ?, updated_at = ? WHERE id = ?",
    [handle, now(), wallet.id],
  );
  return handle;
}

function assertWalletUsable(wallet: MoneyWallet) {
  if (wallet.status === "frozen") {
    throw new MoneyError("wallet_frozen", "Portefeuille gelé — contactez le support", 403);
  }
  if (wallet.status === "closed") {
    throw new MoneyError("wallet_closed", "Portefeuille fermé", 403);
  }
}

/** Gel/dégel administrateur — audité, notification envoyée au titulaire. */
export async function setWalletStatus(
  walletId: string,
  status: "active" | "frozen" | "closed",
  reason?: string,
): Promise<MoneyWallet> {
  const wallet = await getWalletById(walletId);
  if (!wallet) throw new MoneyError("not_found", "Portefeuille introuvable", 404);
  await (await db()).run(
    "UPDATE money_wallets SET status = ?, updated_at = ? WHERE id = ?",
    [status, now(), walletId],
  );
  const updated = (await getWalletById(walletId))!;
  if (updated.status !== wallet.status) {
    notifyWalletStatus(wallet.user_id, walletId, status, reason);
  }
  return updated;
}

export async function listWallets(limit = 200): Promise<Array<MoneyWallet & { balances: Record<MoneyCurrency, number> }>> {
  const rows = (await (await db()).all(
    "SELECT * FROM money_wallets ORDER BY created_at DESC LIMIT ?",
    [Math.min(limit, 500)],
  )) as MoneyWallet[];
  const out = [] as Array<MoneyWallet & { balances: Record<MoneyCurrency, number> }>;
  for (const w of rows) out.push({ ...w, balances: await getBalances(w.id) });
  return out;
}

// ── Audit ───────────────────────────────────────────────────────────

export async function audit(
  userId: string,
  walletId: string,
  action: string,
  detail: Record<string, unknown> = {},
  ip = "",
  userAgent = "",
) {
  try {
    await (await db()).run(
      "INSERT INTO money_audit (user_id, wallet_id, action, detail, ip, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [userId, walletId, action, JSON.stringify(detail).slice(0, 4000), ip.slice(0, 64), userAgent.slice(0, 256), now()],
    );
  } catch (e) {
    console.warn("[money] audit write failed:", (e as Error).message);
  }
}

export async function listAudit(limit = 100): Promise<MoneyRow[]> {
  return (await db()).all(
    "SELECT * FROM money_audit ORDER BY id DESC LIMIT ?",
    [Math.min(limit, 500)],
  ) as Promise<MoneyRow[]>;
}

// ── PIN ─────────────────────────────────────────────────────────────

export async function setPin(userId: string, pin: string, currentPin?: string) {
  if (!isValidPinFormat(pin)) {
    throw new MoneyError("invalid_pin", "Le PIN doit contenir exactement 4 chiffres");
  }
  const wallet = await getOrCreateWallet(userId);
  assertWalletUsable(wallet);
  if (wallet.pin_hash) {
    // Changement de PIN : le PIN actuel est exigé (sinon session volée = PIN écrasé).
    if (!currentPin || !(await checkPin(userId, currentPin, wallet.pin_hash))) {
      await registerPinFailure(wallet);
      throw new MoneyError("pin_required", "PIN actuel incorrect", 403);
    }
  }
  await (await db()).run(
    "UPDATE money_wallets SET pin_hash = ?, pin_attempts = 0, pin_lock_level = 0, pin_locked_until = NULL, updated_at = ? WHERE id = ?",
    [await hashPin(userId, pin), now(), wallet.id],
  );
  notifyPinChanged(userId, wallet.id, Boolean(wallet.pin_hash));
  return (await getWalletByUserId(userId))!;
}

async function registerPinFailure(wallet: MoneyWallet) {
  const upd = pinFailureUpdate(wallet);
  await (await db()).run(
    "UPDATE money_wallets SET pin_attempts = ?, pin_lock_level = ?, pin_locked_until = ?, updated_at = ? WHERE id = ?",
    [upd.pin_attempts, upd.pin_lock_level, upd.pin_locked_until, now(), wallet.id],
  );
}

/**
 * Vérifie le PIN d'un wallet actif. Réinitialise les compteurs en cas de
 * succès ; incrémente + verrouille progressivement en cas d'échec.
 */
export async function requirePin(userId: string, pin: unknown): Promise<MoneyWallet> {
  const wallet = await getOrCreateWallet(userId);
  assertWalletUsable(wallet);
  if (!wallet.pin_hash) {
    throw new MoneyError("pin_not_set", "Définissez d'abord votre code PIN", 428);
  }
  const lock = pinLockState(wallet);
  if (lock.locked) {
    throw new MoneyError(
      "pin_locked",
      `Trop d'essais — réessayez dans ${lock.retryAfterSec}s`,
      429,
      lock.retryAfterSec,
    );
  }
  if (!isValidPinFormat(pin) || !(await checkPin(userId, pin, wallet.pin_hash))) {
    await registerPinFailure(wallet);
    const updated = await getWalletById(wallet.id);
    if (updated) {
      const newLock = pinLockState(updated);
      if (newLock.locked) notifyPinLocked(userId, wallet.id, newLock.retryAfterSec);
    }
    const remaining = Math.max(0, PIN_MAX_FREE_ATTEMPTS - (wallet.pin_attempts + 1));
    await audit(userId, wallet.id, "pin_fail", { remaining });
    throw new MoneyError(
      "pin_invalid",
      remaining > 0
        ? `PIN incorrect (${remaining} essai${remaining > 1 ? "s" : ""})`
        : "PIN incorrect — compte temporairement verrouillé",
      403,
    );
  }
  if (wallet.pin_attempts > 0 || wallet.pin_lock_level > 0) {
    await (await db()).run(
      "UPDATE money_wallets SET pin_attempts = 0, pin_lock_level = 0, pin_locked_until = NULL, updated_at = ? WHERE id = ?",
      [now(), wallet.id],
    );
  }
  return (await getWalletByUserId(userId))!;
}

// ── Destinataires ───────────────────────────────────────────────────

export type Recipient = { userId: string; wallet: MoneyWallet; label: string };

/**
 * Résout "@pseudo" (adresse Money), un email Ayeba, ou un téléphone lié à un
 * compte Ayeba Mail. Le wallet destinataire est créé à la volée si besoin —
 * recevoir n'exige pas de PIN.
 */
export async function resolveRecipient(identifier: string): Promise<Recipient | null> {
  const id = identifier.trim();
  if (!id) return null;
  const d = await db();

  if (id.startsWith("@") || HANDLE_RE.test(normalizeHandle(id))) {
    const row = (await d.get("SELECT * FROM money_wallets WHERE handle = ?", [
      normalizeHandle(id),
    ])) as MoneyWallet | undefined;
    if (row) return { userId: row.user_id, wallet: row, label: `@${row.handle}` };
    if (!id.includes("@") || id.startsWith("@")) return null; // @pseudo pur introuvable
  }

  if (id.includes("@") && !id.startsWith("@")) {
    const user = await findUserByEmail(id.toLowerCase());
    if (user) {
      const wallet = await getOrCreateWallet(user.id);
      return { userId: user.id, wallet, label: user.email };
    }
  }

  const phone = id.replace(/[\s\-()]/g, "");
  if (/^\+?\d{8,15}$/.test(phone)) {
    const acc = (await d.get(
      "SELECT user_id FROM mail_accounts WHERE phone = ? OR phone = ?",
      [phone, phone.replace(/^\+/, "")],
    )) as { user_id: string } | undefined;
    if (acc) {
      const wallet = await getOrCreateWallet(acc.user_id);
      return { userId: acc.user_id, wallet, label: phone };
    }
  }
  return null;
}

// ── Idempotence client ──────────────────────────────────────────────

function requestHash(payload: unknown): string {
  return createHmac("sha256", signingSecret())
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 32);
}

type IdemRow = { request_hash: string; transaction_id: string };

/** Avant mutation : rejoue la même requête → transaction déjà créée. */
async function idemLookup(
  d: MoneyDb,
  userId: string,
  endpoint: string,
  key: string,
  payload: unknown,
): Promise<{ replayTxId: string | null; conflict: boolean }> {
  const row = (await d.get(
    "SELECT request_hash, transaction_id FROM money_idem WHERE user_id = ? AND endpoint = ? AND key = ?",
    [userId, endpoint, key],
  )) as IdemRow | undefined;
  if (!row) return { replayTxId: null, conflict: false };
  if (row.request_hash !== requestHash(payload)) return { replayTxId: null, conflict: true };
  return { replayTxId: row.transaction_id || null, conflict: false };
}

async function idemStore(
  d: MoneyDb,
  userId: string,
  endpoint: string,
  key: string,
  payload: unknown,
  transactionId: string,
) {
  await d.run(
    "INSERT OR REPLACE INTO money_idem (user_id, endpoint, key, request_hash, transaction_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, endpoint, key.slice(0, 128), requestHash(payload), transactionId, now()],
  );
}

/** Rejeu post-rollback : si la requête gagnante a commité, servir sa tx. */
async function idemReplay(
  userId: string,
  endpoint: string,
  key: string,
  payload: unknown,
): Promise<MoneyTransaction | null> {
  const retry = await idemLookup(await db(), userId, endpoint, key, payload);
  return retry.replayTxId ? getTransactionOrThrow(retry.replayTxId) : null;
}

// ── Grand livre ─────────────────────────────────────────────────────

async function getTransaction(id: string): Promise<MoneyTransaction | null> {
  const row = await (await db()).get("SELECT * FROM money_transactions WHERE id = ?", [id]);
  return (row as MoneyTransaction | undefined) ?? null;
}

export async function getTransactionOrThrow(id: string): Promise<MoneyTransaction> {
  const tx = await getTransaction(id);
  if (!tx) throw new MoneyError("not_found", "Transaction introuvable", 404);
  return tx;
}

async function insertEntry(
  d: MoneyDb,
  transactionId: string,
  walletId: string,
  currency: MoneyCurrency,
  delta: number,
  balanceAfter: number,
) {
  await d.run(
    "INSERT INTO money_entries (transaction_id, wallet_id, currency, delta_minor, balance_after_minor, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [transactionId, walletId, currency, delta, balanceAfter, now()],
  );
}

/**
 * Débit gardé : réussit SEULEMENT si le solde couvre le montant.
 * `changes === 0` → solde insuffisant. CHECK >= 0 en garde-fou structurel.
 */
async function debitBalance(
  d: MoneyDb,
  walletId: string,
  currency: MoneyCurrency,
  amount: number,
): Promise<number> {
  const res = await d.run(
    "UPDATE money_balances SET amount_minor = amount_minor - ?, updated_at = ? WHERE wallet_id = ? AND currency = ? AND amount_minor >= ?",
    [amount, now(), walletId, currency, amount],
  );
  if (res.changes === 0) {
    throw new MoneyError("insufficient_funds", "Solde insuffisant", 402);
  }
  const row = (await d.get(
    "SELECT amount_minor FROM money_balances WHERE wallet_id = ? AND currency = ?",
    [walletId, currency],
  )) as { amount_minor: number };
  return Number(row.amount_minor);
}

async function creditBalance(
  d: MoneyDb,
  walletId: string,
  currency: MoneyCurrency,
  amount: number,
): Promise<number> {
  await d.run(
    "INSERT INTO money_balances (wallet_id, currency, amount_minor, updated_at) VALUES (?, ?, 0, ?) ON CONFLICT(wallet_id, currency) DO NOTHING",
    [walletId, currency, now()],
  );
  await d.run(
    "UPDATE money_balances SET amount_minor = amount_minor + ?, updated_at = ? WHERE wallet_id = ? AND currency = ?",
    [amount, now(), walletId, currency],
  );
  const row = (await d.get(
    "SELECT amount_minor FROM money_balances WHERE wallet_id = ? AND currency = ?",
    [walletId, currency],
  )) as { amount_minor: number };
  return Number(row.amount_minor);
}

// ── Transfert interne (zéro frais, instantané) ──────────────────────

export async function executeTransfer(input: {
  userId: string;
  to: string;
  amountMinor: number;
  currency: MoneyCurrency;
  pin: unknown;
  idemKey: string;
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}): Promise<{ tx: MoneyTransaction; replayed: boolean }> {
  const { userId, currency, amountMinor } = input;
  const d = await db();
  const idemPayload = { to: input.to, amountMinor, currency };

  // Rejeu : même clé + même charge utile → la transaction d'origine.
  const idem = await idemLookup(d, userId, "transfer", input.idemKey, idemPayload);
  if (idem.conflict) {
    throw new MoneyError("idem_conflict", "Clé d'idempotence réutilisée avec des paramètres différents", 409);
  }
  if (idem.replayTxId) {
    return { tx: await getTransactionOrThrow(idem.replayTxId), replayed: true };
  }

  const sender = await requirePin(userId, input.pin);
  const recipient = await resolveRecipient(input.to);
  if (!recipient) {
    throw new MoneyError("recipient_not_found", "Destinataire introuvable — @adresse, email ou téléphone Ayeba", 404);
  }
  if (recipient.wallet.id === sender.id) {
    throw new MoneyError("self_transfer", "Impossible de s'envoyer de l'argent à soi-même");
  }
  assertWalletUsable(recipient.wallet);

  const id = txId("mtx");
  try {
    await d.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO money_transactions (id, kind, status, currency, amount_minor, from_wallet_id, to_wallet_id, idem_key, meta, created_at)
         VALUES (?, 'transfer', 'pending', ?, ?, ?, ?, ?, ?, ?)`,
        [id, currency, amountMinor, sender.id, recipient.wallet.id, input.idemKey.slice(0, 128), JSON.stringify(input.meta ?? {}), now()],
      );
      const afterDebit = await debitBalance(tx, sender.id, currency, amountMinor);
      await insertEntry(tx, id, sender.id, currency, -amountMinor, afterDebit);
      const afterCredit = await creditBalance(tx, recipient.wallet.id, currency, amountMinor);
      await insertEntry(tx, id, recipient.wallet.id, currency, amountMinor, afterCredit);
      await tx.run("UPDATE money_transactions SET status = 'completed', completed_at = ? WHERE id = ?", [now(), id]);
      await idemStore(tx, userId, "transfer", input.idemKey, idemPayload, id);
    });
  } catch (e) {
    // Concurrence même clé : la gagnante a commité → rejouer sa transaction.
    const replay = await idemReplay(userId, "transfer", input.idemKey, idemPayload);
    if (replay) return { tx: replay, replayed: true };
    throw e;
  }

  await audit(
    userId,
    sender.id,
    "transfer",
    { tx: id, to: recipient.label, amount_minor: amountMinor, currency },
    input.ip,
    input.userAgent,
  );
  notifyTransferSent(userId, sender.id, { amountMinor, currency, to: recipient.label, txId: id });
  notifyTransferReceived(recipient.userId, recipient.wallet.id, {
    amountMinor,
    currency,
    from: sender.handle ? `@${sender.handle}` : "un compte Ayeba",
    txId: id,
  });
  return { tx: await getTransactionOrThrow(id), replayed: false };
}

// ── Dépôt (provider → webhook crédite) ──────────────────────────────

export async function createDepositIntent(input: {
  userId: string;
  amountMinor: number;
  currency: MoneyCurrency;
  phone: string;
  idemKey: string;
  ip?: string;
  userAgent?: string;
}): Promise<{ tx: MoneyTransaction; replayed: boolean }> {
  const d = await db();
  const idemPayload = { amountMinor: input.amountMinor, currency: input.currency, phone: input.phone };
  const idem = await idemLookup(d, input.userId, "deposit", input.idemKey, idemPayload);
  if (idem.conflict) {
    throw new MoneyError("idem_conflict", "Clé d'idempotence réutilisée avec des paramètres différents", 409);
  }
  if (idem.replayTxId) return { tx: await getTransactionOrThrow(idem.replayTxId), replayed: true };

  const wallet = await getOrCreateWallet(input.userId);
  assertWalletUsable(wallet);
  const id = txId("mdep");
  try {
    await d.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO money_transactions (id, kind, status, currency, amount_minor, to_wallet_id, idem_key, meta, created_at)
         VALUES (?, 'deposit', 'pending', ?, ?, ?, ?, ?, ?)`,
        [id, input.currency, input.amountMinor, wallet.id, input.idemKey.slice(0, 128), JSON.stringify({ phone: input.phone }), now()],
      );
      await idemStore(tx, input.userId, "deposit", input.idemKey, idemPayload, id);
    });
  } catch (e) {
    const replay = await idemReplay(input.userId, "deposit", input.idemKey, idemPayload);
    if (replay) return { tx: replay, replayed: true };
    throw e;
  }
  await audit(input.userId, wallet.id, "deposit_init", { tx: id, amount_minor: input.amountMinor, currency: input.currency }, input.ip, input.userAgent);
  return { tx: await getTransactionOrThrow(id), replayed: false };
}

export async function attachProviderToTx(id: string, provider: string, providerRef: string, checkoutUrl?: string) {
  await (await db()).run(
    "UPDATE money_transactions SET provider = ?, provider_ref = ?, checkout_url = ? WHERE id = ?",
    [provider, providerRef, checkoutUrl ?? null, id],
  );
}

export async function failPendingTx(id: string, reason: string) {
  const tx = await getTransaction(id);
  if (!tx || tx.status !== "pending") return;
  await (await db()).run(
    "UPDATE money_transactions SET status = 'failed', meta = json_set(meta, '$.fail_reason', ?), completed_at = ? WHERE id = ?",
    [reason.slice(0, 500), now(), id],
  );
}

// ── Retrait (hold → provider → settle ou reversal) ──────────────────

export async function createWithdrawal(input: {
  userId: string;
  amountMinor: number;
  currency: MoneyCurrency;
  phone: string;
  pin: unknown;
  idemKey: string;
  ip?: string;
  userAgent?: string;
}): Promise<{ tx: MoneyTransaction; replayed: boolean }> {
  const d = await db();
  const idemPayload = { amountMinor: input.amountMinor, currency: input.currency, phone: input.phone };
  const idem = await idemLookup(d, input.userId, "withdraw", input.idemKey, idemPayload);
  if (idem.conflict) {
    throw new MoneyError("idem_conflict", "Clé d'idempotence réutilisée avec des paramètres différents", 409);
  }
  if (idem.replayTxId) return { tx: await getTransactionOrThrow(idem.replayTxId), replayed: true };

  const wallet = await requirePin(input.userId, input.pin);

  // Hold : débit immédiat + transaction pending. Si le provider échoue,
  // reverseWithdrawal() recrédite via une transaction 'reversal' — jamais
  // de fonds perdus ni bloqués.
  const id = txId("mwd");
  try {
    await d.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO money_transactions (id, kind, status, currency, amount_minor, from_wallet_id, idem_key, meta, created_at)
         VALUES (?, 'withdrawal', 'pending', ?, ?, ?, ?, ?, ?)`,
        [id, input.currency, input.amountMinor, wallet.id, input.idemKey.slice(0, 128), JSON.stringify({ phone: input.phone }), now()],
      );
      const after = await debitBalance(tx, wallet.id, input.currency, input.amountMinor);
      await insertEntry(tx, id, wallet.id, input.currency, -input.amountMinor, after);
      await idemStore(tx, input.userId, "withdraw", input.idemKey, idemPayload, id);
    });
  } catch (e) {
    const replay = await idemReplay(input.userId, "withdraw", input.idemKey, idemPayload);
    if (replay) return { tx: replay, replayed: true };
    throw e;
  }
  await audit(input.userId, wallet.id, "withdraw_init", { tx: id, amount_minor: input.amountMinor, currency: input.currency, phone: input.phone }, input.ip, input.userAgent);
  return { tx: await getTransactionOrThrow(id), replayed: false };
}

/**
 * Recrédit d'un retrait échoué — À APPELER DANS UNE TRANSACTION OUVERTE.
 * Crée la transaction 'reversal' + l'écriture de crédit + marque le parent
 * 'reversed'. Réversible une seule fois par construction (le parent ne peut
 * passer qu'une fois de pending à reversed).
 */
async function applyWithdrawalReversal(
  tx: MoneyDb,
  parent: MoneyTransaction,
  reason: string,
): Promise<string> {
  const walletId = parent.from_wallet_id;
  if (!walletId) throw new MoneyError("internal", "Retrait sans wallet source", 500);
  const id = txId("mrev");
  await tx.run(
    `INSERT INTO money_transactions (id, kind, status, currency, amount_minor, to_wallet_id, parent_id, meta, created_at, completed_at)
     VALUES (?, 'reversal', 'completed', ?, ?, ?, ?, ?, ?, ?)`,
    [id, parent.currency, parent.amount_minor, walletId, parent.id, JSON.stringify({ reason: reason.slice(0, 500) }), now(), now()],
  );
  const after = await creditBalance(tx, walletId, parent.currency, parent.amount_minor);
  await insertEntry(tx, id, walletId, parent.currency, parent.amount_minor, after);
  await tx.run("UPDATE money_transactions SET status = 'reversed', completed_at = ? WHERE id = ?", [now(), parent.id]);
  return id;
}

/**
 * Recrédite un retrait dont le payout a échoué (appel synchrone provider ou
 * réconciliation manuelle). Ne fait rien si la transaction n'est plus pending.
 */
export async function reverseWithdrawal(parentId: string, reason: string): Promise<boolean> {
  const d = await db();
  const parent = await getTransaction(parentId);
  if (!parent || parent.kind !== "withdrawal" || parent.status !== "pending") return false;

  let reversalId = "";
  const applied = await d.transaction(async (tx) => {
    // Re-lire sous le lock : un webhook peut avoir tranché entre-temps.
    const fresh = (await tx.get("SELECT status FROM money_transactions WHERE id = ?", [parentId])) as
      | { status: MoneyTxStatus }
      | undefined;
    if (!fresh || fresh.status !== "pending") throw new TxRollback(false);
    reversalId = await applyWithdrawalReversal(tx, parent, reason);
    return true;
  });
  if (!applied) return false;
  await audit("", parent.from_wallet_id ?? "", "withdraw_reversed", { tx: parentId, reversal: reversalId, reason });
  if (parent.from_wallet_id) {
    const wallet = await getWalletById(parent.from_wallet_id);
    if (wallet) {
      notifyWithdrawalResult(wallet.user_id, wallet.id, {
        amountMinor: parent.amount_minor,
        currency: parent.currency,
        ok: false,
        txId: parentId,
      });
    }
  }
  return true;
}

// ── Réconciliation webhook ──────────────────────────────────────────

/**
 * Applique un outcome provider VÉRIFIÉ à une transaction Money.
 * Idempotent : UNIQUE(provider, event_id) sur money_events rejette les
 * livraisons répétées, ET le statut est re-vérifié SOUS LE LOCK — deux
 * webhooks concurrents (event_ids différents, même tx) ne peuvent jamais
 * créditer deux fois.
 */
export async function reconcileMoneyWebhook(input: {
  provider: string;
  eventId: string;
  transactionId: string;
  status: "paid" | "failed";
  rawPayload: string;
}): Promise<boolean> {
  const d = await db();
  const tx = await getTransaction(input.transactionId);
  if (!tx || (tx.kind !== "deposit" && tx.kind !== "withdrawal")) return false;
  if (tx.status !== "pending") {
    // Transaction déjà tranchée — on enregistre quand même l'événement pour
    // la traçabilité, sans toucher aux soldes.
    try {
      await d.run(
        "INSERT INTO money_events (provider, event_id, transaction_id, status, payload, processed_at) VALUES (?, ?, ?, ?, ?, ?)",
        [input.provider, input.eventId, tx.id, input.status, input.rawPayload.slice(0, 16_000), now()],
      );
    } catch {
      /* doublon — ignoré */
    }
    return false;
  }

  let applied = false;
  try {
    applied = await d.transaction(async (trx) => {
      // Re-lecture sous le lock : le statut lu ci-dessus peut être périmé.
      const cur = (await trx.get("SELECT status FROM money_transactions WHERE id = ?", [tx.id])) as
        | { status: MoneyTxStatus }
        | undefined;
      if (!cur || cur.status !== "pending") throw new TxRollback(false);

      await trx.run(
        "INSERT INTO money_events (provider, event_id, transaction_id, status, payload, processed_at) VALUES (?, ?, ?, ?, ?, ?)",
        [input.provider, input.eventId, tx.id, input.status, input.rawPayload.slice(0, 16_000), now()],
      );

      if (input.status === "paid" && tx.kind === "deposit" && tx.to_wallet_id) {
        const after = await creditBalance(trx, tx.to_wallet_id, tx.currency, tx.amount_minor);
        await insertEntry(trx, tx.id, tx.to_wallet_id, tx.currency, tx.amount_minor, after);
        await trx.run("UPDATE money_transactions SET status = 'completed', completed_at = ? WHERE id = ?", [now(), tx.id]);
      } else if (input.status === "paid" && tx.kind === "withdrawal") {
        await trx.run("UPDATE money_transactions SET status = 'completed', completed_at = ? WHERE id = ?", [now(), tx.id]);
      } else if (tx.kind === "withdrawal") {
        // Échec du payout : reversal + recrédit DANS LA MÊME transaction —
        // le statut et le solde ne peuvent jamais diverger.
        await applyWithdrawalReversal(trx, tx, `provider ${input.provider} a échoué le payout`);
      } else {
        // Dépôt échoué : rien n'a jamais été crédité.
        await trx.run("UPDATE money_transactions SET status = 'failed', completed_at = ? WHERE id = ?", [now(), tx.id]);
      }
      return true;
    });
  } catch (e) {
    const msg = (e as Error).message || "";
    if (msg.includes("UNIQUE")) return false; // événement déjà traité
    throw e;
  }
  if (!applied) return false;

  await audit("", tx.from_wallet_id ?? tx.to_wallet_id ?? "", "webhook_apply", {
    tx: tx.id,
    provider: input.provider,
    status: input.status,
  });
  const affectedWalletId = tx.kind === "deposit" ? tx.to_wallet_id : tx.from_wallet_id;
  if (affectedWalletId) {
    const wallet = await getWalletById(affectedWalletId);
    if (wallet) {
      const payload = { amountMinor: tx.amount_minor, currency: tx.currency, ok: input.status === "paid", txId: tx.id };
      if (tx.kind === "deposit") notifyDepositResult(wallet.user_id, wallet.id, payload);
      else notifyWithdrawalResult(wallet.user_id, wallet.id, payload);
    }
  }
  return true;
}

// ── Historique & réconciliation interne ─────────────────────────────

export async function listTransactions(
  walletId: string,
  limit = 30,
  beforeId?: number,
): Promise<
  Array<
    Omit<MoneyTransaction, "meta"> & {
      direction: "in" | "out";
      entry_id: number;
      counterparty: string | null;
      meta: Record<string, unknown>;
    }
  >
> {
  const rows = (await (await db()).all(
    `SELECT t.*, e.id AS entry_id,
            cw.handle AS cp_handle, cu.email AS cp_email
     FROM money_entries e
     JOIN money_transactions t ON t.id = e.transaction_id
     LEFT JOIN money_wallets cw
       ON cw.id = CASE WHEN t.to_wallet_id = ? THEN t.from_wallet_id ELSE t.to_wallet_id END
     LEFT JOIN users cu ON cu.id = cw.user_id
     WHERE e.wallet_id = ? AND e.id < COALESCE(?, 9223372036854775807)
     ORDER BY e.id DESC LIMIT ?`,
    [walletId, walletId, beforeId ?? null, Math.min(limit, 100)],
  )) as Array<
    MoneyTransaction & { entry_id: number; cp_handle: string | null; cp_email: string | null }
  >;
  return rows.map((t) => {
    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(t.meta || "{}") as Record<string, unknown>;
    } catch {
      /* meta illisible → objet vide */
    }
    return {
      ...t,
      amount_minor: Number(t.amount_minor),
      direction: t.to_wallet_id === walletId && t.from_wallet_id !== walletId ? "in" : "out",
      counterparty: t.cp_handle ? `@${t.cp_handle}` : t.cp_email,
      meta,
    };
  });
}

/**
 * Totaux du mois courant (UTC) par devise — alimente la ligne
 * « ce mois » de l'accueil. Les reversal/recrédits entrent dans "in".
 */
export async function monthlyTotals(
  walletId: string,
): Promise<Record<MoneyCurrency, { in: number; out: number }>> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const rows = (await (await db()).all(
    `SELECT currency,
            SUM(CASE WHEN delta_minor > 0 THEN delta_minor ELSE 0 END) AS in_minor,
            SUM(CASE WHEN delta_minor < 0 THEN -delta_minor ELSE 0 END) AS out_minor
     FROM money_entries
     WHERE wallet_id = ? AND created_at >= ?
     GROUP BY currency`,
    [walletId, start.toISOString()],
  )) as Array<{ currency: MoneyCurrency; in_minor: number; out_minor: number }>;
  const out: Record<MoneyCurrency, { in: number; out: number }> = {
    USD: { in: 0, out: 0 },
    CDF: { in: 0, out: 0 },
  };
  for (const r of rows) {
    out[r.currency] = { in: Number(r.in_minor) || 0, out: Number(r.out_minor) || 0 };
  }
  return out;
}

/**
 * Relevé complet du wallet — une ligne par écriture, ordre chronologique.
 * Utilisé par l'export CSV (/api/money/statement).
 */
export async function listStatementEntries(walletId: string, limit = 5000) {
  const rows = (await (await db()).all(
    `SELECT e.id AS entry_id, e.delta_minor, e.balance_after_minor, e.created_at AS entry_at,
            t.id, t.kind, t.status, t.currency, t.provider, t.provider_ref, t.meta,
            t.from_wallet_id, t.to_wallet_id,
            cw.handle AS cp_handle, cu.email AS cp_email
     FROM money_entries e
     JOIN money_transactions t ON t.id = e.transaction_id
     LEFT JOIN money_wallets cw
       ON cw.id = CASE WHEN t.to_wallet_id = ? THEN t.from_wallet_id ELSE t.to_wallet_id END
     LEFT JOIN users cu ON cu.id = cw.user_id
     WHERE e.wallet_id = ?
     ORDER BY e.id ASC LIMIT ?`,
    [walletId, walletId, Math.min(limit, 20000)],
  )) as Array<{
    entry_id: number;
    delta_minor: number;
    balance_after_minor: number;
    entry_at: string;
    id: string;
    kind: string;
    status: string;
    currency: string;
    provider: string | null;
    provider_ref: string | null;
    meta: string;
    cp_handle: string | null;
    cp_email: string | null;
  }>;
  return rows.map((r) => {
    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(r.meta || "{}") as Record<string, unknown>;
    } catch {
      /* ignore */
    }
    return { ...r, counterparty: r.cp_handle ? `@${r.cp_handle}` : r.cp_email, meta };
  });
}

/**
 * Vérifie que le cache money_balances correspond EXACTEMENT à la somme des
 * écritures — un écart signifie un bug ou une manipulation externe.
 */
export async function reconcileBalances(
  walletId: string,
): Promise<{ ok: boolean; drift: Array<{ currency: string; expected: number; actual: number }> }> {
  const d = await db();
  const sums = (await d.all(
    "SELECT currency, COALESCE(SUM(delta_minor), 0) AS total FROM money_entries WHERE wallet_id = ? GROUP BY currency",
    [walletId],
  )) as Array<{ currency: MoneyCurrency; total: number }>;
  const drift: Array<{ currency: string; expected: number; actual: number }> = [];
  for (const currency of MONEY_CURRENCIES) {
    const expected = Number(sums.find((s) => s.currency === currency)?.total ?? 0);
    const bal = (await d.get(
      "SELECT amount_minor FROM money_balances WHERE wallet_id = ? AND currency = ?",
      [walletId, currency],
    )) as { amount_minor: number } | undefined;
    const actual = Number(bal?.amount_minor ?? 0);
    if (expected !== actual) drift.push({ currency, expected, actual });
  }
  return { ok: drift.length === 0, drift };
}

/**
 * Réconciliation globale : chaque wallet + les transactions externes
 * bloquées en 'pending' depuis trop longtemps (provider silencieux).
 * Utilisé par le cron /api/cron/money-reconcile.
 */
export async function reconcileAll(opts: { stalePendingMin?: number } = {}) {
  const d = await db();
  const wallets = (await d.all("SELECT id, user_id FROM money_wallets")) as Array<{
    id: string;
    user_id: string;
  }>;
  const drift: Array<{ walletId: string; userId: string; drift: unknown[] }> = [];
  for (const w of wallets) {
    const r = await reconcileBalances(w.id);
    if (!r.ok) drift.push({ walletId: w.id, userId: w.user_id, drift: r.drift });
  }
  const staleMin = opts.stalePendingMin ?? 60;
  const cutoff = new Date(Date.now() - staleMin * 60_000).toISOString();
  const stale = (await d.all(
    `SELECT id, kind, provider, created_at FROM money_transactions
     WHERE status = 'pending' AND kind IN ('deposit','withdrawal') AND created_at < ?`,
    [cutoff],
  )) as Array<{ id: string; kind: string; provider: string | null; created_at: string }>;
  return { wallets: wallets.length, drift, stalePending: stale };
}
