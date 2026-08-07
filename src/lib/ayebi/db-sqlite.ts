import type { AyebiArticle, AyebiCategory, AyebiSection } from "./types";
import { getDb, getDbMode } from "../storage/database";
import { AYEBI_ARTICLES } from "./index";

export type AyebiRole = "reader" | "contributor" | "moderator" | "admin";
export type PageProtection = "none" | "semi" | "full";

export type StoredArticle = AyebiArticle & {
  revision: number;
  protection: PageProtection;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
};

export type RevisionRow = {
  revision: number;
  slug: string;
  editSummary: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  article: AyebiArticle;
};

function articleToJson(a: AyebiArticle) {
  return JSON.stringify({
    body: a.body,
    sections: a.sections,
    timeline: a.timeline,
    facts: a.facts,
    image: a.image,
    relatedSlugs: a.relatedSlugs,
  });
}

function jsonToArticle(row: Record<string, unknown>): AyebiArticle {
  const content = JSON.parse(String(row.content_json || "{}")) as Partial<AyebiArticle>;
  return {
    slug: String(row.slug),
    title: String(row.title),
    subtitle: String(row.subtitle ?? ""),
    category: String(row.category) as AyebiCategory,
    summary: String(row.summary),
    body: content.body ?? [],
    sections: content.sections,
    timeline: content.timeline,
    facts: content.facts ?? [],
    image: content.image,
    tags: JSON.parse(String(row.tags_json || "[]")) as string[],
    relatedSlugs: content.relatedSlugs,
  };
}

function indexAyebiFts(a: AyebiArticle) {
  const db = getDb();
  const body = (a.sections ?? [])
    .flatMap((s) => s.paragraphs)
    .join(" ")
    .slice(0, 12000);
  db.prepare("DELETE FROM ayebi_fts WHERE slug = ?").run(a.slug);
  db.prepare(
    `INSERT INTO ayebi_fts (slug, title, summary, body, tags) VALUES (?, ?, ?, ?, ?)`,
  ).run(a.slug, a.title, a.summary, body, a.tags.join(" "));
}

export function importSeedIfEmpty() {
  const db = getDb();
  const c = db.prepare("SELECT COUNT(*) as n FROM ayebi_articles").get() as { n?: number } | undefined;
  if ((c?.n ?? 0) > 0) return;
  if (getDbMode() === "memory") return;

  for (const a of AYEBI_ARTICLES) {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO ayebi_articles (slug, title, subtitle, category, summary, content_json, tags_json, protection, revision, created_at, created_by, created_by_name, updated_at, updated_by, updated_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'none', 1, ?, 'system', 'Ayebi', ?, 'system', 'Ayebi')`,
    ).run(
      a.slug,
      a.title,
      a.subtitle,
      a.category,
      a.summary,
      articleToJson(a),
      JSON.stringify(a.tags),
      now,
      now,
    );
    indexAyebiFts(a);
  }
}

export function getArticle(slug: string): StoredArticle | null {
  importSeedIfEmpty();
  const row = getDb().prepare("SELECT * FROM ayebi_articles WHERE slug = ?").get(slug) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  const a = jsonToArticle(row);
  return {
    ...a,
    revision: Number(row.revision),
    protection: String(row.protection) as PageProtection,
    createdAt: String(row.created_at),
    createdBy: String(row.created_by),
    createdByName: String(row.created_by_name),
    updatedAt: String(row.updated_at),
    updatedBy: String(row.updated_by),
    updatedByName: String(row.updated_by_name),
  };
}

export function listArticles(): StoredArticle[] {
  importSeedIfEmpty();
  const rows = getDb()
    .prepare("SELECT * FROM ayebi_articles ORDER BY updated_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map((row) => {
    const a = jsonToArticle(row);
    return {
      ...a,
      revision: Number(row.revision),
      protection: String(row.protection) as PageProtection,
      createdAt: String(row.created_at),
      createdBy: String(row.created_by),
      createdByName: String(row.created_by_name),
      updatedAt: String(row.updated_at),
      updatedBy: String(row.updated_by),
      updatedByName: String(row.updated_by_name),
    };
  });
}

export function searchAyebiFts(query: string, limit = 20): AyebiArticle[] {
  importSeedIfEmpty();
  const tokens = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map((t) => `"${t.replace(/"/g, "")}"`)
    .join(" ");
  if (!tokens) return listArticles().slice(0, limit);

  try {
    const slugs = getDb()
      .prepare(`SELECT slug FROM ayebi_fts WHERE ayebi_fts MATCH ? LIMIT ?`)
      .all(tokens, limit) as { slug: string }[];
    return slugs.map((s) => getArticle(s.slug)).filter((a): a is StoredArticle => Boolean(a));
  } catch {
    return [];
  }
}

