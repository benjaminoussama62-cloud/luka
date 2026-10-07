import { NextResponse } from "next/server";
import { getProvider } from "@/lib/payments/registry";
import type { PaymentProviderName } from "@/lib/payments/types";
import { reconcileMoneyWebhook } from "@/lib/money/core";

export const runtime = "nodejs";

const MONEY_PROVIDERS = new Set<PaymentProviderName>(["flash", "cinetpay", "flutterwave"]);

/**
 * POST /api/money/webhooks/<provider> — notification provider signée.
 * Le corps posté n'est jamais cru seul : verifyWebhook() authentifie
 * (signature HMAC ou re-vérification côté serveur), puis
 * reconcileMoneyWebhook() applique — idempotent via money_events.
 * Réponse 200 dans tous les cas « reçu » : un statut non-200 ferait
 * retenter le provider indéfiniment sur un événement volontairement ignoré.
 */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!MONEY_PROVIDERS.has(provider as PaymentProviderName)) {
    return NextResponse.json({ error: "provider inconnu" }, { status: 404 });
  }
  const rawBody = await req.text();

  let outcome;
  try {
    outcome = await getProvider(provider as PaymentProviderName).verifyWebhook(rawBody, req.headers);
  } catch (e) {
    console.error(`[money] webhook ${provider} verify error:`, (e as Error).message);
    return NextResponse.json({ received: true, verified: false });
  }
  if (!outcome) {
    return NextResponse.json({ received: true, verified: false });
  }

  try {
    const applied = await reconcileMoneyWebhook({
      provider,
      eventId: outcome.eventId,
      transactionId: outcome.transactionId,
      status: outcome.status,
      rawPayload: rawBody,
    });
    return NextResponse.json({ received: true, verified: true, applied });
  } catch (e) {
    console.error(`[money] webhook ${provider} reconcile error:`, (e as Error).message);
    // 500 → le provider retentera ; l'idempotence protège l'application.
    return NextResponse.json({ error: "reconcile failed" }, { status: 500 });
  }
}
