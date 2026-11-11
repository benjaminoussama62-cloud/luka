/**
 * Ayeba Mbongo — carte virtuelle partenaire.
 * PAN Luhn-valide (BIN 6043), liée au solde du portefeuille.
 */
import crypto from "crypto";
import { moneyDb } from "./db";
import { MoneyError, audit, getOrCreateWallet, requirePin } from "./core";
import { minorToMajorString, type MoneyCurrency } from "./amounts";

const BIN = "604311";

export const PARTNER_MERCHANTS: Record<string, string> = {
  sombateka: "sombatekaonline.com",
  omega: "omega-web.org",
  tala: "tala.cd",
  jemsa: "jemsa.net",
  ayeba: "ayeba.app",
};

function luhnDigit(num: string): number {
  let sum = 0;
  for (let i = 0; i < num.length; i++) {
    let d = Number(num[num.length - 1 - i]);
    if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
}

function genPan(): string {
  const body = BIN + crypto.randomInt(0, 1e9).toString().padStart(9, "0");
  return body + luhnDigit(body);
}

export async function issueCard(userId: string, pin: unknown) {
  await requirePin(userId, pin);
  const d = await moneyDb();
  const existing = await d.get("SELECT id FROM money_cards WHERE user_id = ?", [userId]);
  if (existing) throw new MoneyError("card_exists", "Carte déjà créée", 409);
  const wallet = await getOrCreateWallet(userId);
  const pan = genPan();
  const exp = new Date();
  const expiry = `${String(exp.getMonth() + 1).padStart(2, "0")}/${String(exp.getFullYear() + 3).slice(2)}`;
  const cvv = crypto.randomInt(100, 999).toString();
  const id = `card_${crypto.randomBytes(8).toString("hex")}`;
  await d.run(
    `INSERT INTO money_cards (id, user_id, wallet_id, pan_hash, pan_last4, pan_full, expiry, cvv, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, wallet.id, crypto.createHash("sha256").update(pan).digest("hex"),
     pan.slice(-4), pan, expiry, cvv, new Date().toISOString()],
  );
  await audit(userId, wallet.id, "card_issue", { last4: pan.slice(-4) });
  return { id, last4: pan.slice(-4) };
}

export async function getCard(userId: string, pin?: unknown) {
  const d = await moneyDb();
  const c = (await d.get("SELECT * FROM money_cards WHERE user_id = ?", [userId])) as
    | Record<string, unknown> | undefined;
  if (!c) return null;
  const revealed = pin !== undefined;
  if (revealed) await requirePin(userId, pin);
  return {
    last4: String(c.pan_last4),
    number: revealed ? String(c.pan_full) : `•••• •••• •••• ${c.pan_last4}`,
    expiry: revealed ? String(c.expiry) : "••/••",
    cvv: revealed ? String(c.cvv) : "•••",
    brand: String(c.brand),
    status: String(c.status),
    partners: Object.keys(PARTNER_MERCHANTS),
  };
}

export async function setCardStatus(userId: string, status: "active" | "frozen") {
  const d = await moneyDb();
  await d.run("UPDATE money_cards SET status = ? WHERE user_id = ?", [status, userId]);
  return { status };
}

/** Débit carte = débit du solde portefeuille chez un partenaire. */
export async function cardSpend(input: {
  userId: string;
  partner: string;
  amountMinor: number;
  currency: MoneyCurrency;
  pin: unknown;
  idemKey: string;
  ip?: string;
  userAgent?: string;
}) {
  const merchant = PARTNER_MERCHANTS[input.partner.toLowerCase()];
  if (!merchant) {
    throw new MoneyError("bad_partner", "Marchand non partenaire — la carte fonctionne chez Sombateka, Omega, Tala, Jemsa et Ayeba", 400);
  }
  const card = await getCard(input.userId);
  if (!card) throw new MoneyError("no_card", "Crée d'abord ta carte virtuelle", 400);
  if (card.status !== "active") throw new MoneyError("card_frozen", "Carte gelée — réactive-la dans les paramètres", 403);
  const { executeTransfer } = await import("./core");
  const { tx } = await executeTransfer({
    userId: input.userId,
    to: `user:${input.partner}`,
    amountMinor: input.amountMinor,
    currency: input.currency,
    pin: input.pin,
    idemKey: input.idemKey,
    meta: { card: true, partner: input.partner, merchant, last4: card.last4 },
    ip: input.ip,
    userAgent: input.userAgent,
  });
  return { txId: tx.id, merchant, amount: minorToMajorString(input.amountMinor, input.currency) };
}