export function saveArticle(
  article: AyebiArticle,
  author: { id: string; name: string; role: AyebiRole },
  editSummary: string,
  opts?: { create?: boolean; draft?: boolean },
): { article: StoredArticle } | { error: string } {
  importSeedIfEmpty();
  const db = getDb();
  const existing = getArticle(article.slug);

  if (opts?.create && existing) return { error: "Fiche existante." };
  if (existing?.protection === "full" && author.role !== "admin") {
    return { error: "Page protégée — admin requis." };
  }
  if (existing?.protection === "semi" && author.role === "contributor") {
    return { error: "Page semi-protégée — modérateur requis." };
  }

  const now = new Date().toISOString();
  const revision = (existing?.revision ?? 0) + 1;

  db.prepare(
    `INSERT INTO ayebi_articles (slug, title, subtitle, category, summary, content_json, tags_json, protection, revision, created_at, created_by, created_by_name, updated_at, updated_by, updated_by_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       title=excluded.title, subtitle=excluded.subtitle, category=excluded.category,
       summary=excluded.summary, content_json=excluded.content_json, tags_json=excluded.tags_json,
       revision=excluded.revision, updated_at=excluded.updated_at, updated_by=excluded.updated_by, updated_by_name=excluded.updated_by_name`,
  ).run(
    article.slug,
    article.title,
    article.subtitle,
    article.category,
    article.summary,
    articleToJson(article),
    JSON.stringify(article.tags),
    existing?.protection ?? "none",
    revision,
    existing?.createdAt ?? now,
    existing?.createdBy ?? author.id,
    existing?.createdByName ?? author.name,
    now,
    author.id,
    author.name,
  );

  db.prepare(
    `INSERT INTO ayebi_revisions (slug, revision, edit_summary, content_json, author_id, author_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(article.slug, revision, editSummary, articleToJson(article), author.id, author.name, now);

  indexAyebiFts(article);
  const saved = getArticle(article.slug);
  if (!saved) return { error: "Erreur de sauvegarde." };
  return { article: saved };
}

export function getRevisions(slug: string, limit = 30): RevisionRow[] {
  const rows = getDb()
    .prepare(
      `SELECT revision, slug, edit_summary as editSummary, author_id as authorId, author_name as authorName, created_at as createdAt, content_json
       FROM ayebi_revisions WHERE slug = ? ORDER BY revision DESC LIMIT ?`,
    )
    .all(slug, limit) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    revision: Number(r.revision),
    slug: String(r.slug),
    editSummary: String(r.editSummary),
    authorId: String(r.authorId),
    authorName: String(r.authorName),
    createdAt: String(r.createdAt),
    article: { ...jsonToArticle({ ...r, content_json: r.content_json }), slug },
  }));
}

export function getRevision(slug: string, revision: number): RevisionRow | null {
  const r = getDb()
    .prepare(
      `SELECT revision, slug, edit_summary as editSummary, author_id as authorId, author_name as authorName, created_at as createdAt, content_json
       FROM ayebi_revisions WHERE slug = ? AND revision = ?`,
    )
    .get(slug, revision) as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    revision: Number(r.revision),
    slug: String(r.slug),
    editSummary: String(r.editSummary),
    authorId: String(r.authorId),
    authorName: String(r.authorName),
    createdAt: String(r.createdAt),
    article: jsonToArticle(r),
  };
}

export function restoreRevision(
  slug: string,
  revision: number,
  author: { id: string; name: string; role: AyebiRole },
): { article: StoredArticle } | { error: string } {
  const rev = getRevision(slug, revision);
  if (!rev) return { error: "Révision introuvable." };
  return saveArticle(rev.article, author, `Restauration rev. ${revision}`);
}

export function addTalkMessage(slug: string, author: { id: string; name: string }, body: string) {
  getDb()
    .prepare(
      `INSERT INTO ayebi_talk (slug, author_id, author_name, body, created_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(slug, author.id, author.name, body.trim(), new Date().toISOString());
}

export function getTalkMessages(slug: string, limit = 50) {
  return getDb()
    .prepare(
      `SELECT id, author_name as authorName, body, created_at as createdAt FROM ayebi_talk WHERE slug = ? ORDER BY id DESC LIMIT ?`,
    )
    .all(slug, limit) as Array<{ id: number; authorName: string; body: string; createdAt: string }>;
}

export function getRecentEdits(limit = 40) {
  const rows = getDb()
    .prepare(
      `SELECT r.revision, r.slug, r.edit_summary as editSummary, r.author_id as authorId,
              r.author_name as authorName, r.created_at as createdAt, r.content_json, a.title
       FROM ayebi_revisions r
       LEFT JOIN ayebi_articles a ON a.slug = r.slug
       ORDER BY r.created_at DESC LIMIT ?`,
    )
    .all(limit) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    revision: Number(r.revision),
    slug: String(r.slug),
    editSummary: String(r.editSummary),
    authorId: String(r.authorId),
    authorName: String(r.authorName),
    createdAt: String(r.createdAt),
    title: String(r.title ?? r.slug),
    article: jsonToArticle(r),
  }));
}

export function textOfArticle(a: AyebiArticle): string {
  const secs = a.sections ?? [{ heading: "", paragraphs: a.body }];
  return secs.map((s) => `# ${s.heading}\n${s.paragraphs.join("\n\n")}`).join("\n\n");
}

export function parseSectionsFromWiki(raw: string): AyebiSection[] {
  return raw
    .split(/\n---+\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [heading, ...rest] = block.split("\n");
      return { heading: heading.trim(), paragraphs: rest.join("\n").split(/\n\n+/).map((p) => p.trim()).filter(Boolean) };
    })
    .filter((s) => s.heading && s.paragraphs.length);
}
