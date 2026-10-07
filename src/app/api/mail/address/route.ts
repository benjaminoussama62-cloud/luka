import { NextResponse } from "next/server";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { addressAvailable, validateAddress } from "@/lib/mail/mail";

/** Disponibilité d'une adresse — l'inscription Mail n'exige pas de session préalable. */
export async function GET(req: Request) {
  if (!rateLimit(`mail-address:${clientIp(req)}`, 40, 60_000)) return rateLimitResponse();
  const local = new URL(req.url).searchParams.get("local") || "";
  const check = validateAddress(local);
  if (!check.ok) return NextResponse.json({ ok: false, reason: check.reason });
  return NextResponse.json({ ok: true, available: addressAvailable(local.toLowerCase()) });
}
