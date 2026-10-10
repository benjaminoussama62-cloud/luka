import { randomUUID } from "crypto";
import type { AyebiArticle, AyebiCategory, AyebiQuality, AyebiSection } from "./types";
import { getDb, getDbMode } from "../storage/database";
import { AYEBI_ARTICLES } from "./index";
import { ECOSYSTEM_ARTICLES } from "./articles-ecosystem";
import { extractReferences } from "./wiki-markup";
import { ftsMatchQueries } from "../search-index/fts-query";

export type AyebiRole = "reader" | "contributor" | "moderator" | "admin";
export type PageProtection = "none" | "semi" | "full";

export type StoredArticle = AyebiArticle & {
  revision: number;
  protection: PageProtection;
  stub: boolean;
  viewCount: number;
  contributorCount: number;
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
    gallery: a.gallery,
    coordinates: a.coordinates,
    quality: a.quality,
    relatedSlugs: a.relatedSlugs,
    references: a.references,
    portalId: a.portalId,
    navboxSlugs: a.navboxSlugs,
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
    references: content.references,
    portalId: content.portalId ?? (row.portal_id ? String(row.portal_id) : undefined),
    stub: Boolean(row.stub),
    gallery: content.gallery,
    coordinates: content.coordinates,
    quality: content.quality,
    navboxSlugs: content.navboxSlugs,
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
  if ((c?.n ?? 0) > 0) {
    syncEcosystemArticles();
    return;
  }
  if (getDbMode() === "memory") return;

  for (const a of AYEBI_ARTICLES) {
    upsertAyebiArticle(a);
  }
}

