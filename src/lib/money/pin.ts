/**
 * Ayeba Mbongo — PIN 4 chiffres.
 *
 * Un PIN n'a que 10 000 combinaisons : le bcrypt seul ne suffit pas si la base
 * fuite (crackage offline en quelques secondes). On poivre donc le PIN par un
 * HMAC serveur AVANT le bcrypt — sans AYEBA_SIGNING_SECRET, les hashs stockés
 * ne permettent aucune attaque hors-ligne.
 *
 * La vraie défense en ligne reste le verrouillage progressif : 3 échecs →
 * pause courte, chaque nouveau palier double l'attente (plafond 1 h).
 */
import bcrypt from "bcryptjs";
import { hmacSha256, signingSecret } from "@/lib/security/sign";

const PIN_RE = /^\d{4}$/;

/** Échecs avant le premier verrouillage, puis attentes par palier (ms). */
export const PIN_MAX_FREE_ATTEMPTS = 3;
const LOCK_STEPS_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];

export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === "string" && PIN_RE.test(pin);
}

/** Digest poivré : lie le PIN à l'utilisateur ET au secret serveur. */
function pinDigest(userId: string, pin: string): string {
  return hmacSha256(signingSecret(), `money-pin:${userId}:${pin}`);
}

export async function hashPin(userId: string, pin: string): Promise<string> {
  return bcrypt.hash(pinDigest(userId, pin), 10);
}

export async function checkPin(userId: string, pin: string, pinHash: string): Promise<boolean> {
  if (!isValidPinFormat(pin) || !pinHash) return false;
  try {
    return await bcrypt.compare(pinDigest(userId, pin), pinHash);
  } catch {
    return false;
  }
}

/**
 * Calcule l'état de verrouillage après un échec/succès.
 * `attempts`/`level`/`lockedUntil` viennent de money_wallets.
 */
export function pinLockState(wallet: {
  pin_attempts: number;
  pin_lock_level: number;
  pin_locked_until: string | null;
}):
  | { locked: true; retryAfterSec: number }
  | { locked: false } {
  if (wallet.pin_locked_until) {
    const waitMs = new Date(wallet.pin_locked_until).getTime() - Date.now();
    if (waitMs > 0) return { locked: true, retryAfterSec: Math.ceil(waitMs / 1000) };
  }
  return { locked: false };
}

export function pinFailureUpdate(wallet: {
  pin_attempts: number;
  pin_lock_level: number;
}): { pin_attempts: number; pin_lock_level: number; pin_locked_until: string | null } {
  const attempts = wallet.pin_attempts + 1;
  if (attempts < PIN_MAX_FREE_ATTEMPTS) {
    return { pin_attempts: attempts, pin_lock_level: wallet.pin_lock_level, pin_locked_until: null };
  }
  const level = Math.min(wallet.pin_lock_level, LOCK_STEPS_MS.length - 1);
  return {
    pin_attempts: 0,
    pin_lock_level: wallet.pin_lock_level + 1,
    pin_locked_until: new Date(Date.now() + LOCK_STEPS_MS[level]).toISOString(),
  };
}
