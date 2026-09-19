import { NextResponse } from "next/server";
import { cinetpayProvider } from "@/lib/payments/cinetpay";
import { billingSystem } from "@/lib/studio/billing-system";

export const runtime = "nodejs";

/**
 * POST /api/payments/webhooks/cinetpay
 * Le corps posté n'est jamais cru seul : le statut réel est re-vérifié
 * via l'API CinetPay /payment/check avant réconciliation.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const outcome = await cinetpayProvider.verifyWebhook(rawBody, req.headers);
  if (!outcome) {
    // 200 quand même: CinetPay notifie aussi les paiements "pending".
    return NextResponse.json({ received: true, verified: false });
  }
  billingSystem.reconcileTransaction("cinetpay", outcome, rawBody);
  return NextResponse.json({ received: true, verified: true });
}
