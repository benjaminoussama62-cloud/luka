/**
 * Ayeba Mail — cœur du service.
 * Livraison interne réelle (@ayeba.app ↔ @ayeba.app), bounce façon Gmail quand
 * le destinataire n'existe pas, contenus chiffrés au repos, adresses uniques
 * à vie, inscription vérifiée par téléphone.
 */
import crypto from "crypto";
import { getDb } from "@/lib/storage/database";
import { applyMailSchema } from "@/lib/mail/mail-schema";
import { decryptText, encryptText, hashCode } from "@/lib/mail/mail-crypto";

export const MAIL_DOMAIN = "ayeba.app";
export const MAILER_DAEMON = `mailer@${MAIL_DOMAIN}`;
const OTP_TTL_MS = 5 * 60_000;
const OTP_MAX_ATTEMPTS = 5;
const ADDRESS_RE = /^[a-z][a-z0-9._-]{2,29}$/;
const RESERVED = new Set([
  "admin", "administrator", "support", "aide", "help", "contact", "info",
  "no-reply", "noreply", "no_reply", "mailer", "postmaster", "abuse", "webmaster",
  "security", "securite", "billing", "facturation", "sales", "press", "legal",
  "ayeba", "ayebi", "mail", "studio", "omega", "tala", "jemsa", "sombateka",
  "aether", "radar", "yield", "trace", "velocity", "developers", "root", "system",
]);

let schemaApplied = false;
function db() {
  const d = getDb();
  if (!schemaApplied) {
    try {
      applyMailSchema(d);
      schemaApplied = true;
    } catch {
      /* concurrent init — tables exist */
      schemaApplied = true;
    }
  }
  return d;
}

export type MailAccount = {
  id: string;
  userId: string;
  address: string;
  email: string;
  phone: string;
  displayName: string;
  birthdate: string;
  recoveryEmail: string;
  avatar: string;
  signature: string;
  status: string;
  createdAt: string;
};

type AccountRow = {
  id: string;
  user_id: string;
  address: string;
  email: string;
  phone: string;
  display_name?: string;
  birthdate?: string;
  recovery_email?: string;
  avatar?: string;
  signature?: string;
  status?: string;
  created_at: string;
};

export type MailProfile = {
  displayName: string;
  birthdate: string;
  recoveryEmail: string;
};

export type MailMessage = {
  id: string;
  threadId: string;
  folder: string;
  from: string;
  fromName: string;
  to: string[];
  subject: string;
  body: string;
  read: boolean;
  starred: boolean;
  kind: "mail" | "bounce" | "system";
  at: string;
};

type MsgRow = {
  id: string;
  thread_id: string;
  account_id: string;
  folder: string;
  from_addr: string;
  from_name: string;
  to_addrs: string;
  subject_enc: string;
  body_enc: string;
  is_read: number;
  is_starred: number;
  kind: string;
  created_at: string;
};

const uid = () => crypto.randomBytes(12).toString("hex");
const now = () => new Date().toISOString();

function toAccount(r: AccountRow): MailAccount {
  return {
    id: r.id,
    userId: r.user_id,
    address: r.address,
    email: r.email,
    phone: r.phone,
    displayName: r.display_name || r.address,
    birthdate: r.birthdate || "",
    recoveryEmail: r.recovery_email || "",
    avatar: r.avatar || "",
    signature: r.signature || "",
    status: r.status || "active",
    createdAt: r.created_at,
  };
}

function toMessage(r: MsgRow): MailMessage {
  return {
    id: r.id,
    threadId: r.thread_id,
    folder: r.folder,
    from: r.from_addr,
    fromName: r.from_name,
    to: JSON.parse(r.to_addrs || "[]") as string[],
    subject: decryptText(r.subject_enc),
    body: decryptText(r.body_enc),
    read: !!r.is_read,
    starred: !!r.is_starred,
    kind: (r.kind as MailMessage["kind"]) || "mail",
    at: r.created_at,
  };
}

// ── Comptes ────────────────────────────────────────────────────────────────

export function getAccountByUser(userId: string): MailAccount | null {
  const r = db()
    .prepare("SELECT * FROM mail_accounts WHERE user_id = ?")
    .get(userId) as AccountRow | undefined;
  return r ? toAccount(r) : null;
}

export function getAccountByEmail(email: string): MailAccount | null {
  const r = db()
    .prepare("SELECT * FROM mail_accounts WHERE email = ?")
    .get(email.toLowerCase()) as AccountRow | undefined;
  return r ? toAccount(r) : null;
}

