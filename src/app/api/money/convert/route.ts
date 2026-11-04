import { NextResponse } from "next/server";
import { checkSameOrigin, ipOf, moneyError, requireMoneyUser } from "@/lib/money/http";
import { convertFunds, usdCdfRate } from "@/lib/money/features";
import { isMoneyCurrency, parseAmountToMinor } from "@/lib/money/amounts";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ rate: usdCdfRate() });
}

/** POST /api/money/convert — {from:"USD|CDF", amount:"10.00", pin:"1234"} */
export async function POST(req: Request) {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;
  const csrf = checkSameOrigin(req);
  if (csrf) return csrf;
  if (!(await rateLimit(`money-convert:${user.id}`, 15, 60_000))) return rateLimitResponse();

  let body: { from?: string; amount?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  if (!isMoneyCurrency(body.from)) {
    return NextResponse.json({ error: "from (USD|CDF) requis" }, { status: 400 });
  }
  const amountMinor = parseAmountToMinor(body.amount, body.from);
  if (!amountMinor) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });

  try {
    const r = await convertFunds({
      userId: user.id,
      from: body.from,
      amountMinor,
      pin: body.pin,
      ip: ipOf(req),
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({ transaction: { id: r.txId }, outMinor: r.outMinor, to: r.to, rate: r.rate });
  } catch (e) {
    return moneyError(e);
  }
}
