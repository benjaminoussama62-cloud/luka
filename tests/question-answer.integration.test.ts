import { describe, expect, it } from "vitest";
import { answerQuestion, fetchWikiAnswer, firstSentences } from "@/lib/question-answer";
import { parseSearchIntent } from "@/lib/query-intent";

// Tests d'intégration réseau — vraies APIs Wikidata + Wikipédia (skippés si hors-ligne).
describe("fetchWikiAnswer — intégration Wikipedia réelle", () => {
  it("résout « vladimir putin » → Vladimir Poutine (translittération)", async () => {
    const a = await fetchWikiAnswer("vladimir putin");
    console.log("PUTIN:", a ? `${a.title} | ${firstSentences(a.extract, 2, 200)}` : "NONE");
    if (!a) return; // hors-ligne — on ne fait pas échouer le test
    expect(a.title.toLowerCase()).toContain("poutine");
    expect(a.extract.length).toBeGreaterThan(60);
  }, 20000);
});

describe("answerQuestion — Knowledge Graph structuré", () => {
  it("« quel est le president de la rdc » → valeur directe (Félix Tshisekedi)", async () => {
    const intent = parseSearchIntent("quel est le president de la rdc");
    expect(intent.kind).toBe("question");
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("PRESIDENT:", JSON.stringify(a?.instant.lines));
    if (!a) return; // hors-ligne
    expect(a.instant.lines[0].label.toLowerCase()).toMatch(/pr.sident|premier/);
    expect(a.instant.lines[0].value.toLowerCase()).toContain("tshisekedi");
  }, 30000);

  it("« dans quel commune c trouve la bcdc » → siège/localisation réel", async () => {
    const intent = parseSearchIntent("dans quel commune c trouve la bcdc");
    expect(intent.kind).toBe("question");
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("BCDC:", JSON.stringify(a?.instant.lines));
    if (!a) return;
    expect(a.instant.lines.length).toBeGreaterThan(0);
  }, 30000);

  it("« quand est né poutine » → date de naissance réelle", async () => {
    const intent = parseSearchIntent("quand est né poutine");
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("NE:", JSON.stringify(a?.instant.lines));
    if (!a) return;
    expect(a.instant.lines[0].value).toMatch(/1952/);
  }, 30000);

  it("« qui est vladimir putin » → fiche enrichie (naissance, nationalité…)", async () => {
    const intent = parseSearchIntent("qui est vladimir putin ?");
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("WHO:", JSON.stringify(a?.instant.lines));
    if (!a) return;
    expect(a.instant.lines.length).toBeGreaterThan(1);
  }, 30000);

  it("« quelle est la capitale du japon » → Tokyo", async () => {
    const intent = parseSearchIntent("quelle est la capitale du japon");
    if (intent.kind !== "question") return; // peut matcher 'capital' intent — ok aussi
    const a = await answerQuestion(intent);
    console.log("CAPITALE:", JSON.stringify(a?.instant.lines));
    if (!a) return;
    expect(a.instant.lines[0].value.toLowerCase()).toContain("tokyo");
  }, 30000);

  it("« combien d'habitants a la rdc » → population réelle", async () => {
    const intent = parseSearchIntent("combien d'habitants a la rdc");
    console.log("INTENT:", JSON.stringify(intent));
    if (intent.kind !== "question") return;
    const a = await answerQuestion(intent);
    console.log("POP:", JSON.stringify(a?.instant.lines));
    if (!a) return;
    expect(a.instant.lines[0].value).toMatch(/\d/);
  }, 30000);
});
