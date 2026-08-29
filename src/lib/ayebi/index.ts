import type { KnowledgePanel } from "../types";
import { CULTURE_ARTICLES, SPORT_ARTICLES } from "./articles-culture-sport";
import { ECOSYSTEM_ARTICLES } from "./articles-ecosystem";
import { FLAGSHIP_ARTICLES } from "./articles-flagship";
import { INSTITUTION_ARTICLES, ECONOMY_ARTICLES } from "./articles-institutions-economy";
import { PERSONALITY_ARTICLES } from "./articles-personalities";
import { PLACE_ARTICLES } from "./articles-places";
import type { AyebiArticle, AyebiCategory } from "./types";

export type { AyebiArticle, AyebiCategory } from "./types";
export { isDeepArticle } from "./enrich-live";
export { slugifyTitle, AYEBI_CATEGORIES } from "./constants";

const FLAGSHIP_MAP = new Map(FLAGSHIP_ARTICLES.map((a) => [a.slug, a]));
const ECOSYSTEM_MAP = new Map(ECOSYSTEM_ARTICLES.map((a) => [a.slug, a]));

const RAW: AyebiArticle[] = [
  ...PERSONALITY_ARTICLES,
  ...PLACE_ARTICLES,
  ...CULTURE_ARTICLES,
  ...SPORT_ARTICLES,
  ...INSTITUTION_ARTICLES,
  ...ECONOMY_ARTICLES,
  ...ECOSYSTEM_ARTICLES,
];

export const AYEBI_ARTICLES: AyebiArticle[] = RAW.map((a) => {
  const ecosystem = ECOSYSTEM_MAP.get(a.slug);
  const flagship = FLAGSHIP_MAP.get(a.slug);
  return ecosystem ?? flagship ?? a;
});

/** Corpus statique de départ (81 fiches) — modifiable par les contributeurs */
export const AYEBI_SEED_ARTICLES = AYEBI_ARTICLES;

export function scoreArticle(article: AyebiArticle, query: string): number {
  const q = query.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const qc = q.replace(/[\s._-]/g, "");
  const tokens = q.split(/[\s\-_./]+/).filter((t) => t.length >= 2);
  let score = 0;
  const hay = `${article.title} ${article.subtitle} ${article.summary} ${article.tags.join(" ")} ${article.slug} ${article.facts.map((f) => f.value).join(" ")}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  if (hay.includes(q)) score += 50;
  if (qc.includes("totala") && article.slug === "tala") score += 90;
  if (qc.includes("sombatekaonline") && article.slug === "sombateka") score += 90;
  if (qc.includes("jemsa") && article.slug === "jemsa") score += 70;
  if (qc.includes("omega") && article.slug === "omega") score += 70;
  for (const t of tokens) {
    if (article.slug.includes(t)) score += 28;
    if (article.tags.some((tag) => tag.includes(t) || t.includes(tag))) score += 18;
    if (hay.includes(t)) score += 10;
  }
  if (article.category === "lieu" && /\b(stade|marché|marche|ville|parc|aéroport)\b/.test(q)) score += 5;
  if (article.category === "personnalité" && /\b(président|president|ministre|footballeur|chanteur)\b/.test(q)) score += 5;
  if (/\b(jemsa|tala|sombateka|omega|devalpha|ayeba)\b/.test(q)) {
    const brandHit =
      article.slug === q ||
      article.tags.some((tag) => q.includes(tag) || tag.includes(q)) ||
      article.title.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").includes(q);
    if (brandHit) score += 45;
  }
  return score;
}

export function searchAyebiArticles(query: string, limit = 8): AyebiArticle[] {
  const q = query.trim();
  if (!q) return AYEBI_ARTICLES.slice(0, limit);
  return AYEBI_ARTICLES.map((a) => ({ a, s: scoreArticle(a, q) }))
    .filter((x) => x.s >= 8)
    .sort((x, y) => y.s - x.s)
    .slice(0, limit)
    .map((x) => x.a);
}

export function findAyebiArticle(query: string): AyebiArticle | undefined {
  return searchAyebiArticles(query, 1)[0];
}

export function searchAyebi(query: string): KnowledgePanel | undefined {
  const top = findAyebiArticle(query);
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

export function getAyebiArticle(slug: string): AyebiArticle | undefined {
  return AYEBI_ARTICLES.find((a) => a.slug === slug);
}

export function getRelatedArticles(slug: string, limit = 4): AyebiArticle[] {
  const article = getAyebiArticle(slug);
  if (!article) return [];
  const fromSlugs = (article.relatedSlugs ?? [])
    .map((s) => getAyebiArticle(s))
    .filter((a): a is AyebiArticle => Boolean(a));
  if (fromSlugs.length >= limit) return fromSlugs.slice(0, limit);
  const sameCat = AYEBI_ARTICLES.filter((a) => a.category === article.category && a.slug !== slug);
  return [...fromSlugs, ...sameCat].slice(0, limit);
}

export function listAyebiCategories(): { id: AyebiCategory; count: number; label: string }[] {
  const labels: Record<AyebiCategory, string> = {
    personnalité: "Personnalités",
    lieu: "Lieux & monuments",
    institution: "Institutions",
    culture: "Culture & arts",
    sport: "Sport",
    économie: "Économie & mines",
  };
  const map = new Map<AyebiCategory, number>();
  for (const a of AYEBI_ARTICLES) {
    map.set(a.category, (map.get(a.category) ?? 0) + 1);
  }
  return [...map.entries()].map(([id, count]) => ({ id, count, label: labels[id] }));
}

export function articlesByCategory(category: AyebiCategory): AyebiArticle[] {
  return AYEBI_ARTICLES.filter((a) => a.category === category);
}

export const AYEBI_STATS = {
  total: AYEBI_ARTICLES.length,
  categories: listAyebiCategories().length,
};
