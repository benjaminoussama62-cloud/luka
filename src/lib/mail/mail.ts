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
import {
  MAX_ATTACHMENTS,
  MAX_CIPHER_BYTES,
  type CipherPack,
  type KeyWrap,
  type PassWrap,
  sealText,
} from "@/lib/mail/e2ee";

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

export type MailAttachmentMeta = {
  id: string;
  byteSize: number;
  fileIv: string;
  nameIv: string;
  nameCt: string;
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
  /** 0 = chiffré au repos par le serveur. 1 = coffre de bout en bout. */
  enc: 0 | 1;
  sealedSubject?: CipherPack;
  sealedBody?: CipherPack;
  wrap?: KeyWrap;
  attachmentCount: number;
  attachments: MailAttachmentMeta[];
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
  enc?: number;
  wraps?: string;
  att_count?: number;
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

function parsePack<T>(raw: string | undefined): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function toMessage(r: MsgRow, full: boolean): MailMessage {
  const enc: 0 | 1 = r.enc === 1 ? 1 : 0;
  const base = {
    id: r.id,
    threadId: r.thread_id,
    folder: r.folder,
    from: r.from_addr,
    fromName: r.from_name,
    to: JSON.parse(r.to_addrs || "[]") as string[],
    read: !!r.is_read,
    starred: !!r.is_starred,
    kind: (r.kind as MailMessage["kind"]) || "mail",
    at: r.created_at,
    enc,
    attachmentCount: Number(r.att_count || 0),
    attachments: [] as MailAttachmentMeta[],
  };
  if (enc === 1) {
    return {
      ...base,
      subject: "",
      body: "",
      sealedSubject: parsePack<CipherPack>(r.subject_enc),
      sealedBody: full ? parsePack<CipherPack>(r.body_enc) : undefined,
      wrap: parsePack<KeyWrap>(r.wraps),
      attachments: full ? listAttachmentMeta(r.id) : [],
    };
  }
  return {
    ...base,
    subject: decryptText(r.subject_enc),
    body: full ? decryptText(r.body_enc) : decryptText(r.body_enc).replace(/\s+/g, " ").slice(0, 140),
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
    body: `Votre adresse ${email} est active.\n\nActivez le coffre juste après cette étape : entre deux adresses @ayeba.app, le texte et les pièces jointes sont chiffrés sur votre appareil. Ayeba n'en reçoit que la forme chiffrée.\n\nCe message de bienvenue, lui, a été écrit avant l'ouverture du coffre. Il sera scellé dans votre coffre dès que vous l'aurez créé.\n\n— L'équipe Ayeba`,
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
export async function receiveExternalMail(opts: {
  from: string;
  fromName?: string;
  to: string[];
  subject: string;
  body: string;
  html?: string;
  messageId?: string;
}): Promise<{ delivered: string[]; dropped: string[] }> {
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
    const pub = vaultPublicKey(acc.id);
    if (pub) {
      const sealed = await sealText(pub, subj, body);
      insertSealed({
        threadId,
        accountId: acc.id,
        folder: "inbox",
        from,
        fromName: String(opts.fromName || "").slice(0, 120),
        to: [addr],
        subjectCipher: sealed.subjectCipher,
        bodyCipher: sealed.bodyCipher,
        wrap: sealed.wrap,
        kind: "mail",
      });
    } else {
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
    }
    delivered.push(addr);
  }
  return { delivered, dropped };
}

// ── Lecture ────────────────────────────────────────────────────────────────

const VALID_FOLDERS = new Set(["inbox", "sent", "drafts", "archive", "starred", "trash"]);

const LIST_SQL = `SELECT m.*, (SELECT COUNT(*) FROM mail_attachments a WHERE a.message_id = m.id) AS att_count
FROM mail_messages m`;

function legacyMatches(r: MsgRow, needle: string): boolean {
  if (r.enc === 1) return true;
  const subject = decryptText(r.subject_enc).toLowerCase();
  const body = decryptText(r.body_enc).toLowerCase();
  const to = (JSON.parse(r.to_addrs || "[]") as string[]).join(" ").toLowerCase();
  return (
    subject.includes(needle) ||
    body.includes(needle) ||
    r.from_addr.toLowerCase().includes(needle) ||
    (r.from_name || "").toLowerCase().includes(needle) ||
    to.includes(needle)
  );
}

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
            `${LIST_SQL} WHERE m.account_id = ? AND m.is_starred = 1 AND m.folder != 'trash' ORDER BY m.created_at DESC LIMIT 200`,
          )
          .all(accountId) as MsgRow[])
      : (db()
          .prepare(
            `${LIST_SQL} WHERE m.account_id = ? AND m.folder = ? ORDER BY m.created_at DESC LIMIT 200`,
          )
          .all(accountId, f) as MsgRow[])
  );
  const needle = q.trim().toLowerCase();
  const filtered = needle ? rows.filter((r) => legacyMatches(r, needle)) : rows;
  return filtered.map((r) => toMessage(r, false));
}

