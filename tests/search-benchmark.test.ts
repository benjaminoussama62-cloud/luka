// .env.local configure Turso/Vercel en dev — le benchmark doit tourner sur le
// sqlite local hermétique. Chaque fichier vitest a son propre worker → sûr.
for (const k of [
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "VERCEL",
  "VERCEL_ENV",
  "AWS_LAMBDA_FUNCTION_NAME",
]) {
  delete process.env[k];
}

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { indexDocument, searchIndex } from "@/lib/search-index/fts";
import { correctSpelling, suggestFromVocabulary } from "@/lib/search-index/spell";
import { rankHits } from "@/lib/search-index/ranking";
import { getDb, canUseSyncDb } from "@/lib/storage/database";
import { BENCH_DOCS, BENCH_QUERIES } from "./fixtures/search-bench-data";

/**
 * Benchmark mesurable de la chaîne index→ranking (index propre).
 * Corpus étiqueté : seuls les docs « bench-* » comptent dans les métriques
 * (convention TREC — un index réel éventuel ne fausse pas le jugement).
 *
 * Métriques : MRR, Recall@5, nDCG@10 — report par catégorie + seuils CI.
 */

const BENCH_ID = /^bench-/;

function benchRanked(query: string) {
  const hits = searchIndex(query, 60);
  const ranked = rankHits(hits, query);
  return ranked.filter((h) => BENCH_ID.test(h.docId));
}

function dcg(rels: number[]): number {
  return rels.reduce((s, r, i) => s + r / Math.log2(i + 2), 0);
}

type QueryReport = {
  q: string;
  category: string;
  rr: number;
  recall5: number;
  ndcg10: number;
  top: string[];
};

function evalQuery(q: string, category: string, relevant: string[]): QueryReport {
  const ranked = benchRanked(q);
  const ids = ranked.map((h) => h.docId);

  const firstIdx = ids.findIndex((id) => relevant.includes(id));
  const rr = firstIdx === -1 ? 0 : 1 / (firstIdx + 1);

  const top5 = ids.slice(0, 5);
  const recall5 = relevant.filter((id) => top5.includes(id)).length / relevant.length;

  // Grades : position dans le jugement idéal (len → 1), 0 si non jugé.
  const relOf = (id: string) => {
    const i = relevant.indexOf(id);
    return i === -1 ? 0 : relevant.length - i;
  };
  const actual = ids.slice(0, 10).map(relOf);
  const ideal = [...actual].sort((a, b) => b - a);
  const idealDcg = dcg(ideal);
  const ndcg10 = idealDcg === 0 ? 1 : dcg(actual) / idealDcg;

  return { q, category, rr, recall5, ndcg10, top: ids.slice(0, 5) };
}

describe("benchmark qualité de recherche — index propre", () => {
  const reports: QueryReport[] = [];

  beforeAll(() => {
    if (!canUseSyncDb()) return;
    for (const d of BENCH_DOCS) indexDocument(d);
  });

  afterAll(() => {
    if (!canUseSyncDb()) return;
    const db = getDb();
    db.prepare("DELETE FROM search_fts WHERE doc_id LIKE 'bench-%'").run();
    db.prepare("DELETE FROM crawl_documents WHERE id LIKE 'bench-%'").run();

    const byCat = new Map<string, QueryReport[]>();
    for (const r of reports) {
      const list = byCat.get(r.category) ?? [];
      list.push(r);
      byCat.set(r.category, list);
    }
    console.log("\n=== BENCHMARK RECHERCHE (index propre) ===");
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    for (const [cat, rs] of byCat) {
      console.log(
        `  ${cat.padEnd(14)} MRR ${mean(rs.map((r) => r.rr)).toFixed(2)}` +
          `  R@5 ${mean(rs.map((r) => r.recall5)).toFixed(2)}` +
          `  nDCG10 ${mean(rs.map((r) => r.ndcg10)).toFixed(2)}  (${rs.length} requêtes)`,
      );
    }
    console.log(
      `  ${"GLOBAL".padEnd(14)} MRR ${mean(reports.map((r) => r.rr)).toFixed(2)}` +
        `  R@5 ${mean(reports.map((r) => r.recall5)).toFixed(2)}` +
        `  nDCG10 ${mean(reports.map((r) => r.ndcg10)).toFixed(2)}`,
    );
    const worst = [...reports].sort((a, b) => a.rr - b.rr).slice(0, 5);
    for (const r of worst) {
      console.log(`  faible: «${r.q}» rr=${r.rr.toFixed(2)} top5=${r.top.join(", ")}`);
    }
  });

  it.each(BENCH_QUERIES.map((b) => [b.q, b.category, b.relevant] as const))(
    "«%s» surface les docs jugés pertinents",
    (q, category, relevant) => {
      const r = evalQuery(q, category, [...relevant]);
      reports.push(r);
      // Seuil dur par requête : au moins un doc jugé doit sortir.
      expect(r.rr, `aucun doc pertinent pour «${q}» — top5: ${r.top.join(", ")}`).toBeGreaterThan(0);
    },
  );

  it("correctSpelling corrige sur le vocabulaire de l'index", () => {
    expect(correctSpelling("kinshsa capitale")).toBe("kinshasa capitale");
    expect(correctSpelling("univarsité kinshasa")).toBe("université kinshasa");
    expect(correctSpelling("tchisekedi")).toBe("tshisekedi");
    // Un mot déjà correct n'est jamais « corrigé ».
    expect(correctSpelling("kinshasa population")).toBeUndefined();
  });

  it("suggestFromVocabulary complète le token en cours de frappe", () => {
    expect(suggestFromVocabulary("kin")).toContain("kinshasa");
    expect(suggestFromVocabulary("banque com")).toContain("banque commerciale");
    expect(suggestFromVocabulary("")).toEqual([]);
  });

  it("le spam clickbait ne sort jamais dans le top 3", () => {
    const ids = benchRanked("kinshasa").map((h) => h.docId);
    expect(ids.slice(0, 3)).not.toContain("bench-kinshasa-spam");
  });

  it("agrégats au-dessus des seuils de régression", () => {
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const mrr = mean(reports.map((r) => r.rr));
    const r5 = mean(reports.map((r) => r.recall5));
    const ndcg = mean(reports.map((r) => r.ndcg10));
    // Relevé initial — à resserrer au fur et à mesure que le ranking s'améliore.
    expect(mrr).toBeGreaterThanOrEqual(0.65);
    expect(r5).toBeGreaterThanOrEqual(0.8);
    expect(ndcg).toBeGreaterThanOrEqual(0.75);
  });
});
