/**
 * Provider registry — resolves a payment method to a configured provider.
 * Resolution NEVER falls back to simulation: missing credentials raise
 * PaymentNotConfiguredError so the failure is explicit and logged.
 */

import { cinetpayProvider } from "./cinetpay";
import { flutterwaveProvider } from "./flutterwave";
import { stripeProvider } from "./stripe";
import type { PaymentProvider, PaymentProviderName } from "./types";
import { PaymentFailedError, PaymentNotConfiguredError } from "./types";

const ALL: PaymentProvider[] = [stripeProvider, cinetpayProvider, flutterwaveProvider];

export function getProvider(name: PaymentProviderName): PaymentProvider {
  const p = ALL.find((x) => x.name === name);
  if (!p) throw new PaymentNotConfiguredError(name);
  return p;
}

/** Which providers currently have live credentials. */
export function configuredProviders(): PaymentProviderName[] {
  return ALL.filter((p) => p.isConfigured()).map((p) => p.name);
}

/**
 * Resolve a stored payment/payout method to a provider.
 *   credit_card   → Stripe (intl cards) → fallback Flutterwave
 *   mobile_money  → CinetPay (RDC) → fallback Flutterwave
 *   bank_transfer → Flutterwave transfers
 *   paypal        → not supported yet (explicit error)
 */
export function providerForMethod(method: string): PaymentProvider {
  const m = method.toLowerCase();
  const candidates: PaymentProvider[] =
    m === "credit_card" || m === "card" || m === "stripe"
      ? [stripeProvider, flutterwaveProvider]
      : m === "mobile_money" || m === "cinetpay"
        ? [cinetpayProvider, flutterwaveProvider]
        : m === "bank_transfer" || m === "flutterwave"
          ? [flutterwaveProvider]
          : [];

  const ready = candidates.find((p) => p.isConfigured());
  if (ready) return ready;
  if (m === "paypal") {
    throw new PaymentFailedError("PayPal non supporté — utilisez carte ou Mobile Money.");
  }
  throw new PaymentNotConfiguredError(
    candidates[0]?.name ?? `méthode "${method}" inconnue`,
  );
}

/**
 * Stripe cannot charge CDF. Convert to the settlement currency
 * (USD by default) using a configurable rate.
 */
export function amountForProvider(
  amount: number,
  currency: string,
  provider: PaymentProviderName,
): { amount: number; currency: string } {
  const cur = currency.toUpperCase();
  if (provider === "stripe" && !["USD", "EUR"].includes(cur)) {
    const cdfPerUsd = Number(process.env.AYEBA_FX_CDF_PER_USD || "0");
    if (cur === "CDF" && cdfPerUsd > 0) {
      return { amount: Math.max(0.5, amount / cdfPerUsd), currency: "USD" };
    }
    throw new PaymentFailedError(
      `Conversion ${cur}→USD non configurée (AYEBA_FX_CDF_PER_USD).`,
    );
  }
  return { amount, currency: cur };
}

export function paymentsStatus() {
  return {
    configured: configuredProviders(),
    stripe: stripeProvider.isConfigured(),
    cinetpay: cinetpayProvider.isConfigured(),
    flutterwave: flutterwaveProvider.isConfigured(),
  };
}
