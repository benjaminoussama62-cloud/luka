/**
 * Payment provider abstraction — real gateways only.
 * No provider is ever simulated: if credentials are missing the
 * provider reports itself as unconfigured and callers must fail loudly.
 */

export type PaymentProviderName = "stripe" | "cinetpay" | "flutterwave";

export type ChargeInput = {
  /** Internal transaction id (transactions.id) — used as provider reference. */
  transactionId: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  /** URL the customer returns to after payment. */
  returnUrl: string;
  /** URL the provider calls to notify payment status. */
  notifyUrl: string;
};

export type ChargeResult = {
  /** Redirect the customer here to complete the payment. */
  checkoutUrl: string;
  /** Provider-side reference (session id, payment link id, tx_ref…). */
  providerRef: string;
};

export type PayoutDestination = {
  method: string;
  phone?: string;
  network?: "mpesa" | "airtel" | "orange" | "vodacom" | string;
  accountName?: string;
  /** Stripe connected account id (acct_…) or bank code. */
  accountNumber?: string;
  bankCode?: string;
};

export type PayoutInput = {
  transactionId: string;
  amount: number;
  currency: string;
  destination: PayoutDestination;
  description: string;
};

export type PayoutResult = {
  providerRef: string;
};

export type WebhookOutcome = {
  /** Internal transaction id recovered from the verified event. */
  transactionId: string;
  /** Provider-unique event id — deduplicated for idempotency. */
  eventId: string;
  status: "paid" | "failed";
};

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  /** True only when real credentials are present in env. */
  isConfigured(): boolean;
  createCharge(input: ChargeInput): Promise<ChargeResult>;
  createPayout(input: PayoutInput): Promise<PayoutResult>;
  /**
   * Verify a webhook request. Implementations MUST authenticate the
   * payload (signature or server-side re-fetch) before trusting it.
   * Returns null when verification fails.
   */
  verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookOutcome | null>;
}

export class PaymentNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`Provider "${provider}" non configuré — renseignez les clés API dans l'environnement.`);
    this.name = "PaymentNotConfiguredError";
  }
}

export class PaymentFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentFailedError";
  }
}
