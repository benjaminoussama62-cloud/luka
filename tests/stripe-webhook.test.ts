import { beforeAll, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";

const SECRET = "whsec_test_secret";
const TX = "tx_123";
const EVENT_ID = "evt_test_1";

function payload(type: string, obj: Record<string, unknown>) {
  return JSON.stringify({ id: EVENT_ID, type, data: { object: obj } });
}

function sign(rawBody: string, timestamp = Math.floor(Date.now() / 1000)) {
  const sig = createHmac("sha256", SECRET).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

async function verify(rawBody: string, sigHeader: string) {
  const { stripeProvider } = await import("@/lib/payments/stripe");
  return stripeProvider.verifyWebhook(rawBody, new Headers({ "stripe-signature": sigHeader }));
}

beforeAll(() => {
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
});

describe("stripe webhook verification", () => {
  it("accepts a correctly signed paid checkout", async () => {
    const body = payload("checkout.session.completed", {
      id: "cs_test_1",
      payment_status: "paid",
      metadata: { transaction_id: TX },
    });
    const outcome = await verify(body, sign(body));
    expect(outcome).toEqual({ transactionId: TX, eventId: EVENT_ID, status: "paid" });
  });

  it("rejects a tampered payload (signature mismatch)", async () => {
    const body = payload("checkout.session.completed", {
      id: "cs_test_1",
      payment_status: "paid",
      metadata: { transaction_id: TX },
    });
    const forged = body.replace("paid", "unpaid");
    expect(await verify(forged, sign(body))).toBeNull();
  });

  it("rejects a wrong secret", async () => {
    const body = payload("checkout.session.completed", {
      id: "cs_test_1",
      payment_status: "paid",
      metadata: { transaction_id: TX },
    });
    const ts = Math.floor(Date.now() / 1000);
    const badSig = createHmac("sha256", "whsec_wrong").update(`${ts}.${body}`).digest("hex");
    expect(await verify(body, `t=${ts},v1=${badSig}`)).toBeNull();
  });

  it("rejects replayed events older than the tolerance window", async () => {
    const body = payload("checkout.session.completed", {
      id: "cs_test_1",
      payment_status: "paid",
      metadata: { transaction_id: TX },
    });
    const old = Math.floor(Date.now() / 1000) - 600;
    expect(await verify(body, sign(body, old))).toBeNull();
  });

  it("rejects a missing signature header", async () => {
    const body = payload("checkout.session.completed", { metadata: { transaction_id: TX } });
    expect(await verify(body, "")).toBeNull();
  });

  it("maps failed events to status=failed", async () => {
    const body = payload("payment_intent.payment_failed", {
      id: "pi_1",
      metadata: { transaction_id: TX },
    });
    const outcome = await verify(body, sign(body));
    expect(outcome?.status).toBe("failed");
  });

  it("ignores irrelevant event types", async () => {
    const body = payload("customer.created", { id: "cus_1", metadata: { transaction_id: TX } });
    expect(await verify(body, sign(body))).toBeNull();
  });
});
