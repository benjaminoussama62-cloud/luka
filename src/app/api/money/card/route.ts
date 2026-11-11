import { NextResponse } from "next/server";
import { checkSameOrigin, idemKeyOf, ipOf, moneyError, requireMoneyUser } from "@/lib/money/http";
import { getCard, issueCard, setCardStatus, startCardSpend, confirmCardSpend } from "@/lib/money/card";
import { isMoneyCurrency, parseAmountToMinor } from "@/lib/money/amounts";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;
  const pin = new URL(req.url).searchParams.get("pin") || undefined;
  try {
    return NextResponse.json({ card: await getCard(user.id, pin) });
  } catch (e) {
    return moneyError(e);
  }
}

/** POST /api/money/card — {action:"issue"|"freeze"|"unfreeze"|"spend", pin, partner?, amount?, currency?} */
export async function POST(req: Request) {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;
  const csrf = checkSameOrigin(req);
  if (csrf) return csrf;
  if (!(await rateLimit(`money-card:${user.id}:${clientIp(req)}`, 20, 60_000))) return rateLimitResponse();

  let body: { action?: string; pin?: string; partner?: string; amount?: string; currency?: string; otpId?: string; code?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  try {
    switch (body.action) {
      case "issue":
        return NextResponse.json(await issueCard(user.id, body.pin));
      case "freeze":
        return NextResponse.json(await setCardStatus(user.id, "frozen"));
      case "unfreeze":
        return NextResponse.json(await setCardStatus(user.id, "active"));
      case "spend": {
        if (!body.partner || !isMoneyCurrency(body.currency)) {
          return NextResponse.json({ error: "partner et currency requis" }, { status: 400 });
        }
        const amountMinor = parseAmountToMinor(body.amount, body.currency);
        if (!amountMinor) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
        return NextResponse.json(await startCardSpend({
          userId: user.id, partner: body.partner, amountMinor, currency: body.currency,
          ip: ipOf(req), userAgent: req.headers.get("user-agent") || "",
        }));
      }
      case "confirm": {
        if (!body.otpId || !body.code) {
          return NextResponse.json({ error: "otpId et code requis" }, { status: 400 });
        }
        return NextResponse.json(await confirmCardSpend({
          userId: user.id, otpId: body.otpId, code: String(body.code),
          idemKey: idemKeyOf(req, body as Record<string, unknown>) || `card-${Date.now()}`,
          ip: ipOf(req), userAgent: req.headers.get("user-agent") || "",
        }));
      }
      default:
        return NextResponse.json({ error: "action (issue|freeze|unfreeze|spend) requise" }, { status: 400 });
    }
  } catch (e) {
    return moneyError(e);
  }
}
