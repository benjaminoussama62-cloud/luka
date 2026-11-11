/**
 * Ayeba Mail Services — moteur transactionnel central.
 *
 * Rôle : recevoir les demandes d'envoi des apps de l'écosystème (TALA,
 * SombaTeka, OMEGA, Mbongo, Mail), les valider, les mettre en file avec
 * retry, et les livrer via le relais SMTP — sans jamais écrire deux fois
 * (idempotence), jamais vers une adresse supprimée (bounces/plaintes),
 * jamais au-delà des quotas (anti-bombing).
 */
import crypto from "crypto";
import { getDb } from "@/lib/storage/database";
import { rateLimit } from "@/lib/rate-limit";
import { sendExternalMail } from "./smtp";
import { renderTx, type TxApp, type TxLocale, type TxMessage, type TxType } from "./tx-templates";

const APPS = new Set<TxApp>(["ayeba", "tala", "sombateka", "omega", "mbongo", "mail"]);
const LOCALES = new Set<TxLocale>(["fr", "en", "ln", "sw"]);
const TYPES = new Set<TxType>(["otp", "verify", "reset", "receipt", "invoice", "alert", "welcome", "notification"]);

// Backoff : 30 s → 5 min → 30 min, puis dead-letter.
const RETRY_DELAYS = [30e3, 5 * 60e3, 30 * 60e3];
const MAX_ATTEMPTS = RETRY_DELAYS.length + 1;

// Quotas — l'anti-bombing qui protège la réputation du domaine.
const LIMIT_PER_RECIPIENT = { count: 3, windowMs: 10 * 60e3 }; // 3 envois / 10 min / destinataire
const LIMIT_PER_APP = { count: 300, windowMs: 60e3 };          // 300 envois / min / app

type KeyRow = { id: string; app: string; status: string };
type QueueRow = {
  id: string; app: string; type: string; to_addr: string; locale: string;
  data: string; idem_key: string; status: string; attempts: number;
  last_error: string; next_retry: string; created_at: string; sent_at: string | null;
};

const uid = () => crypto.randomBytes(12).toString("hex");
const now = () => new Date().toISOString();
const hashKey = (key: string) => crypto.createHash("sha256").update(`ayeba-tx:${key}`).digest("hex");

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// ── Clés d'API ──────────────────────────────────────────────────────────────

/** Crée une clé d'app — retourne la clé EN CLAIR une seule fois (à stocker côté app). */
export async function createApiKey(app: TxApp, label = ""): Promise<{ id: string; key: string } | { error: string }> {
  if (!APPS.has(app)) return { error: `app inconnue — attendu : ${[...APPS].join(", ")}` };
  const key = `txk_${crypto.randomBytes(24).toString("hex")}`;
  const id = uid();
  await getDb()
    .prepare("INSERT INTO mail_api_keys (id, app, key_hash, key_prefix, label, status, created_at) VALUES (?,?,?,?,?,?,?)")
    .run(id, app, hashKey(key), key.slice(0, 14), label, "active", now());
  return { id, key };
}

export async function revokeApiKey(keyId: string) {
  await getDb().prepare("UPDATE mail_api_keys SET status = 'revoked', revoked_at = ? WHERE id = ?").run(now(), keyId);
}

/** Vérifie un Bearer token → l'app autorisée, ou null. */
export async function appFromKey(authHeader: string | null): Promise<{ id: string; app: TxApp } | null> {
  const m = /^Bearer\s+(\S+)$/i.exec(authHeader || "");
  if (!m) return null;
  const row = await getDb()
    .prepare("SELECT id, app, status FROM mail_api_keys WHERE key_hash = ?")
    .get(hashKey(m[1])) as KeyRow | undefined;
  if (!row || row.status !== "active" || !APPS.has(row.app as TxApp)) return null;
  return { id: row.id, app: row.app as TxApp };
}

// ── Suppression (bounces / plaintes / opt-out) ──────────────────────────────

export async function isSuppressed(address: string): Promise<boolean> {
  const row = await getDb().prepare("SELECT 1 FROM mail_suppressions WHERE address = ?").get(address.toLowerCase());
  return !!row;
}

export async function suppressAddress(address: string, reason: string, source = "webhook") {
  await getDb()
    .prepare("INSERT OR IGNORE INTO mail_suppressions (address, reason, source, created_at) VALUES (?,?,?,?)")
    .run(address.toLowerCase(), reason.slice(0, 200), source, now());
}

// ── Envoi ───────────────────────────────────────────────────────────────────

export type TxRequest = {
  type: string;
  to: string;
  locale?: string;
  data?: Record<string, string>;
  idempotencyKey: string;
};

export type TxResult =
  | { queued: true; id: string }
  | { queued: true; id: string; duplicate: true }
  | { error: string; status: number };

/**
 * Enfile un envoi transactionnel. Validation stricte + suppression +
 * rate-limit + idempotence. L'expédition elle-même est synchrone quand la
 * file est vide (latence < 1 s) et différée sinon — le worker externe
 * (`drainTxQueue`) reprend les échecs et le reste.
 */
