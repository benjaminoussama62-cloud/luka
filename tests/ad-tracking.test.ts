import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-that-is-long-enough-32chars";
});

describe("ad tracking signatures", () => {
  it("signs and verifies a tracking URL", async () => {
    const { adTrackingSignature, verifyAdTrackingSignature } = await import(
      "@/lib/ads/tracking-sign"
    );
    const sig = adTrackingSignature("impression", "req-1", "cre-1");
    expect(sig).toBeTruthy();
    expect(verifyAdTrackingSignature("impression", "req-1", "cre-1", sig)).toBe(true);
  });

  it("rejects a forged signature", async () => {
    const { adTrackingSignature, verifyAdTrackingSignature } = await import(
      "@/lib/ads/tracking-sign"
    );
    const sig = adTrackingSignature("click", "req-1", "cre-1");
    // forged: same sig reused for a different creative
    expect(verifyAdTrackingSignature("click", "req-1", "cre-2", sig)).toBe(false);
    // forged: impression sig cannot be replayed as a click
    expect(verifyAdTrackingSignature("impression", "req-1", "cre-1", sig)).toBe(false);
    // garbage
    expect(verifyAdTrackingSignature("click", "req-1", "cre-1", "deadbeef")).toBe(false);
    expect(verifyAdTrackingSignature("click", "req-1", "cre-1", "")).toBe(false);
  });
});
