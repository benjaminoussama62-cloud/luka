import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/storage/database";
import { isFeatureEnabled, listFlags, setFlag, KNOWN_FLAGS } from "@/lib/flags";

describe("feature flags plateforme", () => {
  it("un flag non stocké prend sa valeur par défaut", async () => {
    expect(await isFeatureEnabled("money.transfers")).toBe(true);
    expect(await isFeatureEnabled("flag.inexistant")).toBe(true); // inconnu → défaut ouvert
  });

  it("setFlag persiste l'état et isFeatureEnabled le lit", async () => {
    const key = `test.flag-${Date.now()}`;
    await setFlag(key, false, null, "flag de test");
    expect(await isFeatureEnabled(key)).toBe(false);
    await setFlag(key, true, null);
    expect(await isFeatureEnabled(key)).toBe(true);
  });

  it("listFlags fusionne les flags connus et les customs", async () => {
    const key = `test.custom-${Date.now()}`;
    await setFlag(key, false, null);
    const flags = await listFlags();
    const known = flags.find((f) => f.key === "money.transfers");
    const custom = flags.find((f) => f.key === key);
    expect(known).toBeTruthy();
    expect(known?.custom).toBe(false);
    expect(custom).toBeTruthy();
    expect(custom?.custom).toBe(true);
    expect(custom?.enabled).toBe(false);
    for (const k of Object.keys(KNOWN_FLAGS)) {
      expect(flags.some((f) => f.key === k)).toBe(true);
    }
  });

  it("la table admin_settings est bien en place", async () => {
    const row = getDb()
      .prepare("SELECT COUNT(*) AS n FROM admin_settings WHERE key LIKE 'feature:%'")
      .get() as { n: number };
    expect(row.n).toBeGreaterThanOrEqual(0);
  });
});
