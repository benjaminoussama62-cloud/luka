import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("autorise jusqu'à la limite puis bloque", () => {
    const key = `rl-${Date.now()}-a`;
    for (let i = 0; i < 5; i++) expect(rateLimit(key, 5, 60_000)).toBe(true);
    expect(rateLimit(key, 5, 60_000)).toBe(false);
  });

  it("les clés sont indépendantes", () => {
    const a = `rl-${Date.now()}-b`;
    const b = `rl-${Date.now()}-c`;
    expect(rateLimit(a, 1, 60_000)).toBe(true);
    expect(rateLimit(a, 1, 60_000)).toBe(false);
    expect(rateLimit(b, 1, 60_000)).toBe(true);
  });

  it("la fenêtre expire et ré-autorise", async () => {
    const key = `rl-${Date.now()}-d`;
    expect(rateLimit(key, 1, 20)).toBe(true);
    expect(rateLimit(key, 1, 20)).toBe(false);
    await new Promise((r) => setTimeout(r, 30));
    expect(rateLimit(key, 1, 20)).toBe(true);
  });
});
