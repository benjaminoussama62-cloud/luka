import { NextResponse } from "next/server";
import { checkSameOrigin, ipOf, moneyError, requireMoneyUser } from "@/lib/money/http";
import { audit, getOrCreateWallet, setPin } from "@/lib/money/core";
import { isValidPinFormat } from "@/lib/money/pin";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/money/pin — définit le PIN ({pin}) ou le change
 * ({pin, currentPin}). Jamais de PIN en clair stocké ni loggé.
 */
export async function POST(req: Request) {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;
  const csrf = checkSameOrigin(req);
  if (csrf) return csrf;
  if (!rateLimit(`money-pin:${user.id}:${clientIp(req)}`, 8, 60_000)) {
    return rateLimitResponse();
  }

  let body: { pin?: string; currentPin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  if (!isValidPinFormat(body.pin)) {
    return NextResponse.json({ error: "Le PIN doit contenir exactement 4 chiffres" }, { status: 400 });
  }

  try {
    const existed = Boolean((await getOrCreateWallet(user.id)).pin_hash);
    await setPin(user.id, body.pin, body.currentPin);
    const wallet = await getOrCreateWallet(user.id);
    await audit(
      user.id,
      wallet.id,
      existed ? "pin_change" : "pin_setup",
      {},
      ipOf(req),
      req.headers.get("user-agent") || "",
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return moneyError(e);
  }
}
