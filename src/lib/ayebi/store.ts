import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { AYEBI_CATEGORIES, slugifyTitle } from "./constants";
import type { AyebiArticle } from "./types";

const AYEBI_DIR =
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.cwd() === "/var/task"
    ? path.join("/tmp", "ayeba-data", "ayebi")
    : path.join(process.cwd(), "data", "ayebi");

export { slugifyTitle, AYEBI_CATEGORIES };

export type AyebiArticleMeta = {
  revision: number;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
};

export type StoredAyebiArticle = AyebiArticle & AyebiArticleMeta;

export type AyebiRevision = {
  revision: number;
  slug: string;
  editSummary: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  article: AyebiArticle;
};

type ArticlesFile = { articles: Record<string, StoredAyebiArticle> };
type RevisionsFile = { bySlug: Record<string, AyebiRevision[]> };

async function ensureAyebiDir() {
  try {
    await mkdir(AYEBI_DIR, { recursive: true });
  } catch (e) {
    console.warn("[ayebi] ensureDir skipped", e);
  }
}

async function readAyebiJson<T>(file: string, fallback: T): Promise<T> {
  await ensureAyebiDir();
  try {
    const raw = await readFile(path.join(AYEBI_DIR, file), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeAyebiJson<T>(file: string, data: T) {
  await ensureAyebiDir();
  await writeFile(path.join(AYEBI_DIR, file), JSON.stringify(data, null, 2), "utf-8");
}

export async function getStoredArticles(): Promise<StoredAyebiArticle[]> {
  const data = await readAyebiJson<ArticlesFile>("articles.json", { articles: {} });
  return Object.values(data.articles).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getStoredArticle(slug: string): Promise<StoredAyebiArticle | null> {
  const data = await readAyebiJson<ArticlesFile>("articles.json", { articles: {} });
  return data.articles[slug] ?? null;
}

export async function getRevisions(slug: string, limit = 20): Promise<AyebiRevision[]> {
  const data = await readAyebiJson<RevisionsFile>("revisions.json", { bySlug: {} });
  return (data.bySlug[slug] ?? []).slice(0, limit);
}

export async function getRecentEdits(limit = 30): Promise<(AyebiRevision & { title: string })[]> {
  const data = await readAyebiJson<RevisionsFile>("revisions.json", { bySlug: {} });
  const all = Object.values(data.bySlug)
    .flat()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return all.slice(0, limit).map((r) => ({
    ...r,
    title: r.article.title,
  }));
}

export async function saveArticle(
  article: AyebiArticle,
  author: { id: string; name: string },
  editSummary: string,
  opts?: { create?: boolean },
): Promise<{ article: StoredAyebiArticle } | { error: string }> {
  if (!article.title.trim()) return { error: "Titre requis." };
  if (!article.summary.trim()) return { error: "Résumé requis." };
  if (!article.slug.trim()) return { error: "Identifiant requis." };

  const articlesData = await readAyebiJson<ArticlesFile>("articles.json", { articles: {} });
  const revisionsData = await readAyebiJson<RevisionsFile>("revisions.json", { bySlug: {} });

  const existing = articlesData.articles[article.slug];
  if (opts?.create && existing) return { error: "Une fiche avec cet identifiant existe déjà." };

  const now = new Date().toISOString();
  const revision = (existing?.revision ?? 0) + 1;

  const stored: StoredAyebiArticle = {
    ...article,
    revision,
    createdAt: existing?.createdAt ?? now,
    createdBy: existing?.createdBy ?? author.id,
    createdByName: existing?.createdByName ?? author.name,
    updatedAt: now,
    updatedBy: author.id,
    updatedByName: author.name,
  };

  articlesData.articles[article.slug] = stored;

  const rev: AyebiRevision = {
    revision,
    slug: article.slug,
    editSummary: editSummary.trim() || (opts?.create ? "Création de la fiche" : "Modification"),
    authorId: author.id,
    authorName: author.name,
    createdAt: now,
    article: {
      slug: article.slug,
      title: article.title,
      subtitle: article.subtitle,
      category: article.category,
      summary: article.summary,
      body: article.body,
      sections: article.sections,
      timeline: article.timeline,
      facts: article.facts,
      image: article.image,
      tags: article.tags,
      relatedSlugs: article.relatedSlugs,
    },
  };

  const history = revisionsData.bySlug[article.slug] ?? [];
  revisionsData.bySlug[article.slug] = [rev, ...history].slice(0, 50);

  await writeAyebiJson("articles.json", articlesData);
  await writeAyebiJson("revisions.json", revisionsData);

  return { article: stored };
}