export function validateAddress(local: string): { ok: boolean; reason?: string } {
  const a = (local || "").toLowerCase().trim();
  if (!ADDRESS_RE.test(a)) {
    return {
      ok: false,
      reason: "3–30 caractères : lettres, chiffres, point, tiret (commence par une lettre).",
    };
  }
  if (a.includes("..")) return { ok: false, reason: "Deux points consécutifs interdits." };
  if (RESERVED.has(a)) return { ok: false, reason: "Cette adresse est réservée." };
  return { ok: true };
}

export function addressAvailable(local: string): boolean {
  const a = local.toLowerCase();
  const taken = db()
    .prepare(
      "SELECT 1 AS x FROM mail_accounts WHERE address = ? UNION SELECT 1 FROM mail_verifications WHERE address = ? AND expires_at > ?",
    )
    .get(a, a, now());
  return !taken;
}

export function phoneUsed(phone: string): boolean {
  return !!db().prepare("SELECT 1 AS x FROM mail_accounts WHERE phone = ?").get(phone);
}

// ── Téléphone ──────────────────────────────────────────────────────────────

/** Normalise vers E.164 ; RDC (+243) par défaut pour les numéros locaux. */
export function normalizePhone(raw: string): string | null {
  let p = String(raw || "").replace(/[\s.\-()]/g, "");
  if (!p) return null;
  if (p.startsWith("00")) p = `+${p.slice(2)}`;
  if (p.startsWith("0")) p = `+243${p.slice(1)}`; // 0X → +243X (RDC)
  if (/^243\d{9}$/.test(p)) p = `+${p}`;
  if (/^9\d{8}$/.test(p)) p = `+243${p}`; // 9XXXXXXXX local RDC
  if (!/^\+[1-9]\d{7,14}$/.test(p)) return null;
  return p;
}

// ── Inscription (code SMS) ─────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_AGE = 13;

