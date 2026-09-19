/**
 * Stripe provider — real REST integration, no SDK dependency.
 * Charges via Checkout Sessions, payouts via Connect transfers,
 * webhooks verified with the official v1 HMAC-SHA256 scheme.
 */

import { hmacSha256, safeEqualHex } from "@/lib/security/sign";
import type {
  ChargeInput,
  ChargeResult,
  PaymentProvider,
  PayoutInput,
  PayoutResult,
  WebhookOutcome,
} from "./types";
import { PaymentFailedError, PaymentNotConfiguredError } from "./types";

const API = "https://api.stripe.com/v1";
const WEBHOOK_TOLERANCE_SEC = 300;

function secretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

async function stripePost(path: string, params: URLSearchParams) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = data.error as { message?: string } | undefined;
    throw new PaymentFailedError(`Stripe: ${err?.message || res.status}`);
  }
  return data;
}

export const stripeProvider: PaymentProvider = {
  name: "stripe",

  isConfigured() {
    return secretKey().startsWith("sk_");
  },

  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    if (!this.isConfigured()) throw new PaymentNotConfiguredError("stripe");

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", `${input.returnUrl}?paid=1`);
    params.set("cancel_url", `${input.returnUrl}?cancelled=1`);
    params.set("client_reference_id", input.transactionId);
    params.set("metadata[transaction_id]", input.transactionId);
    if (input.customerEmail) params.set("customer_email", input.customerEmail);
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
    // Stripe expects minor units (cents)
    params.set(
      "line_items[0][price_data][unit_amount]",
      String(Math.round(input.amount * 100)),
    );
    params.set("line_items[0][price_data][product_data][name]", input.description);

    const session = await stripePost("/checkout/sessions", params);
    return {
      checkoutUrl: session.url as string,
      providerRef: session.id as string,
    };
  },

  async createPayout(input: PayoutInput): Promise<PayoutResult> {
    if (!this.isConfigured()) throw new PaymentNotConfiguredError("stripe");
    const destination = input.destination.accountNumber;
    if (!destination?.startsWith("acct_")) {
      throw new PaymentFailedError(
        "Stripe payout requiert un compte Connect (acct_…) dans payout_details.",
      );
    }
    const params = new URLSearchParams();
    params.set("amount", String(Math.round(input.amount * 100)));
    params.set("currency", input.currency.toLowerCase());
    params.set("destination", destination);
    params.set("metadata[transaction_id]", input.transactionId);
    const transfer = await stripePost("/transfers", params);
    return { providerRef: transfer.id as string };
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookOutcome | null> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    const sigHeader = headers.get("stripe-signature") || "";
    if (!secret || !sigHeader) return null;

    // Parse "t=…,v1=…" pairs
    const parts = new Map<string, string[]>();
    for (const kv of sigHeader.split(",")) {
      const [k, v] = kv.split("=", 2);
      parts.set(k, [...(parts.get(k) || []), v]);
    }
    const timestamp = parts.get("t")?.[0];
    const signatures = parts.get("v1") || [];
    if (!timestamp || signatures.length === 0) return null;

    // Replay protection: reject events older than 5 minutes
    const age = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(age) || age > WEBHOOK_TOLERANCE_SEC) return null;

    const expected = hmacSha256(secret, `${timestamp}.${rawBody}`);
    if (!signatures.some((sig) => safeEqualHex(sig, expected))) return null;

    let event: {
      id?: string;
      type?: string;
      data?: { object?: { id?: string; client_reference_id?: string; metadata?: Record<string, string>; payment_status?: string } };
    };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return null;
    }

    const obj = event.data?.object;
    const transactionId = obj?.metadata?.transaction_id || obj?.client_reference_id;
    if (!event.id || !transactionId) return null;

    if (event.type === "checkout.session.completed" && obj?.payment_status === "paid") {
      return { transactionId, eventId: event.id, status: "paid" };
    }
    if (
      event.type === "checkout.session.expired" ||
      event.type === "payment_intent.payment_failed"
    ) {
      return { transactionId, eventId: event.id, status: "failed" };
    }
    return null; // event type not relevant to reconciliation
  },
};
