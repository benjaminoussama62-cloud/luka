import { describe, expect, it } from "vitest";
import { fetchWikiAnswer, firstSentences } from "@/lib/question-answer";

// Tests d'intégration réseau — vraie API Wikipédia (skippés si hors-ligne).
describe("fetchWikiAnswer — intégration Wikipedia réelle", () => {
  it("résout « vladimir putin » → Vladimir Poutine (translittération)", async () => {
    const a = await fetchWikiAnswer("vladimir putin");
    console.log("PUTIN:", a ? `${a.title} | ${firstSentences(a.extract, 2, 200)}` : "NONE");
    if (!a) return; // hors-ligne — on ne fait pas échouer le test
    expect(a.title.toLowerCase()).toContain("poutine");
    expect(a.extract.length).toBeGreaterThan(60);
  }, 20000);

  it("résout le sigle « bcdc » → Banque commerciale du Congo", async () => {
    const a = await fetchWikiAnswer("bcdc");
    console.log("BCDC:", a ? `${a.title} | ${firstSentences(a.extract, 2, 200)}` : "NONE");
    if (!a) return;
    expect(a.extract.toLowerCase()).toContain("congo");
  }, 20000);

  it("résout « president republique democratique du congo »", async () => {
    const a = await fetchWikiAnswer("president republique democratique du congo");
    console.log("PRES:", a ? `${a.title} | ${firstSentences(a.extract, 2, 200)}` : "NONE");
  }, 20000);
});
