/** HMAC-SHA256 helpers shared by payment webhooks and ad tracking. */
import { createHmac, timingSafeEqual } from "node:crypto";

export function hmacSha256(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Secret dedicated to signing — falls back to AUTH_SECRET so it always exists in prod. */
export function signingSecret(): string {
  const s =
    process.env.AYEBA_SIGNING_SECRET ||
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "development" ? "ayeba-dev-secret-min-32-chars!!" : "");
  if (!s) throw new Error("AYEBA_SIGNING_SECRET / AUTH_SECRET manquant");
  return s;
}
