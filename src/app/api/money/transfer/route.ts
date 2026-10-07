import { NextResponse } from "next/server";
import {
  checkSameOrigin,
  idemKeyOf,
  ipOf,
  moneyError,
  requireIdemKey,
  requireMoneyUser,
} from "@/lib/money/http";
import { executeTransfer } from "@/lib/money/core";
import { isMoneyCurrency, parseAmountToMinor } from "@/lib/money/amounts";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/money/transfer — envoi interne zéro frais.
 * Body: {to:"@pseudo|email|téléphone", amount:"25.50", currency:"USD|CDF", pin:"1234"}
 * Header: Idempotency-Key (obligatoire — rejouer la requête ne débite pas deux fois).
 */
export async function POST(req: Request) {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;
  const csrf = checkSameOrigin(req);
  if (csrf) return csrf;
  if (!rateLimit(`money-transfer:${user.id}`, 20, 60_000) || !rateLimit(`money-transfer-ip:${clientIp(req)}`, 30, 60_000)) {
    return rateLimitResponse();
  }

  let body: { to?: string; amount?: string; currency?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const idemKey = idemKeyOf(req, body as Record<string, unknown>);
  const idemErr = requireIdemKey(idemKey);
  if (idemErr) return idemErr;
  if (!body.to || !isMoneyCurrency(body.currency)) {
    return NextResponse.json({ error: "to et currency (USD|CDF) requis" }, { status: 400 });
  }
  const amountMinor = parseAmountToMinor(body.amount, body.currency);
  if (!amountMinor) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  try {
    const { tx } = await executeTransfer({
      userId: user.id,
      to: body.to,
      amountMinor,
      currency: body.currency,
      pin: body.pin,
      idemKey,
      ip: ipOf(req),
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({
      transaction: { id: tx.id, status: tx.status, kind: tx.kind, currency: tx.currency, amountMinor: tx.amount_minor },
    });
  } catch (e) {
    return moneyError(e);
  }
}
