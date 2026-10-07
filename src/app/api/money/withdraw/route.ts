import { NextResponse } from "next/server";
import {
  checkSameOrigin,
  idemKeyOf,
  ipOf,
  moneyError,
  requireIdemKey,
  requireMoneyUser,
} from "@/lib/money/http";
import { createWithdrawal } from "@/lib/money/core";
import { isMoneyCurrency, parseAmountToMinor } from "@/lib/money/amounts";
import { startWithdrawalPayout } from "@/lib/money/provider";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/money/withdraw — décaissement vers le Mobile Money du client.
 * Body: {amount:"20", currency:"USD", phone:"+243…", pin:"1234", network?}
 * Le montant est bloqué (débit pending) ; le webhook provider tranche.
 * Échec provider → recrédit automatique via transaction 'reversal'.
 */
export async function POST(req: Request) {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;
  const csrf = checkSameOrigin(req);
  if (csrf) return csrf;
  if (!rateLimit(`money-withdraw:${user.id}`, 8, 60_000) || !rateLimit(`money-withdraw-ip:${clientIp(req)}`, 15, 60_000)) {
    return rateLimitResponse();
  }

  let body: { amount?: string; currency?: string; phone?: string; pin?: string; network?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const idemKey = idemKeyOf(req, body as Record<string, unknown>);
  const idemErr = requireIdemKey(idemKey);
  if (idemErr) return idemErr;
  if (!isMoneyCurrency(body.currency) || !body.phone?.trim()) {
    return NextResponse.json({ error: "currency (USD|CDF) et phone requis" }, { status: 400 });
  }
  const amountMinor = parseAmountToMinor(body.amount, body.currency);
  if (!amountMinor) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  try {
    const { tx } = await createWithdrawal({
      userId: user.id,
      amountMinor,
      currency: body.currency,
      phone: body.phone.trim(),
      pin: body.pin,
      idemKey,
      ip: ipOf(req),
      userAgent: req.headers.get("user-agent") || "",
    });
    await startWithdrawalPayout(tx, { phone: body.phone.trim(), network: body.network });
    return NextResponse.json({
      transaction: { id: tx.id, status: tx.status, kind: "withdrawal", currency: tx.currency, amountMinor: tx.amount_minor },
    });
  } catch (e) {
    return moneyError(e);
  }
}
