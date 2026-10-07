/**
 * Ayeba Money — schéma base de données.
 *
 * Modèle « grand livre » :
 *  - money_transactions = journal immuable des opérations (jamais de UPDATE
 *    destructif sur le montant ; seul status évolue selon la machine à états).
 *  - money_entries = écritures double-entrée (chaque transaction crédite et/ou
 *    débite). SUM(entries) recalcule toujours le solde — un solde peut donc
 *    être audité et un écart détecté à tout moment.
 *  - money_balances = cache matérialisé du solde, gardé par CHECK >= 0 et par
 *    des UPDATE conditionnels (amount_minor >= ?) — un découvert est
 *    structurellement impossible, même sous requêtes simultanées.
 *  - money_events = déduplication des webhooks (UNIQUE provider+event_id).
 *  - money_idem = clés d'idempotence client (rejeu → même réponse).
 *  - money_audit = piste d'audit append-only.
 */
import type { AyebaDatabase } from "@/lib/storage/database";

export const MONEY_SCHEMA = `
CREATE TABLE IF NOT EXISTS money_wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE,
  pin_hash TEXT NOT NULL DEFAULT '',
  pin_attempts INTEGER NOT NULL DEFAULT 0,
  pin_lock_level INTEGER NOT NULL DEFAULT 0,
  pin_locked_until TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','frozen','closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_money_wallets_handle ON money_wallets(handle);

CREATE TABLE IF NOT EXISTS money_balances (
  wallet_id TEXT NOT NULL REFERENCES money_wallets(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK(currency IN ('USD','CDF')),
  amount_minor INTEGER NOT NULL DEFAULT 0 CHECK(amount_minor >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (wallet_id, currency)
);

CREATE TABLE IF NOT EXISTS money_transactions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('transfer','deposit','withdrawal','reversal')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','failed','reversed')),
  currency TEXT NOT NULL CHECK(currency IN ('USD','CDF')),
  amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
  from_wallet_id TEXT REFERENCES money_wallets(id),
  to_wallet_id TEXT REFERENCES money_wallets(id),
  parent_id TEXT REFERENCES money_transactions(id),
  provider TEXT,
  provider_ref TEXT,
  checkout_url TEXT,
  -- Référence seulement : la dédup est assurée par money_idem (scopée
  -- user+endpoint+key). Pas de UNIQUE ici — une clé d'un utilisateur ne doit
  -- pas pouvoir collisionner avec celle d'un autre.
  idem_key TEXT,
  meta TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_money_tx_from ON money_transactions(from_wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_money_tx_to ON money_transactions(to_wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_money_tx_provider_ref ON money_transactions(provider, provider_ref);
CREATE INDEX IF NOT EXISTS idx_money_tx_pending ON money_transactions(status, kind);

CREATE TABLE IF NOT EXISTS money_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL REFERENCES money_transactions(id),
  wallet_id TEXT NOT NULL REFERENCES money_wallets(id),
  currency TEXT NOT NULL,
  delta_minor INTEGER NOT NULL,
  balance_after_minor INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_money_entries_wallet ON money_entries(wallet_id, id);
CREATE INDEX IF NOT EXISTS idx_money_entries_tx ON money_entries(transaction_id);

CREATE TABLE IF NOT EXISTS money_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  signature_valid INTEGER NOT NULL DEFAULT 1,
  payload TEXT NOT NULL DEFAULT '',
  processed_at TEXT NOT NULL,
  UNIQUE(provider, event_id)
);

CREATE TABLE IF NOT EXISTS money_idem (
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  transaction_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, endpoint, key)
);

CREATE TABLE IF NOT EXISTS money_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL DEFAULT '',
  wallet_id TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_money_audit_user ON money_audit(user_id, id);
`;

export function applyMoneySchema(db: AyebaDatabase) {
  for (const raw of MONEY_SCHEMA.split(";")) {
    const stmt = raw.trim();
    if (!stmt) continue;
    try {
      db.exec(stmt);
    } catch (e) {
      console.warn("[db] money schema statement skipped:", (e as Error).message);
    }
  }
}