export function getThread(accountId: string, threadId: string): MailMessage[] {
  const rows = db()
    .prepare(
      `${LIST_SQL} WHERE m.account_id = ? AND m.thread_id = ? ORDER BY m.created_at ASC`,
    )
    .all(accountId, threadId) as MsgRow[];
  return rows.map((r) => toMessage(r, true));
}

export function getMessage(accountId: string, id: string): MailMessage | null {
  const r = db()
    .prepare(`${LIST_SQL} WHERE m.account_id = ? AND m.id = ?`)
    .get(accountId, id) as MsgRow | undefined;
  return r ? toMessage(r, true) : null;
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
    db().prepare("DELETE FROM mail_attachments WHERE account_id = ? AND message_id = ?").run(accountId, id);
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

// ── Coffre + pièces jointes ────────────────────────────────────────────────

function asBuffer(v: unknown): Buffer {
  if (Buffer.isBuffer(v)) return v;
  if (v instanceof Uint8Array) return Buffer.from(v);
  return Buffer.alloc(0);
}

function listAttachmentMeta(messageId: string): MailAttachmentMeta[] {
  const rows = db()
    .prepare(
      "SELECT id, byte_size, file_iv, name_iv, name_ct FROM mail_attachments WHERE message_id = ? ORDER BY created_at ASC",
    )
    .all(messageId) as {
    id: string;
    byte_size: number;
    file_iv: string;
    name_iv: string;
    name_ct: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    byteSize: Number(r.byte_size),
    fileIv: r.file_iv,
    nameIv: r.name_iv,
    nameCt: r.name_ct,
  }));
}

export type VaultRecord = {
  ecdhPublic: string;
  ecdsaPublic: string;
  privWrap: PassWrap;
  recoveryWrap: PassWrap;
  fingerprint: string;
};

function parsePassWrap(raw: string): PassWrap | null {
  const w = parsePack<PassWrap>(raw);
  if (!w || typeof w.salt !== "string" || typeof w.iv !== "string" || typeof w.ct !== "string") return null;
  if (!Number.isInteger(w.iterations) || w.iterations < 100_000 || w.iterations > 800_000) return null;
  return w;
}

export function vaultPublicKey(accountId: string): string | null {
  const r = db()
    .prepare("SELECT vault_ecdh_pub AS pub FROM mail_accounts WHERE id = ?")
    .get(accountId) as { pub?: string } | undefined;
  const pub = r?.pub || "";
  return pub.length > 40 ? pub : null;
}

export function getVaultRecord(accountId: string): VaultRecord | null {
  const r = db()
    .prepare(
      "SELECT vault_ecdh_pub, vault_ecdsa_pub, vault_priv_wrap, vault_recovery_wrap, vault_fp FROM mail_accounts WHERE id = ?",
    )
    .get(accountId) as
    | {
        vault_ecdh_pub: string;
        vault_ecdsa_pub: string;
        vault_priv_wrap: string;
        vault_recovery_wrap: string;
        vault_fp: string;
      }
    | undefined;
  if (!r?.vault_ecdh_pub) return null;
  const privWrap = parsePassWrap(r.vault_priv_wrap);
  const recoveryWrap = parsePassWrap(r.vault_recovery_wrap);
  if (!privWrap || !recoveryWrap) return null;
  return {
    ecdhPublic: r.vault_ecdh_pub,
    ecdsaPublic: r.vault_ecdsa_pub,
    privWrap,
    recoveryWrap,
    fingerprint: r.vault_fp,
  };
}

