import { describe, expect, it, vi } from "vitest";

describe("payment provider registry — fail closed", () => {
  it("throws PaymentNotConfiguredError when no credentials exist (no fake success)", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("CINETPAY_API_KEY", "");
    vi.stubEnv("CINETPAY_SITE_ID", "");
    vi.stubEnv("FLUTTERWAVE_SECRET_KEY", "");
    const { providerForMethod } = await import("@/lib/payments/registry");
    const { PaymentNotConfiguredError } = await import("@/lib/payments/types");
    expect(() => providerForMethod("credit_card")).toThrow(PaymentNotConfiguredError);
    expect(() => providerForMethod("mobile_money")).toThrow(PaymentNotConfiguredError);
  });

  it("rejects unsupported methods", async () => {
    const { providerForMethod } = await import("@/lib/payments/registry");
    const { PaymentFailedError, PaymentNotConfiguredError } = await import(
      "@/lib/payments/types"
    );
    expect(() => providerForMethod("paypal")).toThrow(PaymentFailedError);
    expect(() => providerForMethod("wampum")).toThrow(PaymentNotConfiguredError);
  });
});

describe("amountForProvider", () => {
  it("passes through USD for stripe", async () => {
    const { amountForProvider } = await import("@/lib/payments/registry");
    expect(amountForProvider(100, "USD", "stripe")).toEqual({ amount: 100, currency: "USD" });
  });

  it("converts CDF to USD using the configured FX rate", async () => {
    vi.stubEnv("AYEBA_FX_CDF_PER_USD", "2800");
    const { amountForProvider } = await import("@/lib/payments/registry");
    const out = amountForProvider(280_000, "CDF", "stripe");
    expect(out.currency).toBe("USD");
    expect(out.amount).toBeCloseTo(100, 5);
  });

  it("refuses CDF for stripe without a configured FX rate", async () => {
    vi.stubEnv("AYEBA_FX_CDF_PER_USD", "");
    const { amountForProvider } = await import("@/lib/payments/registry");
    const { PaymentFailedError } = await import("@/lib/payments/types");
    expect(() => amountForProvider(1000, "CDF", "stripe")).toThrow(PaymentFailedError);
  });

  it("keeps CDF for mobile-money providers", async () => {
    const { amountForProvider } = await import("@/lib/payments/registry");
    expect(amountForProvider(5000, "CDF", "cinetpay")).toEqual({ amount: 5000, currency: "CDF" });
  });
});