/** Valide le profil d'inscription : nom affiché, âge ≥ 13, email de secours. */
export function validateProfile(p: {
  displayName?: string;
  birthdate?: string;
  recoveryEmail?: string;
}): { ok: true; profile: MailProfile } | { ok: false; error: string } {
  const displayName = String(p.displayName || "").replace(/\s+/g, " ").trim();
  if (displayName.length < 2 || displayName.length > 60 || /[<>@]/.test(displayName)) {
    return { ok: false, error: "Nom complet invalide (2–60 caractères)." };
  }
  const birthdate = String(p.birthdate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
    return { ok: false, error: "Date de naissance invalide." };
  }
  const born = new Date(`${birthdate}T00:00:00Z`);
  const age = (Date.now() - born.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (isNaN(born.getTime()) || age < MIN_AGE || age > 120) {
    return { ok: false, error: `Vous devez avoir au moins ${MIN_AGE} ans.` };
  }
  const recoveryEmail = String(p.recoveryEmail || "").trim().toLowerCase();
  if (recoveryEmail && !EMAIL_RE.test(recoveryEmail)) {
    return { ok: false, error: "Adresse de récupération invalide." };
  }
  return { ok: true, profile: { displayName, birthdate, recoveryEmail } };
}

export function createVerification(
  userId: string,
  phone: string,
  address: string,
  profile: MailProfile,
): { id: string; code: string } | { error: string } {
  const check = validateAddress(address);
  if (!check.ok) return { error: check.reason! };
  const a = address.toLowerCase();
  if (userId && getAccountByUser(userId)) return { error: "Ce compte Ayeba a déjà une adresse mail." };
  if (!addressAvailable(a)) return { error: "Cette adresse est déjà prise." };
  if (phoneUsed(phone)) return { error: "Ce numéro est déjà lié à un compte Ayeba Mail." };

  // Invalide les codes en cours pour ce téléphone (un seul actif).
  db()
    .prepare("DELETE FROM mail_verifications WHERE phone = ? OR user_id = ?")
    .run(phone, userId);

  const code = String(crypto.randomInt(100000, 999999));
  const id = uid();
  db()
    .prepare(
      "INSERT INTO mail_verifications (id, user_id, phone, address, code_hash, attempts, expires_at, created_at, display_name, birthdate, recovery_email) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)",
    )
    .run(id, userId, phone, a, hashCode(code), new Date(Date.now() + OTP_TTL_MS).toISOString(), now(), profile.displayName, profile.birthdate, profile.recoveryEmail);
  return { id, code };
}

/** Code SMS de connexion — le téléphone est l'identité, comme WhatsApp. */
export function createSigninCode(phone: string): { code: string } | { error: string } {
  const acc = db()
    .prepare("SELECT * FROM mail_accounts WHERE phone = ?")
    .get(phone) as AccountRow | undefined;
  if (!acc) return { error: "Aucun compte Ayeba Mail avec ce numéro." };
  if ((acc.status || "active") === "suspended") return { error: "Compte suspendu." };

  db().prepare("DELETE FROM mail_verifications WHERE phone = ?").run(phone);
  const code = String(crypto.randomInt(100000, 999999));
  db()
    .prepare(
      "INSERT INTO mail_verifications (id, user_id, phone, address, code_hash, attempts, expires_at, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
    )
    .run(uid(), acc.user_id, phone, acc.address, hashCode(code), new Date(Date.now() + OTP_TTL_MS).toISOString(), now());
  return { code };
}

type VerifRow = {
  id: string;
  user_id: string;
  address: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
  display_name?: string;
  birthdate?: string;
  recovery_email?: string;
};

const AVATAR_COLORS = ["#e85d04", "#ff6b35", "#64748b", "#94a3b8", "#f97316", "#78716c"];

/**
 * Valide un code SMS et finalise :
 * - compte mail existant pour ce numéro → connexion (retourne l'userId lié)
 * - sinon → crée l'utilisateur Ayeba (provider « mail », sans mot de passe) +
 *   la boîte. L'inscription Mail ne demande JAMAIS de session préalable.
 */
export function completeMailVerification(
  phone: string,
  code: string,
): { ok: true; account: MailAccount; userId: string; isNew: boolean } | { ok: false; error: string } {
  const v = db()
    .prepare("SELECT * FROM mail_verifications WHERE phone = ? ORDER BY created_at DESC LIMIT 1")
    .get(phone) as VerifRow | undefined;

  if (!v) return { ok: false, error: "Aucune vérification en cours pour ce numéro." };
  if (v.expires_at < now()) return { ok: false, error: "Code expiré — recommencez." };
  if (v.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, error: "Trop de tentatives — demandez un nouveau code." };
  }
  if (v.code_hash !== hashCode(String(code || "").trim())) {
    db().prepare("UPDATE mail_verifications SET attempts = attempts + 1 WHERE id = ?").run(v.id);
    return { ok: false, error: "Code incorrect." };
  }

  // Connexion : le compte existe déjà pour ce numéro.
  const existingByPhone = db()
    .prepare("SELECT * FROM mail_accounts WHERE phone = ?")
    .get(phone) as AccountRow | undefined;
  if (existingByPhone) {
    db().prepare("DELETE FROM mail_verifications WHERE id = ?").run(v.id);
    db().prepare("UPDATE mail_accounts SET last_login_at = ? WHERE id = ?").run(now(), existingByPhone.id);
    return { ok: true, account: toAccount(existingByPhone), userId: existingByPhone.user_id, isNew: false };
  }

  // Dernière ligne de défense contre une course : UNIQUE en base + re-check
  // sur les comptes réels uniquement (la vérification en cours réserve déjà
  // l'adresse — ne pas la compter contre elle-même).
  const taken = db()
    .prepare("SELECT 1 AS x FROM mail_accounts WHERE address = ?")
    .get(v.address);
  if (taken) {
    return { ok: false, error: "Cette adresse vient d'être prise — choisissez-en une autre." };
  }

  const email = `${v.address}@${MAIL_DOMAIN}`;
  let userId = v.user_id;

  // Inscription anonyme : le compte Ayeba est créé ici — provider « mail ».
  if (!userId) {
    userId = crypto.randomUUID();
    try {
      db()
        .prepare(
          "INSERT INTO users (id, name, email, password_hash, avatar_color, provider, role, created_at) VALUES (?, ?, ?, '', ?, 'mail', 'contributor', ?)",
        )
        .run(
          userId,
          v.display_name || v.address,
          email,
          AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
          now(),
        );
    } catch {
      return { ok: false, error: "Création impossible — réessayez." };
    }
  }

  try {
    db()
      .prepare(
        "INSERT INTO mail_accounts (id, user_id, address, email, phone, created_at, display_name, birthdate, recovery_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        uid(), userId, v.address, email, phone, now(),
        v.display_name || "", v.birthdate || "", v.recovery_email || "",
      );
  } catch {
    return { ok: false, error: "Cette adresse n'est plus disponible." };
  }
  db().prepare("DELETE FROM mail_verifications WHERE id = ?").run(v.id);

  const account = getAccountByUser(userId)!;
  // Message de bienvenue système — première pierre de la boîte.
  insertMessage({
    threadId: uid(),
    accountId: account.id,
    folder: "inbox",
    from: `equipe@${MAIL_DOMAIN}`,
    fromName: "Équipe Ayeba",
    to: [email],
    subject: "Bienvenue sur Ayeba Mail",
    body: `Votre adresse ${email} est active.\n\nAyeba Mail est pensé pour la confidentialité : vos messages sont chiffrés au repos et jamais analysés. Votre numéro de téléphone sécurise votre compte.\n\n— L'équipe Ayeba`,
    kind: "system",
    read: false,
  });
  return { ok: true, account, userId, isNew: true };
}