export function saveVault(
  accountId: string,
  v: VaultRecord,
): { ok: true } | { error: string } {
  const row = db()
    .prepare("SELECT vault_ecdh_pub AS pub FROM mail_accounts WHERE id = ?")
    .get(accountId) as { pub?: string } | undefined;
  if (!row) return { error: "Compte introuvable." };
  if (row.pub) return { error: "Le coffre existe déjà." };
  db()
    .prepare(
      `UPDATE mail_accounts
       SET vault_ecdh_pub = ?, vault_ecdsa_pub = ?, vault_priv_wrap = ?, vault_recovery_wrap = ?, vault_fp = ?
       WHERE id = ? AND vault_ecdh_pub = ''`,
    )
    .run(
      v.ecdhPublic,
      v.ecdsaPublic,
      JSON.stringify(v.privWrap),
      JSON.stringify(v.recoveryWrap),
      v.fingerprint,
      accountId,
    );
  return { ok: true };
}

export function updateVaultWraps(
  accountId: string,
  patch: { privWrap?: PassWrap; recoveryWrap?: PassWrap },
): { ok: true } | { error: string } {
  if (!getVaultRecord(accountId)) return { error: "Coffre absent." };
  if (patch.privWrap) {
    db()
      .prepare("UPDATE mail_accounts SET vault_priv_wrap = ? WHERE id = ?")
      .run(JSON.stringify(patch.privWrap), accountId);
  }
  if (patch.recoveryWrap) {
    db()
      .prepare("UPDATE mail_accounts SET vault_recovery_wrap = ? WHERE id = ?")
      .run(JSON.stringify(patch.recoveryWrap), accountId);
  }
  return { ok: true };
}

export function issueVaultChallenge(accountId: string): { nonce: string } {
  const nonce = crypto.randomBytes(32).toString("base64url");
  db()
    .prepare("DELETE FROM mail_vault_challenges WHERE account_id = ? OR expires_at < ?")
    .run(accountId, now());
  db()
    .prepare(
      "INSERT INTO mail_vault_challenges (id, account_id, nonce, expires_at) VALUES (?, ?, ?, ?)",
    )
    .run(uid(), accountId, nonce, new Date(Date.now() + 120_000).toISOString());
  return { nonce };
}

export function consumeVaultChallenge(accountId: string, nonce: string): boolean {
  const row = db()
    .prepare(
      "SELECT id, expires_at FROM mail_vault_challenges WHERE account_id = ? AND nonce = ?",
    )
    .get(accountId, nonce) as { id: string; expires_at: string } | undefined;
  if (!row) return false;
  db().prepare("DELETE FROM mail_vault_challenges WHERE id = ?").run(row.id);
  return row.expires_at >= now();
}

export type MailKeyStatus = "ok" | "no-vault" | "missing";

export function lookupMailKeys(emails: string[]): { email: string; status: MailKeyStatus; ecdhPublic?: string }[] {
  return emails.slice(0, 20).map((raw) => {
    const email = raw.trim().toLowerCase();
    if (!INTERNAL_RE.test(email)) return { email, status: "missing" as const };
    const acc = getAccountByEmail(email);
    if (!acc || acc.status !== "active") return { email, status: "missing" as const };
    const pub = vaultPublicKey(acc.id);
    if (!pub) return { email, status: "no-vault" as const };
    return { email, status: "ok" as const, ecdhPublic: pub };
  });
}

/** Scelle les messages encore lisibles par le serveur dans le coffre du compte. */
export async function migrateLegacyToVault(accountId: string): Promise<number> {
  const pub = vaultPublicKey(accountId);
  if (!pub) return 0;
  const rows = db()
    .prepare(
      "SELECT id, subject_enc, body_enc FROM mail_messages WHERE account_id = ? AND enc = 0",
    )
    .all(accountId) as { id: string; subject_enc: string; body_enc: string }[];
  let n = 0;
  for (const row of rows) {
    const sealed = await sealText(pub, decryptText(row.subject_enc), decryptText(row.body_enc));
    db()
      .prepare(
        `UPDATE mail_messages
         SET enc = 1, subject_enc = ?, body_enc = ?, wraps = ?
         WHERE id = ? AND account_id = ? AND enc = 0`,
      )
      .run(
        JSON.stringify(sealed.subjectCipher),
        JSON.stringify(sealed.bodyCipher),
        JSON.stringify(sealed.wrap),
        row.id,
        accountId,
      );
    n++;
  }
  return n;
}

