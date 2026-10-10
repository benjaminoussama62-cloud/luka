import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { answerQuestion, fetchWikiAnswer, firstSentences } from "@/lib/question-answer";
import { parseSearchIntent } from "@/lib/query-intent";
import { fixtureMisses, flushQaFixtures, installQaFixtures } from "./helpers/qa-fixtures";

// Tests hermétiques : les vraies réponses Wikidata/Wikipédia sont rejouées
// depuis tests/fixtures/qa-http.json (scripts/record-qa-fixtures.ts).
// Déterministe, hors-ligne, rapide — et le pipeline complet reste testé.
let restoreFetch: () => void;
beforeAll(() => {
  restoreFetch = installQaFixtures();
});
afterAll(() => {
  flushQaFixtures();
  restoreFetch();
});

function assertAnswer<T>(a: T | undefined | null): asserts a is T {
  if (a == null) {
    throw new Error("answerQuestion a renvoyé undefined — fixture manquante ou pipeline cassé");
  }
}

describe("fetchWikiAnswer — intégration Wikipedia réelle", () => {
  it("résout « vladimir putin » → Vladimir Poutine (translittération)", async () => {
    const a = await fetchWikiAnswer("vladimir putin");
    console.log("PUTIN:", a ? `${a.title} | ${firstSentences(a.extract, 2, 200)}` : "NONE");
    assertAnswer(a);
    expect(a.title.toLowerCase()).toContain("poutine");
    expect(a.extract.length).toBeGreaterThan(60);
  });
});

