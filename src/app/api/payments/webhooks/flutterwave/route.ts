import { NextResponse } from "next/server";
import { flutterwaveProvider } from "@/lib/payments/flutterwave";
import { billingSystem } from "@/lib/studio/billing-system";

export const runtime = "nodejs";

/**
 * POST /api/payments/webhooks/flutterwave
 * verif-hash vérifié + statut re-confirmé via l'API de vérification.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const outcome = await flutterwaveProvider.verifyWebhook(rawBody, req.headers);
  if (!outcome) {
    return NextResponse.json({ error: "unverified" }, { status: 400 });
  }
  billingSystem.reconcileTransaction("flutterwave", outcome, rawBody);
  return NextResponse.json({ received: true });
}
