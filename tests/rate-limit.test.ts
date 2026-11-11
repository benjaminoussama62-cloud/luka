import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("autorise jusqu'à la limite puis bloque", async () => {
    const key = `rl-${Date.now()}-a`;
    for (let i = 0; i < 5; i++) expect(await rateLimit(key, 5, 60_000)).toBe(true);
    expect(await rateLimit(key, 5, 60_000)).toBe(false);
  });

  it("les clés sont indépendantes", async () => {
    const a = `rl-${Date.now()}-b`;
    const b = `rl-${Date.now()}-c`;
    expect(await rateLimit(a, 1, 60_000)).toBe(true);
    expect(await rateLimit(a, 1, 60_000)).toBe(false);
    expect(await rateLimit(b, 1, 60_000)).toBe(true);
  });

  it("la fenêtre expire et ré-autorise", async () => {
    const key = `rl-${Date.now()}-d`;
    expect(await rateLimit(key, 1, 20)).toBe(true);
    expect(await rateLimit(key, 1, 20)).toBe(false);
    await new Promise((r) => setTimeout(r, 30));
    expect(await rateLimit(key, 1, 20)).toBe(true);
  });
});
