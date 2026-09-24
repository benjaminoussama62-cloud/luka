import { describe, expect, it } from "vitest";
import { cleanSnippet, isJunkHit } from "@/lib/real-search";
import {
  normalizeSmsFrench,
  parseSearchIntent,
  upstreamQuery,
} from "@/lib/query-intent";
import { tokenMatchesInHay } from "@/lib/search-relevance";

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

describe("parseSearchIntent — questions", () => {
  it("détecte « qui est X » et extrait l'entité", () => {
    const intent = parseSearchIntent("qui est vladimir putin ?");
    expect(intent.kind).toBe("question");
    if (intent.kind === "question") {
      expect(intent.qtype).toBe("who");
      expect(intent.subject).toBe("vladimir putin");
    }
  });

  it("détecte « où se trouve X » en français SMS", () => {
    const intent = parseSearchIntent("dans quel commune c trouve la bcdc ?");
    expect(intent.kind).toBe("question");
    if (intent.kind === "question") {
      expect(intent.qtype).toBe("where");
      expect(intent.wikiQuery.toLowerCase()).toBe("bcdc");
    }
  });

  it("détecte « quel est le X de Y » avec attribut + sujet", () => {
    const intent = parseSearchIntent("quel est le president de la rdc");
    expect(intent.kind).toBe("question");
    if (intent.kind === "question") {
      expect(intent.qtype).toBe("which");
      expect(intent.wikiQuery.toLowerCase()).toContain("president");
      expect(intent.wikiQuery.toLowerCase()).toContain("congo");
    }
  });

  it("« quand est né X » garde l'entité sans le participe", () => {
    const intent = parseSearchIntent("quand est né poutine");
    expect(intent.kind).toBe("question");
    if (intent.kind === "question") {
      expect(intent.qtype).toBe("when");
      expect(intent.subject).toBe("poutine");
    }
  });

  it("laisse « capitale » à l'intention dédiée (pas question)", () => {
    expect(parseSearchIntent("quelle est la capitale de la france").kind).toBe("capital");
  });

  it("ne confond pas une recherche simple avec une question", () => {
    expect(parseSearchIntent("vladimir putin").kind).toBe("general");
    expect(parseSearchIntent("bcdc kinshasa").kind).toBe("general");
  });

  it("envoie le sujet aux sources upstream, pas la question", () => {
    const intent = parseSearchIntent("qui est vladimir putin ?");
    expect(upstreamQuery("qui est vladimir putin ?", intent)).toBe("vladimir putin");
  });
});

describe("normalizeSmsFrench", () => {
  it("corrige le français SMS courant", () => {
    expect(normalizeSmsFrench("dans kel commune c trouve la bcdc")).toBe(
      "dans quel commune se trouve la bcdc",
    );
  });
  it("ne casse pas le français correct", () => {
    expect(normalizeSmsFrench("qui est le president")).toBe("qui est le president");
  });
});

describe("tokenMatchesInHay — tolérance translittération", () => {
  it("matche « putin » ≈ « poutine » (distance 2, même initiale)", () => {
    expect(tokenMatchesInHay("putin", "vladimir poutine est un homme d'etat russe")).toBe(true);
  });
  it("rejette les vrais homonymes", () => {
    expect(tokenMatchesInHay("putin", "un lapin dans le jardin")).toBe(false);
  });
  it("garde le matching exact", () => {
    expect(tokenMatchesInHay("bcdc", "la bcdc est une banque")).toBe(true);
  });
});
