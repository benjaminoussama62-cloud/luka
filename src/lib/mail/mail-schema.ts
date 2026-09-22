/**
 * Ayeba Mail — schéma base de données.
 * Modèle « une copie par boîte » : chaque message existe en une ligne pour
 * l'expéditeur (dossier sent) et une ligne par destinataire (dossier inbox) —
 * comme les vraies boîtes, chacun gère sa copie (lu, étoile, corbeille).
 */
import type { AyebaDatabase } from "@/lib/storage/database";

export const MAIL_SCHEMA = `
CREATE TABLE IF NOT EXISTS mail_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  address TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_login_at TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_mail_accounts_email ON mail_accounts(email);
CREATE INDEX IF NOT EXISTS idx_mail_accounts_phone ON mail_accounts(phone);

CREATE TABLE IF NOT EXISTS mail_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mail_verif_phone ON mail_verifications(phone, expires_at);

CREATE TABLE IF NOT EXISTS mail_threads (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mail_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES mail_accounts(id) ON DELETE CASCADE,
  folder TEXT NOT NULL DEFAULT 'inbox',
  from_addr TEXT NOT NULL,
  from_name TEXT NOT NULL DEFAULT '',
  to_addrs TEXT NOT NULL DEFAULT '[]',
  subject_enc TEXT NOT NULL DEFAULT '',
  body_enc TEXT NOT NULL DEFAULT '',
  is_read INTEGER NOT NULL DEFAULT 0,
  is_starred INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'mail',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mail_msg_box ON mail_messages(account_id, folder, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_msg_thread ON mail_messages(account_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_mail_msg_unread ON mail_messages(account_id, folder, is_read);
`;

export function applyMailSchema(db: AyebaDatabase) {
  for (const raw of MAIL_SCHEMA.split(";")) {
    const stmt = raw.trim();
    if (!stmt) continue;
    try {
      db.exec(stmt);
    } catch (e) {
      console.warn("[db] mail schema statement skipped:", (e as Error).message);
    }
  }
}