function upsertAyebiArticle(a: AyebiArticle) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO ayebi_articles (slug, title, subtitle, category, summary, content_json, tags_json, protection, stub, revision, created_at, created_by, created_by_name, updated_at, updated_by, updated_by_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'none', 0, 1, ?, 'system', 'Ayebi', ?, 'system', 'Ayebi')
     ON CONFLICT(slug) DO UPDATE SET
       title=excluded.title, subtitle=excluded.subtitle, category=excluded.category,
       summary=excluded.summary, content_json=excluded.content_json, tags_json=excluded.tags_json,
       updated_at=excluded.updated_at`,
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

/** Met à jour les fiches apps (Jemsa, Tala…) même si la base était déjà seedée. */
export function syncEcosystemArticles() {
  if (getDbMode() === "memory") return;
  for (const a of ECOSYSTEM_ARTICLES) {
    upsertAyebiArticle(a);
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
    stub: Boolean(row.stub),
    viewCount: Number(row.view_count ?? 0),
    contributorCount: Number(row.contributor_count ?? 0),
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
      stub: Boolean(row.stub),
      viewCount: Number(row.view_count ?? 0),
      contributorCount: Number(row.contributor_count ?? 0),
      createdAt: String(row.created_at),
      createdBy: String(row.created_by),
      createdByName: String(row.created_by_name),
      updatedAt: String(row.updated_at),
      updatedBy: String(row.updated_by),
      updatedByName: String(row.updated_by_name),
    };
  });
}

/**
 * Backlinks ("Pages liées") — articles whose wikitext contains a [[slug]]
 * internal link to the target. Scans stored wikitext in content_json.
 */
export function getBacklinks(slug: string, limit = 30): { slug: string; title: string }[] {
  importSeedIfEmpty();
  const rows = getDb()
    .prepare("SELECT slug, title, content_json FROM ayebi_articles WHERE slug != ?")
    .all(slug) as { slug: string; title: string; content_json: string }[];
  return rows
    .filter((r) => {
      const c = r.content_json || "";
      return c.includes(`[[${slug}|`) || c.includes(`[[${slug}]]`);
    })
    .slice(0, limit)
    .map((r) => ({ slug: r.slug, title: r.title }));
}

export function searchAyebiFts(query: string, limit = 20): AyebiArticle[] {
  importSeedIfEmpty();
  const { and, or } = ftsMatchQueries(query.trim());
  if (!and) return listArticles().slice(0, limit);

  try {
    const db = getDb();
    const stmt = `SELECT slug FROM ayebi_fts WHERE ayebi_fts MATCH ? LIMIT ?`;
    let slugs = db.prepare(stmt).all(and, limit) as { slug: string }[];
    // Rappel identique à l'index web : OR préfixé quand l'AND strict est vide.
    if (slugs.length < Math.min(3, limit) && or !== and) {
      const seen = new Set(slugs.map((s) => s.slug));
      const extra = (db.prepare(stmt).all(or, limit) as { slug: string }[]).filter(
        (s) => !seen.has(s.slug),
      );
      slugs = [...slugs, ...extra].slice(0, limit);
    }
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
):
  | {
      article: StoredArticle;
      quality: { quality: AyebiQuality; stub: boolean; chars: number; sections: number; refs: number };
      citationWarning?: string;
    }
  | { error: string } {
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
    `INSERT INTO ayebi_articles (slug, title, subtitle, category, summary, content_json, tags_json, protection, stub, revision, created_at, created_by, created_by_name, updated_at, updated_by, updated_by_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       title=excluded.title, subtitle=excluded.subtitle, category=excluded.category,
       summary=excluded.summary, content_json=excluded.content_json, tags_json=excluded.tags_json,
       stub=excluded.stub, revision=excluded.revision, updated_at=excluded.updated_at,
       updated_by=excluded.updated_by, updated_by_name=excluded.updated_by_name`,
  ).run(
    article.slug,
    article.title,
    article.subtitle,
    article.category,
    article.summary,
    articleToJson(article),
    JSON.stringify(article.tags),
    existing?.protection ?? "none",
    article.stub ? 1 : 0,
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

  // Qualité auto avant indexation FTS (stub / quality dans content_json).
  // Fusionne les références markup [ref:…] dans article.references pour le score.
  const fromMarkup = extractReferences(article.sections ?? []);
  const mergedRefs = [
    ...(article.references ?? []),
    ...fromMarkup.filter((r) => !(article.references ?? []).some((x) => x.url === r.url)),
  ];
  const articleForScore: AyebiArticle = { ...article, references: mergedRefs };
  const scored = scoreArticleQuality(articleForScore);
  const articleWithQuality: AyebiArticle = {
    ...articleForScore,
    stub: scored.stub,
    quality: scored.quality,
    references: mergedRefs.length ? mergedRefs : article.references,
  };
  db.prepare(
    `UPDATE ayebi_articles SET stub = ?, content_json = ? WHERE slug = ?`,
  ).run(scored.stub ? 1 : 0, articleToJson(articleWithQuality), article.slug);

  indexAyebiFts(articleWithQuality);
  const saved = getArticle(article.slug);
  if (!saved) return { error: "Erreur de sauvegarde." };

  // Notifications liste de suivi — uniquement sur modification (pas création).
  if (existing && revision > 1) {
    notifyWatchers({
      slug: article.slug,
      title: article.title,
      revision,
      editSummary: editSummary || "Modification",
      actorId: author.id,
      actorName: author.name,
    });
  }

  return {
    article: saved,
    quality: scored,
    citationWarning:
      scored.refs === 0
        ? "Aucune référence source — ajoutez des [ref:url|titre] ou un bloc références pour sortir du statut ébauche."
        : scored.stub
          ? "Article encore en ébauche — enrichissez le contenu et les sources."
          : scored.refs < 2 && scored.chars >= 800
            ? "Peu de références — un article encyclopédique cite généralement plusieurs sources."
            : undefined,
  };
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
):
  | {
      article: StoredArticle;
      quality: { quality: AyebiQuality; stub: boolean; chars: number; sections: number; refs: number };
      citationWarning?: string;
    }
  | { error: string } {
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

// ─── Watchlist ────────────────────────────────────────────────────────────────

export function toggleWatchlist(userId: string, slug: string): boolean {
  const db = getDb();
  const existing = db.prepare("SELECT 1 FROM ayebi_watchlist WHERE user_id = ? AND slug = ?").get(userId, slug);
  if (existing) {
    db.prepare("DELETE FROM ayebi_watchlist WHERE user_id = ? AND slug = ?").run(userId, slug);
    return false;
  }
  db.prepare("INSERT INTO ayebi_watchlist (user_id, slug, created_at) VALUES (?, ?, ?)").run(userId, slug, new Date().toISOString());
  return true;
}

export function isWatching(userId: string, slug: string): boolean {
  return Boolean(getDb().prepare("SELECT 1 FROM ayebi_watchlist WHERE user_id = ? AND slug = ?").get(userId, slug));
}

export function getUserWatchlist(userId: string): string[] {
  const rows = getDb().prepare("SELECT slug FROM ayebi_watchlist WHERE user_id = ? ORDER BY created_at DESC").all(userId) as { slug: string }[];
  return rows.map((r) => r.slug);
}

/**
 * Score qualité encyclopédique — règles générales (pas de cas isolés) :
 * longueur utile, sections structurées, références externes.
 */
export function scoreArticleQuality(article: AyebiArticle): {
  quality: AyebiQuality;
  stub: boolean;
  chars: number;
  sections: number;
  refs: number;
} {
  const sectionPars = (article.sections ?? []).flatMap((s) => [
    ...s.paragraphs,
    ...(s.subsections ?? []).flatMap((ss) => ss.paragraphs),
  ]);
  const bodyText = [...(article.body ?? []), ...sectionPars].join("\n");
  const chars = `${article.summary}\n${bodyText}`.replace(/\s+/g, " ").trim().length;
  const sections = article.sections?.length ?? (article.body?.length ? 1 : 0);
  const markupRefs = (bodyText.match(/\[ref:[^\]]+\]/gi) ?? []).length;
  const refs = Math.max(article.references?.length ?? 0, markupRefs);
  const facts = article.facts?.length ?? 0;

  let quality: AyebiQuality = "ébauche";
  if (chars >= 1200 && sections >= 2 && refs >= 2) quality = "bon article";
  if (chars >= 3500 && sections >= 4 && refs >= 5 && facts >= 4) quality = "article de qualité";
  if (quality === "ébauche" && chars >= 400 && (sections >= 1 || facts >= 2)) quality = "standard";

  const stub = chars < 400 || (refs === 0 && chars < 800);
  return { quality, stub, chars, sections, refs };
}

export type AyebiNotification = {
  id: string;
  userId: string;
  slug: string;
  title: string;
  summary: string;
  actorId: string;
  actorName: string;
  revision: number;
  readAt: string | null;
  createdAt: string;
};

/** Abonnés d'une fiche (hors auteur de la modification). */
function watchersForSlug(slug: string, excludeUserId: string): string[] {
  const rows = getDb()
    .prepare("SELECT user_id FROM ayebi_watchlist WHERE slug = ? AND user_id != ?")
    .all(slug, excludeUserId) as { user_id: string }[];
  return rows.map((r) => r.user_id);
}

export function notifyWatchers(input: {
  slug: string;
  title: string;
  revision: number;
  editSummary: string;
  actorId: string;
  actorName: string;
}): number {
  const watchers = watchersForSlug(input.slug, input.actorId);
  if (!watchers.length) return 0;
  const db = getDb();
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO ayebi_notifications
     (id, user_id, slug, title, summary, actor_id, actor_name, revision, read_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
  );
  let n = 0;
  for (const userId of watchers) {
    insert.run(
      `an_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
      userId,
      input.slug,
      input.title,
      input.editSummary.slice(0, 280),
      input.actorId,
      input.actorName,
      input.revision,
      now,
    );
    n++;
  }
  return n;
}

