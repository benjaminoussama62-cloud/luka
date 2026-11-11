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
  const { findUserById } = await import("@/lib/db");
  const u = await findUserById(userId);
  const cardName = ((u?.name as string) || u?.email?.split("@")[0] || "TITULAIRE").toUpperCase().slice(0, 26);
  const pan = genPan();
  const exp = new Date();
  const expiry = `${String(exp.getMonth() + 1).padStart(2, "0")}/${String(exp.getFullYear() + 3).slice(2)}`;
  const cvv = crypto.randomInt(100, 999).toString();
  const id = `card_${crypto.randomBytes(8).toString("hex")}`;
  await d.run(
    `INSERT INTO money_cards (id, user_id, wallet_id, pan_hash, pan_last4, pan_full, expiry, cvv, card_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, wallet.id, crypto.createHash("sha256").update(pan).digest("hex"),
     pan.slice(-4), pan, expiry, cvv, cardName, new Date().toISOString()],
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
    name: String(c.card_name || ""),
    status: String(c.status),
    partners: Object.keys(PARTNER_MERCHANTS),
  };
}

export async function setCardStatus(userId: string, status: "active" | "frozen") {
  const d = await moneyDb();
  await d.run("UPDATE money_cards SET status = ? WHERE user_id = ?", [status, userId]);
  return { status };
}

/**
 * Paiement carte en 2 étapes — OTP à usage unique envoyé par Ayeba Mail
 * (code différent à CHAQUE opération, distinct du PIN de l'app).
 */
export async function startCardSpend(input: {
  userId: string; partner: string; amountMinor: number; currency: MoneyCurrency;
  ip?: string; userAgent?: string;
}) {
  const merchant = PARTNER_MERCHANTS[input.partner.toLowerCase()];
  if (!merchant) {
    throw new MoneyError("bad_partner", "Marchand non partenaire — la carte fonctionne chez Sombateka, Omega, Tala, Jemsa et Ayeba", 400);
  }
  const card = await getCard(input.userId);
  if (!card) throw new MoneyError("no_card", "Crée d'abord ta carte virtuelle", 400);
  if (card.status !== "active") throw new MoneyError("card_frozen", "Carte gelée — réactive-la dans les paramètres", 403);

  const code = crypto.randomInt(0, 1e6).toString().padStart(6, "0");
  const otpId = `otp_${crypto.randomBytes(8).toString("hex")}`;
  const d = await moneyDb();
  await d.run(
    `INSERT INTO money_otps (id, user_id, purpose, code_hash, payload, expires_at, created_at)
     VALUES (?, ?, 'card_spend', ?, ?, ?, ?)`,
    [otpId, input.userId, crypto.createHash("sha256").update(code).digest("hex"),
     JSON.stringify({ partner: input.partner, amountMinor: input.amountMinor, currency: input.currency }),
     new Date(Date.now() + 5 * 60_000).toISOString(), new Date().toISOString()],
  );
  const wallet = await getOrCreateWallet(input.userId);
  const { notifyUser } = await import("./notify");
  await notifyUser(input.userId, wallet.id, `Code de paiement : ${code}`, [
    `Votre code à usage unique pour payer ${minorToMajorString(input.amountMinor, input.currency)}`,
    `${input.currency} chez ${merchant} :`,
    "",
    `    ${code}`,
    "",
    "Valable 5 minutes, une seule fois. Ne le partagez à personne.",
    "Si ce n'est pas vous, ignorez ce mail et gelez votre carte.",
  ]);
  return { otpId, sent: true, expiresInSec: 300 };
}

export async function confirmCardSpend(input: {
  userId: string; otpId: string; code: string; idemKey: string;
  ip?: string; userAgent?: string;
}) {
  const d = await moneyDb();
  const row = (await d.get(
    "SELECT * FROM money_otps WHERE id = ? AND user_id = ? AND purpose = 'card_spend'",
    [input.otpId, input.userId],
  )) as Record<string, unknown> | undefined;
  if (!row || row.used_at) throw new MoneyError("otp_invalid", "Code invalide ou déjà utilisé", 403);
  if (new Date(String(row.expires_at)).getTime() < Date.now()) throw new MoneyError("otp_expired", "Code expiré — recommence l'opération", 403);
  if (Number(row.attempts) >= 3) throw new MoneyError("otp_locked", "Trop de tentatives — recommence l'opération", 429);
  const hash = crypto.createHash("sha256").update(input.code).digest("hex");
  if (hash !== row.code_hash) {
    await d.run("UPDATE money_otps SET attempts = attempts + 1 WHERE id = ?", [input.otpId]);
    throw new MoneyError("otp_wrong", "Code incorrect", 403);
  }
  await d.run("UPDATE money_otps SET used_at = ? WHERE id = ?", [new Date().toISOString(), input.otpId]);
  const p = JSON.parse(String(row.payload)) as { partner: string; amountMinor: number; currency: MoneyCurrency };
  const card = await getCard(input.userId);
  const { executeTransfer } = await import("./core");
  const { tx } = await executeTransfer({
    userId: input.userId,
    to: `user:${p.partner}`,
    amountMinor: p.amountMinor,
    currency: p.currency,
    pin: undefined,
    otpVerified: true,
    idemKey: input.idemKey,
    meta: { card: true, partner: p.partner, merchant: PARTNER_MERCHANTS[p.partner], last4: card?.last4 },
    ip: input.ip,
    userAgent: input.userAgent,
  });
  return { txId: tx.id, merchant: PARTNER_MERCHANTS[p.partner], amount: minorToMajorString(p.amountMinor, p.currency) };
}
