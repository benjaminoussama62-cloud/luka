/**
 * Flash provider — agrégateur Mobile Money RDC (encaissement + décaissement).
 *
 * CONTRAT À CONFIRMER : les credentials arrivent via le commercial (SA).
 * L'implémentation suit le schéma REST standard des agrégateurs RDC :
 *  - POST {base}/collections      → encaissement (push mobile money)
 *  - POST {base}/disbursements    → décaissement vers le téléphone client
 *  - Webhook signé HMAC-SHA256 hex du corps brut (FLASH_WEBHOOK_SECRET),
 *    en-tête `x-flash-signature` + `x-flash-timestamp` (tolérance ±5 min).
 * Ajuster les chemins/noms de champs dès réception de la doc officielle —
 * tout le reste du système (ledger, idempotence, réconciliation) est
 * indépendant de ces détails.
 *
 * Sécurité : jamais de simulation — sans credentials le provider se déclare
 * non configuré et l'appelant échoue explicitement (503 côté API).
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

const WEBHOOK_TOLERANCE_MS = 5 * 60_000;

function creds() {
  return {
    baseUrl: (process.env.FLASH_API_BASE_URL || "https://api.flash.co").replace(/\/$/, ""),
    apiKey: process.env.FLASH_API_KEY?.trim() || "",
    apiSecret: process.env.FLASH_API_SECRET?.trim() || "",
    webhookSecret: process.env.FLASH_WEBHOOK_SECRET?.trim() || "",
  };
}

async function post(baseUrl: string, path: string, apiKey: string, apiSecret: string, body: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Api-Secret": apiSecret,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new PaymentFailedError(`Flash ${path}: ${(data.message as string) || res.status}`);
  }
  return data;
}

export const flashProvider: PaymentProvider = {
  name: "flash",

  isConfigured() {
    const { apiKey, apiSecret } = creds();
    return apiKey.length > 0 && apiSecret.length > 0;
  },

  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    if (!this.isConfigured()) throw new PaymentNotConfiguredError("flash");
    const { baseUrl, apiKey, apiSecret } = creds();

    const data = await post(baseUrl, "/collections", apiKey, apiSecret, {
      reference: input.transactionId,
      amount: input.amount,
      currency: input.currency,
      description: input.description.slice(0, 255),
      callback_url: input.notifyUrl,
      return_url: input.returnUrl,
      customer: {
        email: input.customerEmail,
        name: input.customerName,
        phone: input.customerPhone,
      },
    });

    const ref =
      (data.reference as string) || (data.id as string) || input.transactionId;
    const checkoutUrl = (data.payment_url as string) || (data.checkout_url as string) || "";
    return { checkoutUrl, providerRef: ref };
  },

  async createPayout(input: PayoutInput): Promise<PayoutResult> {
    if (!this.isConfigured()) throw new PaymentNotConfiguredError("flash");
    const { baseUrl, apiKey, apiSecret } = creds();

    const data = await post(baseUrl, "/disbursements", apiKey, apiSecret, {
      reference: input.transactionId,
      amount: input.amount,
      currency: input.currency,
      description: input.description.slice(0, 255),
      destination: {
        type: "mobile_money",
        phone: input.destination.phone,
        network: input.destination.network,
      },
    });

    const ref = (data.reference as string) || (data.id as string) || input.transactionId;
    return { providerRef: ref };
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookOutcome | null> {
    const { webhookSecret } = creds();
    if (!webhookSecret) return null;

    const signature = headers.get("x-flash-signature") || "";
    const timestamp = headers.get("x-flash-timestamp") || "";
    if (!signature || !timestamp) return null;

    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) return null;
    const tsMs = ts < 1e12 ? ts * 1000 : ts; // secondes ou ms
    if (Math.abs(Date.now() - tsMs) > WEBHOOK_TOLERANCE_MS) return null;

    // Signature sur `${timestamp}.${body}` — schéma le plus courant.
    const expected = hmacSha256(webhookSecret, `${timestamp}.${rawBody}`);
    const alt = hmacSha256(webhookSecret, rawBody);
    if (!safeEqualHex(signature, expected) && !safeEqualHex(signature, alt)) {
      return null;
    }

    let event: {
      id?: string;
      reference?: string;
      data?: { reference?: string; status?: string };
      status?: string;
    };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return null;
    }
    const transactionId = event.reference || event.data?.reference || "";
    const rawStatus = (event.data?.status || event.status || "").toUpperCase();
    const eventId = event.id || `flash:${transactionId}:${rawStatus}`;
    if (!transactionId) return null;

    if (rawStatus === "SUCCESS" || rawStatus === "SUCCESSFUL" || rawStatus === "COMPLETED" || rawStatus === "PAID") {
      return { transactionId, eventId, status: "paid" };
    }
    if (rawStatus === "FAILED" || rawStatus === "CANCELLED" || rawStatus === "EXPIRED" || rawStatus === "REJECTED") {
      return { transactionId, eventId, status: "failed" };
    }
    return null; // pending → on ne tranche pas
  },
};
