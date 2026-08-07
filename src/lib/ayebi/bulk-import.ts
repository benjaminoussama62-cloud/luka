import { getDb } from "../storage/database";
import { slugifyTitle } from "./constants";
import { fetchWikiCorpus } from "./fetch-wiki";
import { saveArticle } from "./db-sqlite";
import type { AyebiArticle, AyebiCategory } from "./types";

const WIKI_API = "https://fr.wikipedia.org/w/api.php";
const UA = { "User-Agent": "AyebiBulkImport/2.0 (RDC encyclopedia; +https://ayeba.app)" };

type WikiCategory = {
  wikiCategory: string;
  ayebiCategory: AyebiCategory;
  maxArticles: number;
};

/** Noms exacts des catégories fr.wikipedia (république en minuscules) */
const RDC_CATEGORIES: WikiCategory[] = [
  { wikiCategory: "Culture_en_république_démocratique_du_Congo", ayebiCategory: "culture", maxArticles: 300 },
  { wikiCategory: "Sport_en_république_démocratique_du_Congo", ayebiCategory: "sport", maxArticles: 250 },
  { wikiCategory: "Économie_en_république_démocratique_du_Congo", ayebiCategory: "économie", maxArticles: 200 },
  { wikiCategory: "Politique_en_république_démocratique_du_Congo", ayebiCategory: "institution", maxArticles: 200 },
  { wikiCategory: "Histoire_en_république_démocratique_du_Congo", ayebiCategory: "institution", maxArticles: 200 },
  { wikiCategory: "Architecture_en_république_démocratique_du_Congo", ayebiCategory: "lieu", maxArticles: 150 },
  { wikiCategory: "Communication_en_république_démocratique_du_Congo", ayebiCategory: "institution", maxArticles: 100 },
  { wikiCategory: "Personnalité_congolaise", ayebiCategory: "personnalité", maxArticles: 400 },
  { wikiCategory: "Personnalité_congolaise_(RDC)", ayebiCategory: "personnalité", maxArticles: 300 },
  { wikiCategory: "Naissance_à_Kinshasa", ayebiCategory: "personnalité", maxArticles: 200 },
  { wikiCategory: "Musique_congolaise", ayebiCategory: "culture", maxArticles: 200 },
  { wikiCategory: "Groupe_musical_congolais", ayebiCategory: "culture", maxArticles: 150 },
  { wikiCategory: "Film_congolais", ayebiCategory: "culture", maxArticles: 100 },
  { wikiCategory: "Commune_de_Kinshasa", ayebiCategory: "lieu", maxArticles: 200 },
  { wikiCategory: "Province_de_la_république_démocratique_du_Congo", ayebiCategory: "lieu", maxArticles: 30 },
];

const SEARCH_QUERIES = [
  "Kinshasa",
  "Lubumbashi",
  "Goma RDC",
  "Kongo central",
  "Katanga Congo",
  "Mobutu",
  "Lumumba",
  "Tshisekedi",
  "rumba congolaise",
  "TP Mazembe",
  "Virunga",
  "cobalt RDC",
  " fleuve Congo",
  "Kivu",
  "Bas-Uele",
];