type UploadRow = {
  id: string;
  byte_size: number;
  sha256: string;
  file_iv: string;
  name_iv: string;
  name_ct: string;
  data: unknown;
};

export function saveUploadBlob(
  accountId: string,
  opts: { bytes: Buffer; fileIv: string; nameIv: string; nameCt: string },
): { id: string } | { error: string } {
  if (opts.bytes.length < 16 || opts.bytes.length > MAX_CIPHER_BYTES) {
    return { error: "Pièce jointe trop lourde — 3 Mo maximum." };
  }
  if (![opts.fileIv, opts.nameIv, opts.nameCt].every((s) => typeof s === "string" && s.length > 8 && s.length < 8000)) {
    return { error: "En-tête de pièce jointe invalide." };
  }
  db()
    .prepare("DELETE FROM mail_upload_blobs WHERE created_at < ?")
    .run(new Date(Date.now() - 24 * 3600_000).toISOString());
  const id = uid();
  const sha = crypto.createHash("sha256").update(opts.bytes).digest("hex");
  db()
    .prepare(
      `INSERT INTO mail_upload_blobs
       (id, account_id, byte_size, sha256, file_iv, name_iv, name_ct, data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, accountId, opts.bytes.length, sha, opts.fileIv, opts.nameIv, opts.nameCt, opts.bytes, now());
  return { id };
}

function loadOwnedBlobs(accountId: string, ids: string[]): UploadRow[] | { error: string } {
  if (ids.length > MAX_ATTACHMENTS) return { error: "3 pièces jointes maximum." };
  if (new Set(ids).size !== ids.length) return { error: "Pièce jointe en double." };
  const out: UploadRow[] = [];
  for (const id of ids) {
    if (!/^[a-f0-9]{24}$/.test(id)) return { error: "Pièce jointe invalide." };
    const row = db()
      .prepare("SELECT * FROM mail_upload_blobs WHERE id = ? AND account_id = ?")
      .get(id, accountId) as UploadRow | undefined;
    if (!row) return { error: "Pièce jointe expirée — joignez le fichier à nouveau." };
    const bytes = asBuffer(row.data);
    const sha = crypto.createHash("sha256").update(bytes).digest("hex");
    if (sha !== row.sha256 || bytes.length !== Number(row.byte_size) || bytes.length > MAX_CIPHER_BYTES) {
      return { error: "Pièce jointe altérée." };
    }
    out.push({ ...row, data: bytes });
  }
  return out;
}

function attachBlobs(messageId: string, accountId: string, blobs: UploadRow[]) {
  const stmt = db().prepare(
    `INSERT INTO mail_attachments
     (id, message_id, account_id, name_iv, name_ct, file_iv, byte_size, sha256, data, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const b of blobs) {
    stmt.run(
      uid(),
      messageId,
      accountId,
      b.name_iv,
      b.name_ct,
      b.file_iv,
      Number(b.byte_size),
      b.sha256,
      asBuffer(b.data),
      now(),
    );
  }
}

function dropUploads(accountId: string, ids: string[]) {
  const stmt = db().prepare("DELETE FROM mail_upload_blobs WHERE account_id = ? AND id = ?");
  for (const id of ids) stmt.run(accountId, id);
}

export function readAttachment(
  accountId: string,
  id: string,
): { bytes: Buffer; byteSize: number } | null {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  const row = db()
    .prepare(
      "SELECT data, sha256, byte_size FROM mail_attachments WHERE id = ? AND account_id = ?",
    )
    .get(accountId, id) as { data: unknown; sha256: string; byte_size: number } | undefined;
  if (!row) return null;
  const bytes = asBuffer(row.data);
  const sha = crypto.createHash("sha256").update(bytes).digest("hex");
  if (sha !== row.sha256) return null;
  return { bytes, byteSize: Number(row.byte_size) };
}

function insertSealed(m: {
  threadId: string;
  accountId: string;
  folder: string;
  from: string;
  fromName?: string;
  to: string[];
  subjectCipher: CipherPack;
  bodyCipher: CipherPack;
  wrap: KeyWrap;
  read?: boolean;
  kind?: string;
}): string {
  const id = uid();
  db()
    .prepare(
      `INSERT INTO mail_messages
       (id, thread_id, account_id, folder, from_addr, from_name, to_addrs, subject_enc, body_enc, is_read, is_starred, kind, created_at, enc, wraps)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1, ?)`,
    )
    .run(
      id,
      m.threadId,
      m.accountId,
      m.folder,
      m.from,
      m.fromName || "",
      JSON.stringify(m.to),
      JSON.stringify(m.subjectCipher),
      JSON.stringify(m.bodyCipher),
      m.read ? 1 : 0,
      m.kind || "mail",
      now(),
      JSON.stringify(m.wrap),
    );
  return id;
}

function validCipher(p: CipherPack | undefined, max = 500_000): p is CipherPack {
  return !!p && typeof p.iv === "string" && typeof p.ct === "string" && p.iv.length < 64 && p.ct.length > 0 && p.ct.length <= max;
}

function validWrap(w: KeyWrap | undefined): w is KeyWrap {
  return !!w && [w.ek, w.iv, w.ct].every((s) => typeof s === "string" && s.length > 8 && s.length < 8000);
}

async function insertSealedNotice(
  accountId: string,
  email: string,
  subject: string,
  body: string,
) {
  const pub = vaultPublicKey(accountId);
  if (!pub) {
    insertMessage({
      threadId: uid(),
      accountId,
      folder: "inbox",
      from: MAILER_DAEMON,
      fromName: "Ayeba Mail — Remise",
      to: [email],
      subject,
      body,
      kind: "bounce",
    });
    return;
  }
  const sealed = await sealText(pub, subject, body);
  insertSealed({
    threadId: uid(),
    accountId,
    folder: "inbox",
    from: MAILER_DAEMON,
    fromName: "Ayeba Mail — Remise",
    to: [email],
    subjectCipher: sealed.subjectCipher,
    bodyCipher: sealed.bodyCipher,
    wrap: sealed.wrap,
    kind: "bounce",
  });
}

export type SealedAttachmentIn = {
  name: string;
  mime: string;
  data: Buffer;
};

export type SealedDelivery = {
  draft?: boolean;
  to: string[];
  subjectCipher: CipherPack;
  bodyCipher: CipherPack;
  wraps: Record<string, KeyWrap>;
  blobIds: string[];
  externalAck?: boolean;
  external?: { subject: string; body: string; files: SealedAttachmentIn[] } | null;
};

export async function deliverSealedMail(
  sender: MailAccount,
  input: SealedDelivery,
): Promise<SendResult & { error?: string }> {
  const empty = { ok: false, delivered: [] as string[], bounced: [] as { address: string; reason: string }[], externals: [] as string[] };
  if (!vaultPublicKey(sender.id)) return { ...empty, error: "Activez le coffre avant d'envoyer." };
  if (!validCipher(input.subjectCipher, 20_000) || !validCipher(input.bodyCipher)) {
    return { ...empty, error: "Message chiffré invalide." };
  }
  const selfWrap = input.wraps[sender.email];
  if (!validWrap(selfWrap)) return { ...empty, error: "Votre copie chiffrée est absente." };

  const blobs = loadOwnedBlobs(sender.id, input.blobIds || []);
  if ("error" in blobs) return { ...empty, error: blobs.error };

  const threadId = uid();
  const senderName = sender.displayName || sender.address;

  if (input.draft) {
    const id = insertSealed({
      threadId,
      accountId: sender.id,
      folder: "drafts",
      from: sender.email,
      fromName: senderName,
      to: input.to.map((t) => t.trim().toLowerCase()).filter(Boolean),
      subjectCipher: input.subjectCipher,
      bodyCipher: input.bodyCipher,
      wrap: selfWrap,
      read: true,
    });
    attachBlobs(id, sender.id, blobs);
    dropUploads(sender.id, blobs.map((b) => b.id));
    return { ok: true, delivered: [], bounced: [], externals: [] };
  }

  const delivered: string[] = [];
  const bounced: { address: string; reason: string }[] = [];
  const externals: string[] = [];
  const cleanTo = [...new Set(input.to.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  if (!cleanTo.length) return { ...empty, error: "Destinataire requis." };
  if (cleanTo.length > 20) return { ...empty, error: "Trop de destinataires." };

  const internals: MailAccount[] = [];
  for (const addr of cleanTo) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
      bounced.push({ address: addr, reason: "Adresse invalide" });
      continue;
    }
    if (INTERNAL_RE.test(addr)) {
      const acc = getAccountByEmail(addr);
      if (!acc || acc.status !== "active") {
        bounced.push({ address: addr, reason: "Ce compte Ayeba Mail n'existe pas" });
      } else if (!vaultPublicKey(acc.id)) {
        bounced.push({ address: addr, reason: "Ce correspondant n'a pas activé le coffre de bout en bout" });
      } else if (!validWrap(input.wraps[addr])) {
        bounced.push({ address: addr, reason: "Enveloppe de chiffrement manquante pour ce correspondant" });
      } else {
        internals.push(acc);
      }
    } else if (!smtpConfigured()) {
      bounced.push({
        address: addr,
        reason: "Remise externe indisponible — relais SMTP non configuré sur le serveur",
      });
    } else if (!input.externalAck || !input.external) {
      bounced.push({
        address: addr,
        reason: "Envoi externe refusé — le message quitte le coffre, la confirmation manque",
      });
    } else {
      externals.push(addr);
    }
  }

  const sentId = insertSealed({
    threadId,
    accountId: sender.id,
    folder: "sent",
    from: sender.email,
    fromName: senderName,
    to: cleanTo,
    subjectCipher: input.subjectCipher,
    bodyCipher: input.bodyCipher,
    wrap: selfWrap,
    read: true,
  });
  attachBlobs(sentId, sender.id, blobs);

  for (const acc of internals) {
    const id = insertSealed({
      threadId,
      accountId: acc.id,
      folder: "inbox",
      from: sender.email,
      fromName: senderName,
      to: cleanTo,
      subjectCipher: input.subjectCipher,
      bodyCipher: input.bodyCipher,
      wrap: input.wraps[acc.email],
    });
    attachBlobs(id, acc.id, blobs);
    delivered.push(acc.email);
  }

  if (externals.length && input.external) {
    const { sendExternalMail } = await import("@/lib/mail/smtp");
    const files = (input.external.files || []).slice(0, MAX_ATTACHMENTS);
    const tooHeavy = files.some((f) => f.data.length > MAX_CIPHER_BYTES)
      || files.reduce((n, f) => n + f.data.length, 0) > MAX_CIPHER_BYTES * MAX_ATTACHMENTS;
    const attachments = tooHeavy
      ? []
      : files.map((f) => ({
          filename: f.name.replace(/[\r\n"\\/]/g, "").slice(0, 120) || "piece-jointe",
          content: f.data,
          contentType: /^[\w.+-]+\/[\w.+-]+$/.test(f.mime) ? f.mime : "application/octet-stream",
        }));
    const subject = input.external.subject.trim().slice(0, 300) || "(sans objet)";
    const text = input.external.body.slice(0, 50_000);
    for (const addr of externals) {
      if (tooHeavy) {
        bounced.push({ address: addr, reason: "Pièce jointe externe trop lourde" });
        await insertSealedNotice(
          sender.id,
          sender.email,
          "Échec de remise",
          `La pièce jointe dépasse la taille autorisée pour une adresse externe.\n\nDestinataire : ${addr}`,
        );
        continue;
      }
      const res = await sendExternalMail({
        from: sender.email,
        fromName: senderName,
        to: addr,
        subject,
        text,
        replyTo: sender.email,
        attachments,
      });
      if (res.ok) delivered.push(addr);
      else {
        bounced.push({ address: addr, reason: res.error });
        await insertSealedNotice(
          sender.id,
          sender.email,
          `Échec de remise : ${subject}`,
          `Votre message n'a pas pu être remis au destinataire externe.\n\nDestinataire : ${addr}\nRaison : ${res.error}.`,
        );
      }
    }
  }

  for (const b of bounced) {
    if (externals.includes(b.address) && input.external) continue;
    await insertSealedNotice(
      sender.id,
      sender.email,
      "Échec de remise",
      `Un destinataire n'a pas reçu le message.\n\nDestinataire : ${b.address}\nRaison : ${b.reason}.`,
    );
  }

  dropUploads(sender.id, blobs.map((b) => b.id));
  return { ok: delivered.length > 0, delivered, bounced, externals: [] };
}
