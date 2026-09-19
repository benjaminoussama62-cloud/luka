import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { hmacSha256, safeEqual, safeEqualHex } from "@/lib/security/sign";

describe("hmacSha256", () => {
  it("produces the standard HMAC-SHA256 hex digest", () => {
    const expected = createHmac("sha256", "secret").update("payload").digest("hex");
    expect(hmacSha256("secret", "payload")).toBe(expected);
  });

  it("is deterministic", () => {
    expect(hmacSha256("k", "data")).toBe(hmacSha256("k", "data"));
  });
});

describe("safeEqual", () => {
  it("accepts identical strings", () => {
    expect(safeEqual("abc123", "abc123")).toBe(true);
  });

  it("rejects different strings", () => {
    expect(safeEqual("abc123", "abc124")).toBe(false);
  });

  it("rejects different lengths without throwing", () => {
    expect(safeEqual("short", "much-longer-string")).toBe(false);
    expect(safeEqual("", "x")).toBe(false);
  });
});

describe("safeEqualHex", () => {
  it("accepts equal hex strings", () => {
    const h = hmacSha256("s", "p");
    expect(safeEqualHex(h, h)).toBe(true);
  });

  it("rejects malformed hex", () => {
    expect(safeEqualHex("zz", "aa")).toBe(false);
  });
});
