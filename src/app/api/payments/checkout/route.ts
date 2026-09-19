import { NextResponse } from "next/server";
import { requireStudioUser, studioError } from "@/lib/studio/http";
import { billingSystem } from "@/lib/studio/billing-system";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/payments/checkout — start a real payment for an invoice.
 * Body: { invoiceId, method: "credit_card" | "mobile_money" }
 * Returns { checkoutUrl } to redirect the customer to the provider.
 */
export async function POST(req: Request) {
  const user = await requireStudioUser();
  if (user instanceof NextResponse) return user;

  if (!rateLimit(`pay:${clientIp(req)}`, 10, 60_000)) {
    return rateLimitResponse();
  }

  let body: { invoiceId?: string; method?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  if (!body.invoiceId || !body.method) {
    return NextResponse.json(
      { error: "invoiceId et method requis" },
      { status: 400 },
    );
  }

  try {
    const result = await billingSystem.payInvoice(body.invoiceId, user.id, body.method);
    return NextResponse.json(result);
  } catch (e) {
    return studioError(e);
  }
}