// ── Messages ───────────────────────────────────────────────────────────────

function insertMessage(m: {
  threadId: string;
  accountId: string;
  folder: string;
  from: string;
  fromName?: string;
  to: string[];
  subject: string;
  body: string;
  kind?: string;
  read?: boolean;
}) {
  db()
    .prepare(
      `INSERT INTO mail_messages (id, thread_id, account_id, folder, from_addr, from_name, to_addrs, subject_enc, body_enc, is_read, is_starred, kind, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    )
    .run(
      uid(),
      m.threadId,
      m.accountId,
      m.folder,
      m.from,
      m.fromName || "",
      JSON.stringify(m.to),
      encryptText(m.subject),
      encryptText(m.body),
      m.read ? 1 : 0,
      m.kind || "mail",
      now(),
    );
}

export type SendResult = {
  ok: boolean;
  delivered: string[];
  bounced: { address: string; reason: string }[];
  /** Adresses externes à remettre au relais SMTP (appelant : sendExternalBatch). */
  externals: string[];
};

const INTERNAL_RE = new RegExp(`@(${MAIL_DOMAIN.replace(".", "\\.")})$`, "i");

/** Relais SMTP sortant configuré ? (check env uniquement — pas d'import nodemailer ici) */
export function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

/**
 * Envoie un mail. Destinataires internes livrés instantanément (vraie copie en
 * boîte) ; adresse @ayeba.app inexistante → bounce immédiat en boîte de
 * l'expéditeur ; adresses externes → renvoyées dans `externals` pour remise au
 * relais SMTP (sendExternalBatch), ou bounce honnête si SMTP non configuré.
 */
export function sendMail(
  sender: MailAccount,
  to: string[],
  subject: string,
  body: string,
): SendResult {
  const delivered: string[] = [];
  const bounced: { address: string; reason: string }[] = [];
  const externals: string[] = [];
  const cleanTo = [...new Set(to.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  const threadId = uid();
  const subj = subject.trim() || "(sans objet)";

  const internals: MailAccount[] = [];
  for (const addr of cleanTo) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
      bounced.push({ address: addr, reason: "Adresse invalide" });
      continue;
    }
    if (INTERNAL_RE.test(addr)) {
      const acc = getAccountByEmail(addr);
      if (acc) internals.push(acc);
      else bounced.push({ address: addr, reason: "Ce compte Ayeba Mail n'existe pas" });
    } else if (smtpConfigured()) {
      externals.push(addr);
    } else {
      bounced.push({
        address: addr,
        reason: "Remise externe indisponible — relais SMTP non configuré sur le serveur",
      });
    }
  }

  const senderName = sender.displayName || sender.address;
  // Copie « Envoyés » chez l'expéditeur (toujours — trace fidèle).
  insertMessage({
    threadId,
    accountId: sender.id,
    folder: "sent",
    from: sender.email,
    fromName: senderName,
    to: cleanTo,
    subject: subj,
    body,
    kind: "mail",
    read: true,
  });

  for (const acc of internals) {
    insertMessage({
      threadId,
      accountId: acc.id,
      folder: "inbox",
      from: sender.email,
      fromName: senderName,
      to: cleanTo,
      subject: subj,
      body,
      kind: "mail",
    });
    delivered.push(acc.email);
  }

  // Bounce façon Gmail : notification d'échec dans la boîte de l'expéditeur.
  for (const b of bounced) {
    insertMessage({
      threadId: uid(),
      accountId: sender.id,
      folder: "inbox",
      from: MAILER_DAEMON,
      fromName: "Ayeba Mail — Remise",
      to: [sender.email],
      subject: `Échec de remise : ${subj}`,
      body:
        `Votre message « ${subj} » n'a pas pu être remis.\n\n` +
        `Destinataire : ${b.address}\nRaison : ${b.reason}.\n\n` +
        `Vérifiez l'adresse et réessayez.`,
      kind: "bounce",
    });
  }

  return { ok: delivered.length > 0 || externals.length > 0, delivered, bounced, externals };
}

