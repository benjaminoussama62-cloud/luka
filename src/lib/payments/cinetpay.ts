/**
 * CinetPay provider — Mobile Money RDC/Afrique centrale.
 * M-Pesa, Airtel Money, Orange Money + cartes bancaires.
 * Webhooks are verified by re-querying the provider's status API
 * (server-side truth — the posted body is never trusted alone).
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

const API = "https://api.checkout.cinetpay.com/v2";

function creds() {
  return {
    apikey: process.env.CINETPAY_API_KEY?.trim() || "",
    siteId: process.env.CINETPAY_SITE_ID?.trim() || "",
  };
}

export const cinetpayProvider: PaymentProvider = {
  name: "cinetpay",

  isConfigured() {
    const { apikey, siteId } = creds();
    return apikey.length > 0 && siteId.length > 0;
  },

  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    if (!this.isConfigured()) throw new PaymentNotConfiguredError("cinetpay");
    const { apikey, siteId } = creds();

    const res = await fetch(`${API}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey,
        site_id: siteId,
        transaction_id: input.transactionId,
        // CinetPay requires amounts in whole units, multiple of 5
        amount: Math.max(100, Math.round(input.amount / 5) * 5),
        currency: input.currency,
        description: input.description.slice(0, 255),
        return_url: input.returnUrl,
        notify_url: input.notifyUrl,
        channels: "ALL",
        customer_email: input.customerEmail,
        customer_name: input.customerName,
        customer_phone_number: input.customerPhone,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const data = (await res.json()) as {
      code?: string;
      message?: string;
      data?: { payment_url?: string; payment_token?: string };
    };
    if (data.code !== "201" || !data.data?.payment_url) {
      throw new PaymentFailedError(`CinetPay: ${data.message || data.code || res.status}`);
    }
    return {
      checkoutUrl: data.data.payment_url,
      providerRef: input.transactionId,
    };
  },

  async createPayout(input: PayoutInput): Promise<PayoutResult> {
    void input;
    // CinetPay transfers live on a separate product (api.client.cinetpay.com)
    // with its own credentials — only enabled when explicitly configured.
    const apikey = process.env.CINETPAY_TRANSFER_API_KEY?.trim();
    const password = process.env.CINETPAY_TRANSFER_PASSWORD?.trim();
    if (!apikey || !password) {
      throw new PaymentNotConfiguredError("cinetpay-transfers");
    }
    throw new PaymentFailedError(
      "CinetPay transfers: finalisez la connexion au compte de transfert puis implémentez /transfer.",
    );
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookOutcome | null> {
    void headers;
    if (!this.isConfigured()) return null;
    const { apikey, siteId } = creds();

    // CinetPay posts application/x-www-form-urlencoded fields.
    const params = new URLSearchParams(rawBody);
    const transactionId = params.get("cpm_trans_id") || params.get("transaction_id") || "";
    const postedSiteId = params.get("cpm_site_id") || "";
    if (!transactionId || (postedSiteId && postedSiteId !== siteId)) return null;

    // Server-side verification: ask CinetPay for the real status.
    const res = await fetch(`${API}/payment/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey, site_id: siteId, transaction_id: transactionId }),
      signal: AbortSignal.timeout(15_000),
    });
    const check = (await res.json()) as {
      code?: string;
      data?: { status?: string };
    };
    const status = check.data?.status?.toUpperCase();
    if (status === "ACCEPTED") {
      return {
        transactionId,
        eventId: `cinetpay:${transactionId}:${status}`,
        status: "paid",
      };
    }
    if (status === "REFUSED" || status === "CANCELLED") {
      return {
        transactionId,
        eventId: `cinetpay:${transactionId}:${status}`,
        status: "failed",
      };
    }
    return null; // still pending — do not reconcile
  },
};
