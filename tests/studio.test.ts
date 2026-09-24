import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/storage/database";
import { createSite } from "@/lib/studio/sites";
import { studioDashboard } from "@/lib/studio/dashboard";
import { inspectUrl, inspectUrlLive } from "@/lib/studio/radar";

const S = Date.now().toString(36);
const USER = `studio-user-${S}`;

describe("studio — dashboard unifié", () => {
  it("retourne une structure complète avec des données réelles (vides au départ)", () => {
    const site = createSite(USER, { domain: `t-${S}.example.com` });
    const d = studioDashboard(site);

    expect(d.site.id).toBe(site.id);
    // Toutes les métriques existent et sont à zéro — jamais de faux chiffres.
    expect(d.radar.impressions28d).toBe(0);
    expect(d.radar.clicks28d).toBe(0);
    expect(d.trace.sessions28d).toBe(0);
    expect(d.velocity.lastAudit).toBeNull();
    expect(d.yield.revenue30dCdf).toBe(0);
    expect(Array.isArray(d.insights)).toBe(true);
  });

  it("détecte un site sans indexation dans les insights", () => {
    const site = createSite(USER, { domain: `i-${S}.example.com` });
    const d = studioDashboard(site);
    expect(d.insights.some((i) => i.title.includes("index"))).toBe(true);
  });
});

describe("studio — inspection d'URL", () => {
  it("inspecte dans l'index local et refuse les domaines étrangers", () => {
    const site = createSite(USER, { domain: `r-${S}.example.com` });
    const res = inspectUrl(site, `https://r-${S}.example.com/page`);
    expect(res.indexed).toBe(false);
    expect(res.url).toContain(`r-${S}.example.com`);

    expect(() => inspectUrl(site, "https://evil.com/x")).toThrow(/domaine/i);
  });

  it("le test en direct refuse les domaines étrangers avant tout fetch", async () => {
    const site = createSite(USER, { domain: `l-${S}.example.com` });
    await expect(inspectUrlLive(site, "https://attacker.example/")).rejects.toThrow(/domaine/i);
    await expect(inspectUrlLive(site, "pas une url!!!")).rejects.toThrow();
  });

  it("le test en direct gère une cible injoignable sans lever d'exception", async () => {
    const site = createSite(USER, { domain: `down-${S}.invalid` });
    const res = await inspectUrlLive(site, `https://down-${S}.invalid/`);
    // .invalid ne résout pas → la fonction renvoie un résultat honnête, pas un crash.
    expect(res.ok).toBe(false);
    expect(res.error || res.status).toBeTruthy();
    expect(res.indexable).toBe(false);
  }, 20000);
});

describe("studio — données de performance par dimension", () => {
  it("compte impressions/clics réels par requête, pays et appareil", async () => {
    const { radarBreakdown } = await import("@/lib/studio/radar-console");
    const site = createSite(USER, { domain: `p-${S}.example.com` });
    const db = getDb();
    const day = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO radar_daily (day, domain, query, url, impressions, clicks, position_sum, position_count)
       VALUES (?, ?, 'kinshasa meteo', ?, 10, 3, 45, 10)`,
    ).run(day, site.domain, `https://${site.domain}/`);
    db.prepare(
      `INSERT INTO impression_signals (query, url, domain, position, shown_at, device, country)
       VALUES ('kinshasa meteo', ?, ?, 2, ?, 'mobile', 'CD')`,
    ).run(`https://${site.domain}/`, site.domain, now);
    db.prepare(
      `INSERT INTO click_signals (query, url, domain, clicked_at, device, country)
       VALUES ('kinshasa meteo', ?, ?, ?, 'mobile', 'CD')`,
    ).run(`https://${site.domain}/`, site.domain, now);

    const byQuery = radarBreakdown(site.domain, "query", 28);
    expect(byQuery.find((r) => r.label === "kinshasa meteo")?.clicks).toBe(3);
    const byCountry = radarBreakdown(site.domain, "country", 28);
    expect(byCountry.find((r) => r.label === "CD")?.clicks).toBe(1);
    expect(byCountry.find((r) => r.label === "CD")?.impressions).toBe(1);
    const byDevice = radarBreakdown(site.domain, "device", 28);
    expect(byDevice.find((r) => r.label === "mobile")?.impressions).toBe(1);
  });
});