/**
 * Remet les destinataires externes au relais SMTP (async). En cas d'échec,
 * un bounce « Mail Delivery Subsystem » est déposé dans la boîte de
 * l'expéditeur — comportement identique à Gmail.
 */
export async function sendExternalBatch(
  sender: MailAccount,
  externals: string[],
  subject: string,
  body: string,
): Promise<{ delivered: string[]; bounced: { address: string; reason: string }[] }> {
  const { sendExternalMail } = await import("@/lib/mail/smtp");
  const delivered: string[] = [];
  const bounced: { address: string; reason: string }[] = [];
  const senderName = sender.displayName || sender.address;
  const subj = subject.trim() || "(sans objet)";

  for (const addr of externals) {
    const res = await sendExternalMail({
      from: sender.email,
      fromName: senderName,
      to: addr,
      subject: subj,
      text: body,
      replyTo: sender.email,
    });
    if (res.ok) {
      delivered.push(addr);
    } else {
      bounced.push({ address: addr, reason: res.error });
      insertMessage({
        threadId: uid(),
        accountId: sender.id,
        folder: "inbox",
        from: MAILER_DAEMON,
        fromName: "Ayeba Mail — Remise",
        to: [sender.email],
        subject: `Échec de remise : ${subj}`,
        body:
          `Votre message « ${subj} » n'a pas pu être remis au destinataire externe.\n\n` +
          `Destinataire : ${addr}\nRaison : ${res.error}.\n\n` +
          `Vérifiez l'adresse et réessayez.`,
        kind: "bounce",
      });
    }
  }
  return { delivered, bounced };
}

/**
 * Réception d'un mail externe entrant (via webhook /api/mail/inbound alimenté
 * par Cloudflare Email Routing ou équivalent). Livre une vraie copie en boîte
 * du compte @ayeba.app ciblé.
 */
export function receiveExternalMail(opts: {
  from: string;
  fromName?: string;
  to: string[];
  subject: string;
  body: string;
  html?: string;
  messageId?: string;
}): { delivered: string[]; dropped: string[] } {
  const delivered: string[] = [];
  const dropped: string[] = [];
  const from = String(opts.from || "").slice(0, 200);
  const subj = String(opts.subject || "(sans objet)").slice(0, 300);
  const body = String(opts.body || "").slice(0, 200_000);
  const threadId = opts.messageId ? `ext-${opts.messageId.slice(0, 80)}` : uid();

  for (const raw of opts.to || []) {
    const addr = String(raw).trim().toLowerCase();
    if (!INTERNAL_RE.test(addr)) continue;
    const acc = getAccountByEmail(addr);
    if (!acc || acc.status !== "active") {
      dropped.push(addr);
      continue;
    }
    insertMessage({
      threadId,
      accountId: acc.id,
      folder: "inbox",
      from,
      fromName: String(opts.fromName || "").slice(0, 120),
      to: [addr],
      subject: subj,
      body,
      kind: "mail",
    });
    delivered.push(addr);
  }
  return { delivered, dropped };
}

// ── Lecture ────────────────────────────────────────────────────────────────

const VALID_FOLDERS = new Set(["inbox", "sent", "drafts", "archive", "starred", "trash"]);

export function listMessages(
  accountId: string,
  folder = "inbox",
  q = "",
): MailMessage[] {
  const f = VALID_FOLDERS.has(folder) ? folder : "inbox";
  const rows = (
    f === "starred"
      ? (db()
          .prepare(
            "SELECT * FROM mail_messages WHERE account_id = ? AND is_starred = 1 AND folder != 'trash' ORDER BY created_at DESC LIMIT 200",
          )
          .all(accountId) as MsgRow[])
      : (db()
          .prepare(
            "SELECT * FROM mail_messages WHERE account_id = ? AND folder = ? ORDER BY created_at DESC LIMIT 200",
          )
          .all(accountId, f) as MsgRow[])
  ).map(toMessage);

  if (!q.trim()) return rows;
  const needle = q.trim().toLowerCase();
  return rows.filter(
    (m) =>
      m.subject.toLowerCase().includes(needle) ||
      m.body.toLowerCase().includes(needle) ||
      m.from.toLowerCase().includes(needle) ||
      m.to.some((t) => t.toLowerCase().includes(needle)),
  );
}

