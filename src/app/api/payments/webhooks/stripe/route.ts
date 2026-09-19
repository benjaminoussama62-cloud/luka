import { NextResponse } from "next/server";
import { stripeProvider } from "@/lib/payments/stripe";
import { billingSystem } from "@/lib/studio/billing-system";

export const runtime = "nodejs";

/**
 * POST /api/payments/webhooks/stripe
 * Stripe → Ayeba. Signature vérifiée (HMAC + tolérance 5 min),
 * événement dédupliqué, facture réconciliée.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const outcome = await stripeProvider.verifyWebhook(rawBody, req.headers);
  if (!outcome) {
    // 400 forces Stripe to stop retrying an unverifiable event
    return NextResponse.json({ error: "unverified" }, { status: 400 });
  }
  billingSystem.reconcileTransaction("stripe", outcome, rawBody);
  return NextResponse.json({ received: true });
}
