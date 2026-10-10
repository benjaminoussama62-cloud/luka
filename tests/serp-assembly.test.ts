import { describe, expect, it } from "vitest";
import { diversifyResults, rankAndFilter, toResult } from "@/lib/real-search/ranking";
import type { FetchOpts, RawHit } from "@/lib/real-search/shared";

/**
 * Assemblage SERP — la couche qui fusionne index propre + amonts.
 * Vérifie que les signaux de ranking (position amont, autorité, RDC,
 * anti-homonyme, anti-spam, host crowding) produisent le bon ordre.
 */

const OPTS: FetchOpts = {
  zeroAi: false,
  zeroAds: false,
  privateMode: false,
  sliders: { audience: 50, authority: 50, locality: 50 },
};

const hit = (h: Partial<RawHit> & Pick<RawHit, "title" | "url">): RawHit => ({
  snippet: "",
  source: "brave",
  ...h,
});

const domains = (rs: { domain: string }[]) => rs.map((r) => r.domain);

describe("rankAndFilter — ordre de la SERP fusionnée", () => {
  it("la position amont réelle domine à pertinence égale", () => {
    const top = toResult(hit({ title: "Cobalt RDC", url: "https://a.example/x", position: 0 }), 0, "cobalt rdc");
    const deep = toResult(hit({ title: "Cobalt RDC", url: "https://b.example/y", position: 9 }), 1, "cobalt rdc");
    const ranked = rankAndFilter([deep, top], "cobalt rdc", OPTS);
    expect(ranked[0].url).toBe("https://a.example/x");
  });

  it("un wiki crédible devance un blog clickbait", () => {
    const wiki = toResult(
      hit({ title: "Félix Tshisekedi — Wikipédia", url: "https://fr.wikipedia.org/wiki/Félix_Tshisekedi", snippet: "Président de la RDC depuis 2019." }),
      0,
      "tshisekedi",
    );
    const blog = toResult(
      hit({ title: "Tshisekedi secret incroyable, cliquez !", url: "https://buzz.example/t", snippet: "click here" }),
      1,
      "tshisekedi",
    );
    const ranked = rankAndFilter([blog, wiki], "félix tshisekedi président rdc", OPTS, ["félix tshisekedi"]);
    expect(ranked[0].domain).toBe("fr.wikipedia.org");
    expect(ranked[0].rankScore ?? 0).toBeGreaterThan(ranked[1].rankScore ?? 0);
  });

  it("RDC : un .cd pertinent remonte pour une requête congolaise", () => {
    const local = toResult(
      hit({ title: "Élections RDC : le calendrier de la CENI", url: "https://ceni.cd/elections", snippet: "Commission électorale de la République démocratique du Congo à Kinshasa." }),
      0,
      "élections rdc",
    );
    const global = toResult(
      hit({ title: "Election news", url: "https://world.example/elections", snippet: "generic election coverage" }),
      1,
      "élections rdc",
    );
    const ranked = rankAndFilter([global, local], "élections rdc ceni", OPTS);
    expect(ranked[0].domain).toBe("ceni.cd");
  });

  it("commune de Kinshasa : l'homonyme français est éliminé", () => {
    const kin = toResult(
      hit({ title: "Lemba, commune de Kinshasa", url: "https://kinshasa.cd/lemba", snippet: "Lemba est une commune de Kinshasa en RDC." }),
      0,
      "commune lemba kinshasa",
    );
    const alsace = toResult(
      hit({ title: "Lembach, village d'Alsace", url: "https://lembach.fr", snippet: "Commune du Bas-Rhin en France." }),
      1,
      "commune lemba kinshasa",
    );
    const ranked = rankAndFilter([alsace, kin], "commune lemba kinshasa", OPTS);
    expect(ranked[0].url).toContain("kinshasa.cd");
    expect((ranked[0].rankScore ?? 0) - (ranked[1].rankScore ?? 0)).toBeGreaterThan(100);
  });

  it("zeroAi élimine le spam suspecté", () => {
    const spam = toResult(
      hit({ title: "Secret incroyable, cliquez pour devenir riche", url: "https://spam.example/x" }),
      0,
      "kinshasa",
    );
    const real = toResult(
      hit({ title: "Kinshasa — Wikipédia", url: "https://fr.wikipedia.org/wiki/Kinshasa" }),
      1,
      "kinshasa",
    );
    const ranked = rankAndFilter([spam, real], "kinshasa", { ...OPTS, zeroAi: true });
    expect(domains(ranked)).not.toContain("spam.example");
    expect(ranked).toHaveLength(1);
  });
});

describe("diversifyResults — host crowding", () => {
  it("plafonne les domaines sauf le dominant", () => {
    const mk = (n: number, domain: string) =>
      toResult(hit({ title: `R${n}`, url: `https://${domain}/p${n}` }), n, "q");
    const results = [
      ...Array.from({ length: 5 }, (_, i) => mk(i, "dominant.example")),
      ...Array.from({ length: 4 }, (_, i) => mk(10 + i, "second.example")),
      mk(20, "tiers.example"),
    ];
    const out = diversifyResults(results, 2);
    const counts = new Map<string, number>();
    for (const r of out) counts.set(r.domain, (counts.get(r.domain) ?? 0) + 1);
    expect(counts.get("dominant.example")).toBe(4); // cap+2 pour le n°1
    expect(counts.get("second.example")).toBe(2);
    expect(counts.get("tiers.example")).toBe(1);
  });
});

describe("toResult — fidélité des hits amont", () => {
  it("google-news conserve l'URL éditeur réelle et la date", () => {
    const r = toResult(
      hit({
        title: "RDC : le gouvernement remanié",
        url: "https://news.google.com/rss/articles/xyz",
        publisherUrl: "https://actualite.cd/article/1",
        source: "google-news",
        publishedAt: "2025-06-01T10:00:00Z",
        position: 0,
      }),
      0,
      "rdc",
    );
    expect(r.url).toBe("https://actualite.cd/article/1");
    expect(r.domain).toBe("actualite.cd");
    expect(r.publishedAt).toBe("2025-06-01T10:00:00Z");
    expect(r.sourceType).toBe("news");
  });

  it("la position amont est propagée dans upstreamPosition", () => {
    const r = toResult(hit({ title: "T", url: "https://x.example/", position: 3 }), 0, "t");
    expect(r.upstreamPosition).toBe(3);
  });
});
