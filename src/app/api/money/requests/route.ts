import { NextResponse } from "next/server";
import { checkSameOrigin, moneyError, requireMoneyUser } from "@/lib/money/http";
import { createRequest, listRequests } from "@/lib/money/features";
import { isMoneyCurrency, parseAmountToMinor } from "@/lib/money/amounts";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;
  return NextResponse.json({ requests: await listRequests(user.id) });
}

/** POST /api/money/requests — {to, amount, currency, note?} */
export async function POST(req: Request) {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;
  const csrf = checkSameOrigin(req);
  if (csrf) return csrf;
  if (!(await rateLimit(`money-req:${user.id}`, 20, 60_000))) return rateLimitResponse();

  let body: { to?: string; amount?: string; currency?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  if (!body.to || !isMoneyCurrency(body.currency)) {
    return NextResponse.json({ error: "to et currency (USD|CDF) requis" }, { status: 400 });
  }
  const amountMinor = parseAmountToMinor(body.amount, body.currency);
  if (!amountMinor) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });

  try {
    const id = await createRequest({
      userId: user.id, to: body.to, amountMinor, currency: body.currency, note: body.note,
    });
    return NextResponse.json({ id });
  } catch (e) {
    return moneyError(e);
  }
}