export function getThread(accountId: string, threadId: string): MailMessage[] {
  const rows = db()
    .prepare(
      "SELECT * FROM mail_messages WHERE account_id = ? AND thread_id = ? ORDER BY created_at ASC",
    )
    .all(accountId, threadId) as MsgRow[];
  return rows.map(toMessage);
}

export function getMessage(accountId: string, id: string): MailMessage | null {
  const r = db()
    .prepare("SELECT * FROM mail_messages WHERE account_id = ? AND id = ?")
    .get(accountId, id) as MsgRow | undefined;
  return r ? toMessage(r) : null;
}

export function markRead(accountId: string, id: string, read = true) {
  db()
    .prepare("UPDATE mail_messages SET is_read = ? WHERE account_id = ? AND id = ?")
    .run(read ? 1 : 0, accountId, id);
}

export function setStarred(accountId: string, id: string, starred: boolean) {
  db()
    .prepare("UPDATE mail_messages SET is_starred = ? WHERE account_id = ? AND id = ?")
    .run(starred ? 1 : 0, accountId, id);
}

export function moveToFolder(accountId: string, id: string, folder: string) {
  if (!VALID_FOLDERS.has(folder)) return;
  db()
    .prepare("UPDATE mail_messages SET folder = ? WHERE account_id = ? AND id = ?")
    .run(folder, accountId, id);
}

export function deleteMessage(accountId: string, id: string) {
  const m = getMessage(accountId, id);
  if (!m) return;
  if (m.folder === "trash") {
    db().prepare("DELETE FROM mail_messages WHERE account_id = ? AND id = ?").run(accountId, id);
  } else {
    moveToFolder(accountId, id, "trash");
  }
}

/** Message système (back-office) dans la boîte d'un compte. */
export function sendSystemMessage(accountId: string, subject: string, body: string) {
  const acc = db()
    .prepare("SELECT email FROM mail_accounts WHERE id = ?")
    .get(accountId) as { email: string } | undefined;
  if (!acc) return false;
  insertMessage({
    threadId: uid(),
    accountId,
    folder: "inbox",
    from: `securite@${MAIL_DOMAIN}`,
    fromName: "Ayeba Mail — Équipe",
    to: [acc.email],
    subject,
    body,
    kind: "system",
  });
  return true;
}

const AVATAR_RE = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;
const AVATAR_MAX = 180_000; // ~128px jpeg/webp tient sous 130 KB

export function updateAccountProfile(
  accountId: string,
  patch: { displayName?: string; avatar?: string | null; signature?: string },
): { ok: true } | { error: string } {
  const sets: string[] = [];
  const args: unknown[] = [];

  if (patch.displayName !== undefined) {
    const name = patch.displayName.replace(/\s+/g, " ").trim();
    if (name.length < 2 || name.length > 60 || /[<>@]/.test(name)) {
      return { error: "Nom affiché invalide (2–60 caractères, sans @ ni < >)." };
    }
    sets.push("display_name = ?");
    args.push(name);
  }
  if (patch.avatar !== undefined) {
    const a = patch.avatar ?? "";
    if (a && (!AVATAR_RE.test(a) || a.length > AVATAR_MAX)) {
      return { error: "Image invalide — PNG/JPEG/WebP, 128 Ko max." };
    }
    sets.push("avatar = ?");
    args.push(a);
  }
  if (patch.signature !== undefined) {
    const sig = patch.signature.slice(0, 600);
    sets.push("signature = ?");
    args.push(sig);
  }
  if (!sets.length) return { error: "Rien à modifier." };

  db()
    .prepare(`UPDATE mail_accounts SET ${sets.join(", ")} WHERE id = ?`)
    .run(...args, accountId);
  return { ok: true };
}

export function setAccountStatus(accountId: string, status: "active" | "suspended") {
  db().prepare("UPDATE mail_accounts SET status = ? WHERE id = ?").run(status, accountId);
}

export function unreadCount(accountId: string): number {
  const r = db()
    .prepare(
      "SELECT COUNT(*) AS c FROM mail_messages WHERE account_id = ? AND folder = 'inbox' AND is_read = 0",
    )
    .get(accountId) as { c: number };
  return r.c;
}
