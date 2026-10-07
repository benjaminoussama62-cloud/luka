import { NextResponse } from "next/server";
import {
  checkSameOrigin,
  idemKeyOf,
  ipOf,
  moneyError,
  requireIdemKey,
  requireMoneyUser,
} from "@/lib/money/http";
import { createDepositIntent } from "@/lib/money/core";
import { isMoneyCurrency, parseAmountToMinor } from "@/lib/money/amounts";
import { startDepositCharge } from "@/lib/money/provider";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/money/deposit — initie un encaissement mobile money.
 * Body: {amount:"50", currency:"CDF", phone:"+243…"}
 * Le solde n'est crédité QUE par le webhook provider vérifié —
 * jamais par la réponse de ce endpoint.
 */
export async function POST(req: Request) {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;
  const csrf = checkSameOrigin(req);
  if (csrf) return csrf;
  if (!rateLimit(`money-deposit:${user.id}`, 10, 60_000) || !rateLimit(`money-deposit-ip:${clientIp(req)}`, 20, 60_000)) {
    return rateLimitResponse();
  }

  let body: { amount?: string; currency?: string; phone?: string };
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
    const { tx } = await createDepositIntent({
      userId: user.id,
      amountMinor,
      currency: body.currency,
      phone: body.phone.trim(),
      idemKey,
      ip: ipOf(req),
      userAgent: req.headers.get("user-agent") || "",
    });
    const charged = await startDepositCharge(tx, {
      userEmail: user.email,
      userName: user.name,
      phone: body.phone.trim(),
    });
    const fresh = { ...tx, provider: charged.provider, checkout_url: charged.checkout_url };
    return NextResponse.json({
      transaction: {
        id: fresh.id,
        status: fresh.status,
        kind: "deposit",
        currency: fresh.currency,
        amountMinor: fresh.amount_minor,
        provider: fresh.provider,
        checkoutUrl: fresh.checkout_url,
      },
    });
  } catch (e) {
    return moneyError(e);
  }
}