async function wikiApi<T>(params: Record<string, string>): Promise<T | null> {
  const qs = new URLSearchParams({ ...params, format: "json", origin: "*" });
  try {
    const res = await fetch(`${WIKI_API}?${qs}`, {
      signal: AbortSignal.timeout(20000),
      headers: UA,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function listCategoryMembers(category: string, limit: number): Promise<string[]> {
  const titles: string[] = [];
  let cmcontinue: string | undefined;

  while (titles.length < limit) {
    const params: Record<string, string> = {
      action: "query",
      list: "categorymembers",
      cmtitle: `Category:${category}`,
      cmtype: "page",
      cmlimit: String(Math.min(500, limit - titles.length)),
    };
    if (cmcontinue) params.cmcontinue = cmcontinue;

    const data = await wikiApi<{
      query?: { categorymembers?: Array<{ title: string; ns: number }> };
      continue?: { cmcontinue?: string };
    }>(params);
    if (!data) break;

    for (const m of data.query?.categorymembers ?? []) {
      if (m.ns !== 0) continue;
      if (!titles.includes(m.title)) titles.push(m.title);
    }

    cmcontinue = data.continue?.cmcontinue;
    if (!cmcontinue) break;
  }

  return titles.slice(0, limit);
}

async function listRdcArticleLinks(limit: number): Promise<string[]> {
  const titles: string[] = [];
  let plcontinue: string | undefined;

  while (titles.length < limit) {
    const params: Record<string, string> = {
      action: "query",
      prop: "links",
      titles: "République démocratique du Congo",
      pllimit: String(Math.min(500, limit - titles.length)),
      plnamespace: "0",
    };
    if (plcontinue) params.plcontinue = plcontinue;

    const data = await wikiApi<{
      query?: { pages?: Record<string, { links?: Array<{ title: string; ns: number }> }> };
      continue?: { plcontinue?: string };
    }>(params);
    if (!data) break;

    const pages = data.query?.pages ?? {};
    for (const page of Object.values(pages)) {
      for (const link of page.links ?? []) {
        if (link.ns !== 0) continue;
        if (/^\d{4}$/.test(link.title)) continue;
        if (link.title.startsWith(".")) continue;
        if (!titles.includes(link.title)) titles.push(link.title);
      }
    }

    plcontinue = data.continue?.plcontinue;
    if (!plcontinue) break;
  }

  return titles.slice(0, limit);
}

async function searchWikiTitles(query: string, limit: number): Promise<string[]> {
  const data = await wikiApi<{
    query?: { search?: Array<{ title: string }> };
  }>({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: String(limit),
    srnamespace: "0",
  });
  return (data?.query?.search ?? []).map((s) => s.title);
}

function guessCategory(title: string): AyebiCategory {
  const t = title.toLowerCase();
  if (/football|sport|mazembe|as vita|athl/i.test(t)) return "sport";
  if (/musique|rumba|orchestre|chanson/i.test(t)) return "culture";
  if (/président|ministre|gouvernement|parti|élection|parlement/i.test(t)) return "institution";
  if (/mine|cobalt|cuivre|économie|banque|franc congolais/i.test(t)) return "économie";
  if (/ville|commune|province|parc|fleuve|lac|mont/i.test(t)) return "lieu";
  if (/né à|mort à|politicien|footballeur|chanteur|écrivain/i.test(t)) return "personnalité";
  return "lieu";
}

function wikiTitleToArticle(
  title: string,
  category: AyebiCategory,
  corpus: NonNullable<Awaited<ReturnType<typeof fetchWikiCorpus>>>,
): AyebiArticle {
  const slug = slugifyTitle(title);
  const facts = [
    { label: "Pays", value: "République démocratique du Congo" },
    { label: "Catégorie Ayebi", value: category },
  ];
  if (corpus.description) facts.push({ label: "Type", value: corpus.description });

  return {
    slug,
    title,
    subtitle: corpus.description ?? `Fiche encyclopédique · ${category}`,
    category,
    summary: corpus.summary.slice(0, 600),
    body: [],
    sections: corpus.sections,
    facts,
    image: corpus.image,
    tags: ["RDC", category, "import-wiki"],
    relatedSlugs: [],
  };
}

async function importTitle(
  title: string,
  category: AyebiCategory,
  source: string,
  existingSlugs: Set<string>,
  delay: number,
): Promise<"imported" | "skipped" | "error"> {
  const slug = slugifyTitle(title);
  if (existingSlugs.has(slug)) return "skipped";

  try {
    const corpus = await fetchWikiCorpus(title.replace(/ /g, "_"), title);
    if (!corpus || corpus.summary.length < 40) return "skipped";

    const article = wikiTitleToArticle(title, category, corpus);
    const result = saveArticle(
      article,
      { id: "bulk-import", name: "Import Ayebi", role: "admin" },
      `Import · ${source}`,
    );

    if ("error" in result) return "error";
    existingSlugs.add(slug);
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    return "imported";
  } catch {
    return "error";
  }
}

export type BulkImportResult = {
  imported: number;
  skipped: number;
  errors: number;
  totalArticles: number;
  categoriesProcessed: number;
  titlesDiscovered: number;
};

export async function bulkImportRdc(opts?: { maxPerCategory?: number; delayMs?: number }): Promise<BulkImportResult> {
  const maxPer = opts?.maxPerCategory ?? 250;
  const delay = opts?.delayMs ?? 80;
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  let categoriesProcessed = 0;

  const existingSlugs = new Set(
    (getDb().prepare("SELECT slug FROM ayebi_articles").all() as { slug: string }[]).map((r) => r.slug),
  );

  const allTitles = new Map<string, AyebiCategory>();

  for (const cat of RDC_CATEGORIES) {
    categoriesProcessed++;
    const limit = Math.min(cat.maxArticles, maxPer);
    const titles = await listCategoryMembers(cat.wikiCategory, limit);
    for (const t of titles) allTitles.set(t, cat.ayebiCategory);
  }

  const linkTitles = await listRdcArticleLinks(400);
  for (const t of linkTitles) {
    if (!allTitles.has(t)) allTitles.set(t, guessCategory(t));
  }

  for (const q of SEARCH_QUERIES) {
    const found = await searchWikiTitles(q, 30);
    for (const t of found) {
      if (!allTitles.has(t)) allTitles.set(t, guessCategory(t));
    }
  }

  for (const [title, category] of allTitles) {
    const result = await importTitle(title, category, "wikipedia-fr", existingSlugs, delay);
    if (result === "imported") imported++;
    else if (result === "skipped") skipped++;
    else errors++;
  }

  const totalArticles = (getDb().prepare("SELECT COUNT(*) as c FROM ayebi_articles").get() as { c: number }).c;

  getDb()
    .prepare(
      `INSERT INTO job_runs (job_type, status, detail, started_at, finished_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      "ayebi_bulk_import",
      "done",
      JSON.stringify({ imported, skipped, errors, totalArticles, titlesDiscovered: allTitles.size }),
      new Date().toISOString(),
      new Date().toISOString(),
    );

  return {
    imported,
    skipped,
    errors,
    totalArticles,
    categoriesProcessed,
    titlesDiscovered: allTitles.size,
  };
}

export function ayebiStats() {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) as c FROM ayebi_articles").get() as { c: number }).c;
  const revisions = (db.prepare("SELECT COUNT(*) as c FROM ayebi_revisions").get() as { c: number }).c;
  const byCat = db
    .prepare("SELECT category, COUNT(*) as c FROM ayebi_articles GROUP BY category")
    .all() as Array<{ category: string; c: number }>;
  return { total, revisions, byCategory: byCat };
}