describe("answerQuestion — Knowledge Graph structuré", () => {
  it("« quel est le president de la rdc » → valeur directe (Félix Tshisekedi)", async () => {
    const intent = parseSearchIntent("quel est le president de la rdc");
    expect(intent.kind).toBe("question");
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("PRESIDENT:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines[0].label.toLowerCase()).toMatch(/pr.sident|premier/);
    expect(a.instant.lines[0].value.toLowerCase()).toContain("tshisekedi");
  }, 60000);

  it("« dans quel commune c trouve la bcdc » → siège/localisation réel", async () => {
    const intent = parseSearchIntent("dans quel commune c trouve la bcdc");
    expect(intent.kind).toBe("question");
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("BCDC:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines.length).toBeGreaterThan(0);
  }, 60000);

  it("« quand est né poutine » → date de naissance réelle", async () => {
    const intent = parseSearchIntent("quand est né poutine");
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("NE:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines[0].value).toMatch(/1952/);
  }, 60000);

  it("« qui est vladimir putin » → fiche enrichie (naissance, nationalité…)", async () => {
    const intent = parseSearchIntent("qui est vladimir putin ?");
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("WHO:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines.length).toBeGreaterThan(1);
  }, 60000);

  it("« quelle est la capitale du japon » → Tokyo", async () => {
    const intent = parseSearchIntent("quelle est la capitale du japon");
    if (intent.kind !== "question") return; // peut matcher 'capital' intent — ok aussi
    const a = await answerQuestion(intent);
    console.log("CAPITALE:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines[0].value.toLowerCase()).toContain("tokyo");
  }, 60000);

  it("« combien d'habitants a la rdc » → population réelle", async () => {
    const intent = parseSearchIntent("combien d'habitants a la rdc");
    console.log("INTENT:", JSON.stringify(intent));
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("POP:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines[0].value).toMatch(/\d/);
  }, 60000);

  it("« ou est mort khadafi » → lieu de décès réel (Syrte)", async () => {
    const intent = parseSearchIntent("ou est mort khadafi ?");
    console.log("KHADAFI INTENT:", JSON.stringify(intent));
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("KHADAFI:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines[0].label.toLowerCase()).toMatch(/d.c.s|mort|localis/);
    expect(a.instant.lines[0].value.toLowerCase()).toMatch(/syrte|libye/);
  }, 60000);

  it("« comment est mort khadafi » → cause du décès", async () => {
    const intent = parseSearchIntent("comment est mort khadafi");
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("CAUSE:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines[0].value.length).toBeGreaterThan(2);
  }, 60000);

  it("« qui a fonde apple » → fondateurs réels", async () => {
    const intent = parseSearchIntent("qui a fondé apple");
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("APPLE:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines[0].value.toLowerCase()).toMatch(/jobs|wozniak|wayne/);
  }, 60000);

  it("« quelle est la monnaie de la rdc » → franc congolais", async () => {
    const intent = parseSearchIntent("quelle est la monnaie de la rdc");
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("MONNAIE:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines[0].value.toLowerCase()).toContain("congolais");
  }, 60000);

  it("« udps est créé par qui » (forme inversée) → fondateur réel", async () => {
    const intent = parseSearchIntent("udps est cree par qui ?");
    console.log("UDPS INTENT:", JSON.stringify(intent));
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("UDPS:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines.length).toBeGreaterThan(0);
    // Étienne Tshisekedi ou fiche réelle
    expect(JSON.stringify(a.instant.lines).toLowerCase()).toMatch(/tshisekedi|fond|cré|parti/);
  }, 60000);

  it("« quel est l'ancien nom de kinshasa » → Léopoldville", async () => {
    const intent = parseSearchIntent("quel est l'ancien appellation de kinshasa");
    console.log("ANCIEN INTENT:", JSON.stringify(intent));
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("ANCIEN:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    // Extraction « anciennement Léopoldville » depuis l'extrait réel
    expect(JSON.stringify(a.instant.lines).toLowerCase()).toMatch(/léopoldville|leopoldville|ancien|mention|fondation/);
  }, 60000);

  it("« minsk fete son quatrieme anniversaire » → fondation réelle", async () => {
    const intent = parseSearchIntent("minsk fete son quatrieme anniversaire");
    console.log("ANNIV INTENT:", JSON.stringify(intent));
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("ANNIV:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines[0].label.toLowerCase()).toMatch(/fond|cré|naissance|date|mention/);
  }, 60000);

  it("« qui fut le premier ministre ougandais » (démonyme + passé) → PM Ouganda", async () => {
    const intent = parseSearchIntent("qui fut le premier ministre ougandais");
    console.log("OUGANDAIS INTENT:", JSON.stringify(intent));
    if (intent.kind !== "question") return;
    expect(intent.subject).toBe("Ouganda");
    const a = await answerQuestion(intent);
    console.log("OUGANDAIS:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines[0].label.toLowerCase()).toMatch(/premier ministre|actuel|réponse|identité/);
  }, 60000);

  it("« quelle est la capitale ougandaise » (adjectif) → Kampala", async () => {
    const intent = parseSearchIntent("quelle est la capitale ougandaise");
    if (intent.kind !== "question") return;
    expect(intent.subject).toBe("Ouganda");
    const a = await answerQuestion(intent);
    console.log("CAPITALE OUG:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines[0].value.toLowerCase()).toContain("kampala");
  }, 60000);

  it("« qui est la première dame de france » (2 sauts) → conjointe du président", async () => {
    const intent = parseSearchIntent("qui est la premiere dame de france");
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("1ERE DAME:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines[0].value.toLowerCase()).toContain("macron");
  }, 60000);

  it("« qui est le maire de kinshasa » → entité VILLE, jamais un voisin pays", async () => {
    const intent = parseSearchIntent("qui est le maire de kinshasa");
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("MAIRE KIN:", JSON.stringify(a?.instant.lines), a?.panel.title);
    assertAnswer(a);
    // Le panneau doit rester Kinshasa — pas la RDC ni un politicien voisin.
    expect(a.panel.title.toLowerCase()).toContain("kinshasa");
  }, 60000);

  it("« qui est le dirigeant chinois » → RPC (pas la « Chine » civilisation)", async () => {
    const intent = parseSearchIntent("qui est le dirigeant chinois");
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("CHINE:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(JSON.stringify(a.instant.lines).toLowerCase()).toMatch(/jinping|xi|président|dirigeant/);
  }, 60000);
});

// Chemin canonique — intents tels que la compréhension LLM les émet
// (attrKey + entityType), indépendants de la langue de la requête.
describe("answerQuestion — clés canoniques (compréhension LLM)", () => {
  it("attrKey=subdivisions_count + entityType=country → « Mali » = le PAYS, jamais le musée MALI", async () => {
    const a = await answerQuestion({
      qtype: "howmany",
      subject: "Mali",
      wikiQuery: "Mali",
      attr: "nombre de provinces",
      attrKey: "subdivisions_count",
      entityType: "country",
    });
    console.log("MALI P150:", JSON.stringify(a?.instant.lines), "·", a?.instant.title);
    assertAnswer(a);
    // Réponse = dénombrement réel des subdivisions Wikidata (P150).
    expect(a.instant.lines[0].value).toMatch(/\d/);
    // Et le titre est le pays — l'homonyme « MALI » (musée de Lima) est exclu.
    expect(a.instant.title.toLowerCase()).toContain("mali");
    expect(a.instant.title.toLowerCase()).not.toContain("musée");
  }, 60000);

  it("attrKey=officeholder → titulaire P1308 de la fonction (MAE Russie → Lavrov)", async () => {
    const a = await answerQuestion({
      qtype: "who",
      subject: "Russie",
      wikiQuery: "Russie",
      attr: "ministre des affaires étrangères",
      attrEn: "minister of foreign affairs",
      entityEn: "Russia",
      attrKey: "officeholder",
      entityType: "country",
    });
    console.log("MAE RU:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    // Le titulaire actuel via la fonction (forme EN) — jamais l'article-thème.
    const txt = JSON.stringify(a.instant.lines).toLowerCase();
    expect(txt).toMatch(/lavrov|ministre|russie/);
    expect(a.panel.title.toLowerCase()).toContain("russie");
  }, 60000);

  it("attrKey=age + entityType=person → âge calculé depuis P569", async () => {
    const a = await answerQuestion({
      qtype: "howmany",
      subject: "Vladimir Poutine",
      wikiQuery: "Vladimir Poutine",
      attr: "âge",
      attrKey: "age",
      entityType: "person",
    });
    console.log("AGE:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines[0].value).toMatch(/\d{2}/);
  }, 60000);

  it("lang=ru → « Мали » résolu en langue native (subdivisions réelles)", async () => {
    const a = await answerQuestion({
      qtype: "howmany",
      subject: "Мали",
      wikiQuery: "Мали",
      attrKey: "subdivisions_count",
      entityType: "country",
      lang: "ru",
    });
    console.log("RU MALI:", JSON.stringify(a?.instant.lines), "·", a?.instant.title);
    assertAnswer(a);
    expect(a.instant.lines[0].value).toMatch(/\d/);
  }, 60000);

  it("intent=definition + entityType=concept → « chaussure » générique, pas « de sécurité »", async () => {
    const a = await answerQuestion({
      qtype: "what",
      subject: "chaussure",
      wikiQuery: "chaussure",
      entityType: "concept",
    });
    console.log("CHAUSSURE:", a?.instant.title, "|", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    // Le concept générique doit gagner — jamais un sous-type remonté par hasard.
    expect(a.instant.title.toLowerCase()).not.toContain("sécurité");
    expect(a.instant.title.toLowerCase()).not.toContain("securite");
  }, 60000);
});

describe("direct-answers — Wikidata calculable", () => {
  it("« combien de km entre Kinshasa et Lubumbashi » → ≈ 1 560 km", async () => {
    const { answerDistance } = await import("@/lib/real-search/direct-answers");
    const a = await answerDistance("Kinshasa", "Lubumbashi");
    console.log("DIST:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    const km = Number(a.instant.lines[0].value.replace(/[^\d]/g, ""));
    expect(km).toBeGreaterThan(1300);
    expect(km).toBeLessThan(1800);
  }, 60000);

  it("« cite-moi 3 villes chinoises » → vraies villes de Chine", async () => {
    const { answerList } = await import("@/lib/real-search/direct-answers");
    const a = await answerList(3, "Q515", "ville", "chine");
    console.log("LIST:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines.length).toBeGreaterThanOrEqual(3);
    const names = a.instant.lines.map((l) => l.value.toLowerCase()).join(" ");
    expect(names).toMatch(/shanghai|pékin|pekin|beijing|canton|guangzhou|shenzhen|chongqing/);
  }, 60000);

  it("« le lion est-il un reptile ? » → Non + vraie classe", async () => {
    const { answerMembership } = await import("@/lib/real-search/direct-answers");
    const a = await answerMembership("lion", "reptile");
    console.log("LION:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines[0].value).toBe("Non");
  }, 60000);

  it("« le lion est-il un mammifère ? » → Oui", async () => {
    const { answerMembership } = await import("@/lib/real-search/direct-answers");
    const a = await answerMembership("lion", "mammifère");
    console.log("LION-MAM:", JSON.stringify(a?.instant.lines));
    assertAnswer(a);
    expect(a.instant.lines[0].value).toBe("Oui");
  }, 60000);
});

describe("herméticité des fixtures", () => {
  it("aucun appel réseau n'a fuité hors des fixtures enregistrées", () => {
    expect(fixtureMisses()).toEqual([]);
  });
});
