import { NextResponse } from "next/server";
import { checkSameOrigin, ipOf, moneyError, requireMoneyUser } from "@/lib/money/http";
import { resetPinWithPassword } from "@/lib/money/features";
import { isValidPinFormat } from "@/lib/money/pin";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** POST /api/money/pin-reset — {password, pin} : oubli du PIN, vérifié par le mot de passe du compte. */
export async function POST(req: Request) {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;
  const csrf = checkSameOrigin(req);
  if (csrf) return csrf;
  if (!(await rateLimit(`money-pinreset:${user.id}:${clientIp(req)}`, 5, 300_000))) {
    return rateLimitResponse();
  }

  let body: { password?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  if (!isValidPinFormat(body.pin)) {
    return NextResponse.json({ error: "Le PIN doit contenir exactement 4 chiffres" }, { status: 400 });
  }
  try {
    await resetPinWithPassword({ userId: user.id, password: String(body.password || ""), newPin: String(body.pin) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return moneyError(e);
  }
}
