import { describe, expect, it } from "vitest";
import { cleanSnippet, evalMath, isJunkHit } from "@/lib/real-search";
import {
  normalizeSmsFrench,
  parseSearchIntent,
  upstreamQuery,
} from "@/lib/query-intent";
import { mediaRelevant } from "@/lib/verticals/images";
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
      // Le wikiQuery cible le SUJET seul — l'attribut vit dans `attr`
      // (un « femme poutine » résolvait une chanson satirique).
      expect(intent.attr?.toLowerCase()).toContain("president");
      expect(intent.wikiQuery.toLowerCase()).toContain("congo");
      expect(intent.wikiQuery.toLowerCase()).not.toContain("president");
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

describe("parseSearchIntent — calcul (toute forme, pas seulement « ? »)", () => {
  const mathQueries = [
    "1+1",
    "1 + 1 = ?",
    "2x+4=10",
    "x = 2+3x",
    "combien font 6 et 7",
    "racine de 144",
    "20% de 150",
    "3 au carré",
    "5 fois 8",
    "(12+8)*3",
  ];
  for (const q of mathQueries) {
    it(`« ${q} » est un calcul`, () => {
      expect(parseSearchIntent(q).kind).toBe("math");
    });
  }
  it("une requête ordinaire n'est pas un calcul", () => {
    expect(parseSearchIntent("rdc").kind).not.toBe("math");
    expect(parseSearchIntent("formule 1 grand prix").kind).not.toBe("math");
    expect(parseSearchIntent("iphone 15 plus").kind).not.toBe("math");
  });
});

describe("evalMath — résultats réels calculés", () => {
  const cases: [string, string][] = [
    ["1+1", "2"],
    ["6+7", "13"],
    ["5*8", "40"],
    ["(144^0.5)", "12"],
    ["(20*150/100)", "30"],
    ["2*x+4=10", "x = 3"],
    ["x=2+3*x", "x = -1"],
    ["3*x-6=0", "x = 2"],
  ];
  for (const [expr, expected] of cases) {
    it(`${expr} → ${expected}`, () => {
      expect(evalMath(expr)).toBe(expected);
    });
  }
  it("retourne undefined si l'expression n'est pas évaluable", () => {
    expect(evalMath("1/0")).toBeUndefined();
    expect(evalMath("abc")).toBeUndefined();
  });
});

describe("parseSearchIntent — interrogatif n'importe où dans la phrase", () => {
  it("« messi a combien de but en carriere » → question sur Messi", () => {
    const intent = parseSearchIntent("messi a combien de but en carriere");
    expect(intent.kind).toBe("question");
    if (intent.kind === "question") {
      expect(intent.subject.toLowerCase()).toContain("messi");
      expect(intent.attr?.toLowerCase()).toContain("but");
    }
  });
  it("« la foret amazone est dans quel pays » → question sur la forêt", () => {
    const intent = parseSearchIntent("la foret amazone est dans quel pays");
    expect(intent.kind).toBe("question");
    if (intent.kind === "question") {
      expect(intent.subject.toLowerCase()).toContain("amazone");
    }
  });
  it("« mbappe joue dans quel club » → question sur Mbappé", () => {
    const intent = parseSearchIntent("mbappe joue dans quel club");
    expect(intent.kind).toBe("question");
    if (intent.kind === "question") {
      expect(intent.subject.toLowerCase()).toContain("mbappe");
    }
  });
  it("« putin a quel age » → question sur Poutine", () => {
    const intent = parseSearchIntent("putin a quel age");
    expect(intent.kind).toBe("question");
    if (intent.kind === "question") {
      expect(intent.subject.toLowerCase()).toContain("putin");
    }
  });
  it("un « ou » déclaratif n'est PAS une question", () => {
    for (const q of ["thé ou café", "messi ou ronaldo", "n'importe quoi"]) {
      expect(parseSearchIntent(q).kind).not.toBe("question");
    }
  });
});

describe("mediaRelevant — filtre anti hors-sujet (images)", () => {
  const messiTokens = ["messi", "but", "carriere"];
  it("rejette les scans de domaine public sans rapport", () => {
    expect(mediaRelevant("Flore d'Auvergne — planche botanique", messiTokens)).toBe(false);
    expect(mediaRelevant("Cours de médecine pratique (1890)", messiTokens)).toBe(false);
  });
  it("garde les images sur le sujet", () => {
    expect(mediaRelevant("Lionel Messi en 2018", messiTokens)).toBe(true);
    expect(mediaRelevant("Messi célèbre un but", messiTokens)).toBe(true);
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