export async function queueTx(app: TxApp, req: TxRequest): Promise<TxResult> {
  const type = String(req.type || "") as TxType;
  if (!TYPES.has(type)) return { error: `type inconnu — attendu : ${[...TYPES].join(", ")}`, status: 400 };

  const to = String(req.to || "").trim().toLowerCase();
  if (!EMAIL_RE.test(to) || to.length > 254) return { error: "destinataire invalide", status: 400 };

  const locale = (LOCALES.has(req.locale as TxLocale) ? req.locale : "fr") as TxLocale;
  const idem = String(req.idempotencyKey || "").trim();
  if (!idem || idem.length > 200) return { error: "idempotencyKey requis (événement métier unique)", status: 400 };

  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.data || {})) {
    if (typeof k === "string" && k.length <= 40 && typeof v === "string" && v.length <= 2000) data[k] = v;
  }

  // Idempotence : la même clé métier = le même envoi, quoi qu'il arrive.
  const existing = await getDb()
    .prepare("SELECT id, status FROM mail_outbound_queue WHERE app = ? AND idem_key = ?")
    .get(app, idem) as { id: string; status: string } | undefined;
  if (existing) return { queued: true, id: existing.id, duplicate: true };

  if (await isSuppressed(to)) {
    return { error: "destinataire supprimé (bounce ou plainte)", status: 422 };
  }

  if (!await rateLimit(`tx:to:${to}`, LIMIT_PER_RECIPIENT.count, LIMIT_PER_RECIPIENT.windowMs)) {
    return { error: "trop d'envois vers ce destinataire — réessayez plus tard", status: 429 };
  }
  if (!await rateLimit(`tx:app:${app}`, LIMIT_PER_APP.count, LIMIT_PER_APP.windowMs)) {
    return { error: "quota de l'application atteint", status: 429 };
  }

  const id = uid();
  try {
    await getDb()
      .prepare(
        `INSERT INTO mail_outbound_queue (id, app, type, to_addr, locale, data, idem_key, status, attempts, next_retry, created_at)
         VALUES (?,?,?,?,?,?,?,'pending',0,?,?)`,
      )
      .run(id, app, type, to, locale, JSON.stringify(data), idem, now(), now());
  } catch (e) {
    // Course : un autre process a inséré la même clé → c'est un doublon.
    if ((e as Error).message.includes("UNIQUE")) {
      const dup = await getDb()
        .prepare("SELECT id FROM mail_outbound_queue WHERE app = ? AND idem_key = ?")
        .get(app, idem) as { id: string } | undefined;
      if (dup) return { queued: true, id: dup.id, duplicate: true };
    }
    throw e;
  }

  // Tentative immédiate — les mails transactionnels doivent partir vite.
  await attemptSend(id);
  return { queued: true, id };
}

async function attemptSend(id: string): Promise<void> {
  const row = await getDb()
    .prepare("SELECT * FROM mail_outbound_queue WHERE id = ? AND status = 'pending'")
    .get(id) as QueueRow | undefined;
  if (!row) return;

  const attempts = row.attempts + 1;
  let msg: TxMessage;
  try {
    msg = renderTx(row.app as TxApp, row.type as TxType, row.locale as TxLocale, JSON.parse(row.data || "{}"));
  } catch (e) {
    await fail(id, attempts, `template: ${(e as Error).message}`, true);
    return;
  }

  const from = process.env.TX_SMTP_FROM || process.env.SMTP_FROM || `notifications@ayeba.app`;
  const res = await sendExternalMail({
    from,
    fromName: appName(row.app as TxApp),
    to: row.to_addr,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
    replyTo: process.env.TX_REPLY_TO || `support@ayeba.app`,
    unsubscribeUrl: `https://ayeba.app/api/mail/unsubscribe?a=${encodeURIComponent(row.to_addr)}&app=${row.app}`,
  });
  if (!res.ok) {
    const permanent = /5\d\d|boîte|inexistante|does not exist|rejected|blocked/i.test(res.error);
    if (permanent) await suppressAddress(row.to_addr, res.error, "smtp");
    await fail(id, attempts, res.error, permanent);
    return;
  }
  await getDb()
    .prepare("UPDATE mail_outbound_queue SET status = 'sent', attempts = ?, sent_at = ?, last_error = '' WHERE id = ?")
    .run(attempts, now(), id);
}

async function fail(id: string, attempts: number, error: string, permanent = false) {
  if (permanent || attempts >= MAX_ATTEMPTS) {
    await getDb()
      .prepare("UPDATE mail_outbound_queue SET status = 'dead', attempts = ?, last_error = ? WHERE id = ?")
      .run(attempts, error.slice(0, 300), id);
    return;
  }
  const next = new Date(Date.now() + RETRY_DELAYS[Math.min(attempts - 1, RETRY_DELAYS.length - 1)]).toISOString();
  await getDb()
    .prepare("UPDATE mail_outbound_queue SET attempts = ?, last_error = ?, next_retry = ? WHERE id = ?")
    .run(attempts, error.slice(0, 300), next, id);
}

/**
 * Reprend les envois en échec — à appeler depuis un cron Vercel
 * (`/api/cron/*`) ou un worker. Sécurisé : idempotent, limite stricte.
 */
export async function drainTxQueue(limit = 50): Promise<number> {
  const rows = await getDb()
    .prepare("SELECT id FROM mail_outbound_queue WHERE status = 'pending' AND next_retry <= ? ORDER BY next_retry ASC LIMIT ?")
    .all(now(), limit) as { id: string }[];
  for (const r of rows) await attemptSend(r.id);
  return rows.length;
}

const APP_NAMES: Record<TxApp, string> = {
  ayeba: "Ayeba", mail: "Ayeba Mail", tala: "TALA",
  sombateka: "SombaTeka", omega: "OMEGA", mbongo: "Ayeba Mbongo",
};
const appName = (app: TxApp) => APP_NAMES[app] ?? "Ayeba";
