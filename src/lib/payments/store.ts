/**
 * Persistence helpers for the payment layer.
 * Adds provider columns on `transactions` and a `payment_events`
 * table used for webhook idempotency (never process an event twice).
 */

import { getDb } from "@/lib/storage/database";
import type { PaymentProviderName } from "./types";

let schemaReady = false;

export function ensurePaymentsSchema() {
  if (schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      event_id TEXT NOT NULL,
      transaction_id TEXT NOT NULL,
      status TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      processed_at TEXT NOT NULL,
      UNIQUE(provider, event_id)
    );
    CREATE INDEX IF NOT EXISTS idx_payment_events_tx ON payment_events(transaction_id);
  `);
  for (const col of [
    "ALTER TABLE transactions ADD COLUMN provider TEXT",
    "ALTER TABLE transactions ADD COLUMN provider_ref TEXT",
    "ALTER TABLE transactions ADD COLUMN checkout_url TEXT",
  ]) {
    try {
      db.exec(col);
    } catch {
      /* column already exists */
    }
  }
  schemaReady = true;
}

/** Attach provider + checkout url to a pending transaction. */
export function attachProviderRef(
  transactionId: string,
  provider: PaymentProviderName,
  providerRef: string,
  checkoutUrl?: string,
) {
  ensurePaymentsSchema();
  getDb()
    .prepare(
      "UPDATE transactions SET provider = ?, provider_ref = ?, checkout_url = ? WHERE id = ?",
    )
    .run(provider, providerRef, checkoutUrl ?? null, transactionId);
}

export function findTransactionByRef(provider: string, ref: string) {
  ensurePaymentsSchema();
  return getDb()
    .prepare("SELECT * FROM transactions WHERE provider = ? AND provider_ref = ?")
    .get(provider, ref) as { id: string } | undefined;
}

/**
 * Record a verified webhook event. Returns false when the event was
 * already processed (idempotency guard — providers retry webhooks).
 */
export function recordPaymentEvent(input: {
  provider: PaymentProviderName;
  eventId: string;
  transactionId: string;
  status: "paid" | "failed";
  payload: string;
}): boolean {
  ensurePaymentsSchema();
  try {
    getDb()
      .prepare(
        `INSERT INTO payment_events (provider, event_id, transaction_id, status, payload, processed_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.provider,
        input.eventId,
        input.transactionId,
        input.status,
        input.payload.slice(0, 16_000),
        new Date().toISOString(),
      );
    return true;
  } catch {
    return false; // UNIQUE(provider, event_id) violation → duplicate delivery
  }
}
