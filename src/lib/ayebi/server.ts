import type { KnowledgePanel } from "../types";
import { enrichArticleFromSources, isDeepArticle } from "./enrich-live";
import {
  getArticle,
  importSeedIfEmpty,
  listArticles,
  saveArticle,
  searchAyebiFts,
  getRevisions,
  getRevision,
  restoreRevision,
  addTalkMessage,
  getTalkMessages,
  getRecentEdits as getRecentEditsDb,
} from "./db-sqlite";
import type { AyebiArticle } from "./types";
import { AYEBI_ARTICLES, getAyebiArticle, scoreArticle } from "./index";

export { isDeepArticle } from "./enrich-live";
export { slugifyTitle, AYEBI_CATEGORIES } from "./constants";
export {
  getArticle,
  listArticles,
  saveArticle,
  searchAyebiFts,
  getRevisions,
  getRevision,
  restoreRevision,
  addTalkMessage,
  getTalkMessages,
  importSeedIfEmpty,
} from "./db-sqlite";
export type { StoredArticle, RevisionRow, AyebiRole, PageProtection } from "./db-sqlite";

export async function getStoredArticle(slug: string) {
  importSeedIfEmpty();
  return getArticle(slug);
}

export async function getStoredArticles() {
  importSeedIfEmpty();
  return listArticles();
}

export function getRecentEdits(limit = 40) {
  importSeedIfEmpty();
  return getRecentEditsDb(limit);
}

/** Toutes les fiches SQLite (milliers-ready) */
export async function getAllArticlesMerged(): Promise<AyebiArticle[]> {
  importSeedIfEmpty();
  return listArticles();
}

export async function getAyebiArticleLive(slug: string): Promise<AyebiArticle | undefined> {
  importSeedIfEmpty();
  return getArticle(slug) ?? getAyebiArticle(slug);
}

export async function getAyebiArticleEnriched(slug: string): Promise<AyebiArticle | undefined> {
  importSeedIfEmpty();
  const stored = getArticle(slug);
  if (stored) return stored;

  const base = getAyebiArticle(slug);
  if (!base) return undefined;
  if (isDeepArticle(base)) return base;
  return enrichArticleFromSources(base);
}

export async function searchAyebiArticlesLive(query: string, limit = 8): Promise<AyebiArticle[]> {
  importSeedIfEmpty();
  const fts = searchAyebiFts(query, limit);
  if (fts.length) return fts;

  const all = await getAllArticlesMerged();
  const q = query.trim();
  if (!q) return all.slice(0, limit);
  return all
    .map((a) => ({ a, s: scoreArticle(a, q) }))
    .filter((x) => x.s >= 8)
    .sort((x, y) => y.s - x.s)
    .slice(0, limit)
    .map((x) => x.a);
}

export async function searchAyebiLive(query: string): Promise<KnowledgePanel | undefined> {
  const hits = await searchAyebiArticlesLive(query, 1);
  const top = hits[0];
  if (!top || scoreArticle(top, query) < 12) return undefined;

  return {
    title: top.title,
    subtitle: top.subtitle,
    summary: top.summary,
    facts: [
      ...top.facts,
      { label: "Catégorie", value: top.category },
      { label: "Ayebi", value: `/ayebi/${top.slug}` },
    ],
    sources: ["ayebi"],
    image: top.image,
  };
}

export { scoreArticle, getAyebiArticle, getRelatedArticles, AYEBI_ARTICLES } from "./index";
