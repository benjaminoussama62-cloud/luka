import { describe, expect, it } from "vitest";
import { cleanSnippet, isJunkHit } from "@/lib/real-search";

describe("isJunkHit — filtre anti-bruit SERP", () => {
  it("rejette les titres génériques sans valeur", () => {
    expect(isJunkHit("Newsletter", "https://buttondown.email/x")).toBe(true);
    expect(isJunkHit("Sign in", "https://example.com/login")).toBe(true);
    expect(isJunkHit("Accueil", "https://example.com")).toBe(true);
    expect(isJunkHit("", "https://example.com")).toBe(true);
  });

  it("rejette les assets statiques", () => {
    expect(isJunkHit("style", "https://x.com/app.css")).toBe(true);
    expect(isJunkHit("data", "https://x.com/feed.json?v=2")).toBe(true);
    expect(isJunkHit("icon", "https://x.com/logo.svg")).toBe(true);
  });

  it("garde les vrais résultats", () => {
    expect(isJunkHit("TypeScript Handbook", "https://typescriptlang.org/docs")).toBe(false);
    expect(isJunkHit("Population de Kinshasa — Wikipédia", "https://fr.wikipedia.org/wiki/Kinshasa")).toBe(false);
  });
});

describe("cleanSnippet", () => {
  it("nettoie le HTML et borne la longueur", () => {
    const out = cleanSnippet("  <b>Réponse</b>   avec   espaces ".repeat(30), 140);
    expect(out).not.toMatch(/</);
    expect(out).not.toMatch(/\s{2,}/);
    expect(out.length).toBeLessThanOrEqual(141);
  });
});
