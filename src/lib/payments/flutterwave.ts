/**
 * Flutterwave v3 provider — cards + Mobile Money across Africa.
 * Webhooks verified via the `verif-hash` shared secret, then
 * re-confirmed against the provider's verify endpoint.
 */

import type {
  ChargeInput,
  ChargeResult,
  PaymentProvider,
  PayoutInput,
  PayoutResult,
  WebhookOutcome,
} from "./types";
import { PaymentFailedError, PaymentNotConfiguredError } from "./types";

const API = "https://api.flutterwave.com/v3";

/** Map our payout networks to Flutterwave mobile-money bank codes. */
const MOBILE_BANK_CODES: Record<string, string> = {
  mpesa: "MPS",
  vodacom: "MPS",
  airtel: "AIRTEL",
  orange: "ORANGE",
};

function secretKey() {
  return process.env.FLUTTERWAVE_SECRET_KEY?.trim() || "";
}

async function flwFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json()) as { status?: string; message?: string } & Record<string, unknown>;
  if (!res.ok || data.status === "error") {
    throw new PaymentFailedError(`Flutterwave: ${data.message || res.status}`);
  }
  return data;
}

export const flutterwaveProvider: PaymentProvider = {
  name: "flutterwave",

  isConfigured() {
    return secretKey().startsWith("FLWSECK-") || secretKey().startsWith("FLWSECK_TEST-");
  },

  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    if (!this.isConfigured()) throw new PaymentNotConfiguredError("flutterwave");
    const data = await flwFetch("/payments", {
      method: "POST",
      body: JSON.stringify({
        tx_ref: input.transactionId,
        amount: input.amount,
        currency: input.currency,
        redirect_url: input.returnUrl,
        customer: {
          email: input.customerEmail || "client@ayeba.app",
          name: input.customerName,
          phonenumber: input.customerPhone,
        },
        customizations: {
          title: "Ayeba Studio",
          description: input.description.slice(0, 100),
        },
      }),
    });
    const link = (data.data as { link?: string })?.link;
    if (!link) throw new PaymentFailedError("Flutterwave: pas de lien de paiement retourné");
    return { checkoutUrl: link, providerRef: input.transactionId };
  },

  async createPayout(input: PayoutInput): Promise<PayoutResult> {
    if (!this.isConfigured()) throw new PaymentNotConfiguredError("flutterwave");
    const dest = input.destination;
    const bankCode =
      dest.bankCode || MOBILE_BANK_CODES[(dest.network || "").toLowerCase()];
    if (!bankCode || !dest.phone) {
      throw new PaymentFailedError(
        "Flutterwave payout: numéro Mobile Money et réseau requis.",
      );
    }
    const data = await flwFetch("/transfers", {
      method: "POST",
      body: JSON.stringify({
        account_bank: bankCode,
        account_number: dest.phone,
        amount: input.amount,
        currency: input.currency,
        beneficiary_name: dest.accountName || "Publisher",
        reference: input.transactionId,
        narration: input.description.slice(0, 100),
      }),
    });
    const ref = (data.data as { id?: number })?.id;
    return { providerRef: String(ref ?? input.transactionId) };
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookOutcome | null> {
    const expectedHash = process.env.FLUTTERWAVE_SECRET_HASH?.trim();
    const received = headers.get("verif-hash") || "";
    if (!expectedHash || received !== expectedHash) return null;

    let event: {
      id?: number;
      event?: string;
      data?: { id?: number; tx_ref?: string; status?: string };
    };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return null;
    }
    const txRef = event.data?.tx_ref;
    const providerId = event.data?.id;
    if (!txRef || !providerId) return null;

    // Re-confirm server-side — never trust the posted body alone.
    const verify = await flwFetch(`/transactions/${providerId}/verify`);
    const real = verify.data as { tx_ref?: string; status?: string } | undefined;
    if (real?.tx_ref !== txRef) return null;

    if (real.status === "successful") {
      return { transactionId: txRef, eventId: `flw:${providerId}`, status: "paid" };
    }
    if (real.status === "failed" || event.event === "transfer.failed") {
      return { transactionId: txRef, eventId: `flw:${providerId}:failed`, status: "failed" };
    }
    return null;
  },
};