export function getUserNotifications(userId: string, limit = 40): AyebiNotification[] {
  const rows = getDb()
    .prepare(
      `SELECT id, user_id as userId, slug, title, summary,
              actor_id as actorId, actor_name as actorName, revision,
              read_at as readAt, created_at as createdAt
       FROM ayebi_notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(userId, limit) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    userId: String(r.userId),
    slug: String(r.slug),
    title: String(r.title),
    summary: String(r.summary ?? ""),
    actorId: String(r.actorId),
    actorName: String(r.actorName),
    revision: Number(r.revision),
    readAt: r.readAt == null ? null : String(r.readAt),
    createdAt: String(r.createdAt),
  }));
}

export function countUnreadNotifications(userId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as c FROM ayebi_notifications WHERE user_id = ? AND read_at IS NULL")
    .get(userId) as { c: number } | undefined;
  return row?.c ?? 0;
}

export function markNotificationsRead(userId: string, ids?: string[]): number {
  const db = getDb();
  const now = new Date().toISOString();
  if (ids?.length) {
    const placeholders = ids.map(() => "?").join(",");
    const r = db
      .prepare(
        `UPDATE ayebi_notifications SET read_at = ?
         WHERE user_id = ? AND read_at IS NULL AND id IN (${placeholders})`,
      )
      .run(now, userId, ...ids) as { changes: number };
    return r.changes ?? 0;
  }
  const r = db
    .prepare(
      `UPDATE ayebi_notifications SET read_at = ?
       WHERE user_id = ? AND read_at IS NULL`,
    )
    .run(now, userId) as { changes: number };
  return r.changes ?? 0;
}

// ─── Page views ───────────────────────────────────────────────────────────────

export function recordPageView(slug: string) {
  const day = new Date().toISOString().slice(0, 10);
  const db = getDb();
  db.prepare(
    `INSERT INTO ayebi_page_views (slug, day, views) VALUES (?, ?, 1)
     ON CONFLICT(slug, day) DO UPDATE SET views = views + 1`,
  ).run(slug, day);
  db.prepare("UPDATE ayebi_articles SET view_count = view_count + 1 WHERE slug = ?").run(slug);
}

export function getArticleStats(slug: string): { totalViews: number; last30Days: number; contributorCount: number } {
  const db = getDb();
  const total = db.prepare("SELECT view_count FROM ayebi_articles WHERE slug = ?").get(slug) as { view_count: number } | undefined;
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const recent = db.prepare("SELECT COALESCE(SUM(views),0) as s FROM ayebi_page_views WHERE slug = ? AND day >= ?").get(slug, cutoff) as { s: number } | undefined;
  const contribs = db.prepare("SELECT COUNT(DISTINCT author_id) as c FROM ayebi_revisions WHERE slug = ?").get(slug) as { c: number } | undefined;
  return {
    totalViews: Number(total?.view_count ?? 0),
    last30Days: Number(recent?.s ?? 0),
    contributorCount: Number(contribs?.c ?? 0),
  };
}

// ─── Portails thématiques ─────────────────────────────────────────────────────

export type AyebiPortal = {
  id: string;
  title: string;
  description: string;
  image?: string;
  tags: string[];
  createdAt: string;
};

export function listPortals(): AyebiPortal[] {
  const rows = getDb().prepare("SELECT * FROM ayebi_portals ORDER BY title ASC").all() as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    description: String(r.description ?? ""),
    image: r.image ? String(r.image) : undefined,
    tags: JSON.parse(String(r.tags_json || "[]")) as string[],
    createdAt: String(r.created_at),
  }));
}

export function getPortal(id: string): AyebiPortal | null {
  const r = getDb().prepare("SELECT * FROM ayebi_portals WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    id: String(r.id),
    title: String(r.title),
    description: String(r.description ?? ""),
    image: r.image ? String(r.image) : undefined,
    tags: JSON.parse(String(r.tags_json || "[]")) as string[],
    createdAt: String(r.created_at),
  };
}

export function upsertPortal(portal: Omit<AyebiPortal, "createdAt">) {
  const now = new Date().toISOString();
  getDb().prepare(
    `INSERT INTO ayebi_portals (id, title, description, image, tags_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, image=excluded.image, tags_json=excluded.tags_json`,
  ).run(portal.id, portal.title, portal.description, portal.image ?? null, JSON.stringify(portal.tags), now);
}

export function getPortalArticles(portalId: string, limit = 50): StoredArticle[] {
  const portal = getPortal(portalId);
  if (!portal) return [];
  const all = listArticles();
  return all
    .filter((a) => a.portalId === portalId || portal.tags.some((t) => a.tags.includes(t) || a.category === t))
    .slice(0, limit);
}

// ─── Signalement (flags) ──────────────────────────────────────────────────────

export type AyebiFlag = {
  id: number;
  slug: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  detail: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
};

export function addFlag(slug: string, reporter: { id: string; name: string }, reason: string, detail = "") {
  getDb().prepare(
    "INSERT INTO ayebi_flags (slug, reporter_id, reporter_name, reason, detail, status, created_at) VALUES (?, ?, ?, ?, ?, 'open', ?)",
  ).run(slug, reporter.id, reporter.name, reason, detail, new Date().toISOString());
}

export function getFlags(slug: string): AyebiFlag[] {
  const rows = getDb().prepare("SELECT * FROM ayebi_flags WHERE slug = ? ORDER BY created_at DESC").all(slug) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    reporterId: String(r.reporter_id),
    reporterName: String(r.reporter_name),
    reason: String(r.reason),
    detail: String(r.detail ?? ""),
    status: String(r.status) as AyebiFlag["status"],
    createdAt: String(r.created_at),
  }));
}

export function resolveFlag(id: number, status: "resolved" | "dismissed") {
  getDb().prepare("UPDATE ayebi_flags SET status = ? WHERE id = ?").run(status, id);
}

export function getAllOpenFlags(limit = 100): AyebiFlag[] {
  const rows = getDb().prepare("SELECT * FROM ayebi_flags WHERE status = 'open' ORDER BY created_at DESC LIMIT ?").all(limit) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    reporterId: String(r.reporter_id),
    reporterName: String(r.reporter_name),
    reason: String(r.reason),
    detail: String(r.detail ?? ""),
    status: "open" as const,
    createdAt: String(r.created_at),
  }));
}

// ─── Protection de page ───────────────────────────────────────────────────────

export function setPageProtection(slug: string, protection: PageProtection) {
  getDb().prepare("UPDATE ayebi_articles SET protection = ? WHERE slug = ?").run(protection, slug);
}

// ─── Profil utilisateur public ────────────────────────────────────────────────

export type UserPublicProfile = {
  id: string;
  name: string;
  avatarColor: string;
  role: string;
  createdAt: string;
  editCount: number;
  articleCount: number;
};

export function getUserPublicProfile(userId: string): UserPublicProfile | null {
  const db = getDb();
  const user = db.prepare("SELECT id, name, avatar_color, role, created_at FROM users WHERE id = ?").get(userId) as Record<string, unknown> | undefined;
  if (!user) return null;
  const edits = db.prepare("SELECT COUNT(*) as c FROM ayebi_revisions WHERE author_id = ?").get(userId) as { c: number };
  const articles = db.prepare("SELECT COUNT(*) as c FROM ayebi_articles WHERE created_by = ?").get(userId) as { c: number };
  return {
    id: String(user.id),
    name: String(user.name),
    avatarColor: String(user.avatar_color),
    role: String(user.role),
    createdAt: String(user.created_at),
    editCount: Number(edits.c),
    articleCount: Number(articles.c),
  };
}

export function getUserContributions(userId: string, limit = 30) {
  return getDb()
    .prepare(
      `SELECT r.revision, r.slug, r.edit_summary as editSummary, r.author_name as authorName,
              r.created_at as createdAt, a.title
       FROM ayebi_revisions r
       LEFT JOIN ayebi_articles a ON a.slug = r.slug
       WHERE r.author_id = ?
       ORDER BY r.created_at DESC LIMIT ?`,
    )
    .all(userId, limit) as Array<{ revision: number; slug: string; editSummary: string; authorName: string; createdAt: string; title: string }>;
}

// ─── Catégories navigables ────────────────────────────────────────────────────

export function listCategoryArticles(categoryId: string, limit = 100): StoredArticle[] {
  const catMap: Record<string, string> = {
    personnalites: "personnalité",
    lieux: "lieu",
    institutions: "institution",
    culture: "culture",
    sport: "sport",
    economie: "économie",
  };
  const cat = catMap[categoryId] ?? categoryId;
  const rows = getDb()
    .prepare("SELECT * FROM ayebi_articles WHERE category = ? ORDER BY title ASC LIMIT ?")
    .all(cat, limit) as Record<string, unknown>[];
  return rows.map((row) => ({
    ...jsonToArticle(row),
    revision: Number(row.revision),
    protection: String(row.protection) as PageProtection,
    stub: Boolean(row.stub),
    viewCount: Number(row.view_count ?? 0),
    contributorCount: Number(row.contributor_count ?? 0),
    createdAt: String(row.created_at),
    createdBy: String(row.created_by),
    createdByName: String(row.created_by_name),
    updatedAt: String(row.updated_at),
    updatedBy: String(row.updated_by),
    updatedByName: String(row.updated_by_name),
  }));
}

// ─── Recherche avancée ────────────────────────────────────────────────────────

export type SearchFilters = {
  category?: string;
  stub?: boolean;
  sortBy?: "relevance" | "recent" | "views" | "title";
  limit?: number;
};

export function advancedSearch(query: string, filters: SearchFilters = {}): StoredArticle[] {
  const { category, stub, sortBy = "relevance", limit = 30 } = filters;
  const q = query.trim();

  // Texte → FTS d'abord (sinon le LIMIT SQL coupe avant le filtre lexical).
  if (q && sortBy === "relevance") {
    let out = searchAyebiFts(q, Math.max(limit * 4, 40)) as StoredArticle[];
    out = out.filter(Boolean);
    if (category) out = out.filter((a) => a.category === category);
    if (stub !== undefined) out = out.filter((a) => a.stub === stub);
    return out.slice(0, limit);
  }

  let sql = "SELECT * FROM ayebi_articles WHERE 1=1";
  const params: unknown[] = [];
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  if (stub !== undefined) {
    sql += " AND stub = ?";
    params.push(stub ? 1 : 0);
  }
  if (q) {
    sql += " AND (title LIKE ? OR summary LIKE ? OR tags_json LIKE ?)";
    const like = `%${q.replace(/%/g, "")}%`;
    params.push(like, like, like);
  }
  const orderMap: Record<string, string> = {
    recent: "updated_at DESC",
    views: "view_count DESC",
    title: "title ASC",
    relevance: "updated_at DESC",
  };
  sql += ` ORDER BY ${orderMap[sortBy] ?? "updated_at DESC"} LIMIT ?`;
  params.push(limit);
  const rows = getDb().prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map((row) => ({
    ...jsonToArticle(row),
    revision: Number(row.revision),
    protection: String(row.protection) as PageProtection,
    stub: Boolean(row.stub),
    viewCount: Number(row.view_count ?? 0),
    contributorCount: Number(row.contributor_count ?? 0),
    createdAt: String(row.created_at),
    createdBy: String(row.created_by),
    createdByName: String(row.created_by_name),
    updatedAt: String(row.updated_at),
    updatedBy: String(row.updated_by),
    updatedByName: String(row.updated_by_name),
  }));
}
