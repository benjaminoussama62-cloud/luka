import { getDb } from "../storage/database";
import { AYEBI_ARTICLES } from "../ayebi/index";
import { navigationalSiteForQuery, relevanceScore } from "../search-relevance";

export type KgEntity = {
  id: string;
  label: string;
  kind: string;
  summary: string;
  ayebiSlug?: string;
};

export function syncAyebiToGraph() {
  const db = getDb();
  const ins = db.prepare(
    `INSERT OR REPLACE INTO kg_entities (id, label, kind, summary, ayebi_slug) VALUES (?, ?, ?, ?, ?)`,
  );
  const edge = db.prepare(
    `INSERT INTO kg_edges (from_id, to_id, relation, weight) VALUES (?, ?, ?, ?)`,
  );

  for (const a of AYEBI_ARTICLES) {
    const eid = `ayebi:${a.slug}`;
    ins.run(eid, a.title, a.category, a.summary, a.slug);

    for (const rel of a.relatedSlugs ?? []) {
      edge.run(eid, `ayebi:${rel}`, "related", 1);
    }
    edge.run(eid, `cat:${a.category}`, "in_category", 0.5);
    db.prepare(
      `INSERT OR IGNORE INTO kg_entities (id, label, kind, summary) VALUES (?, ?, 'category', '')`,
    ).run(`cat:${a.category}`, a.category);
  }
}

export function getEntity(id: string): KgEntity | null {
  const row = getDb()
    .prepare("SELECT id, label, kind, summary, ayebi_slug FROM kg_entities WHERE id = ?")
    .get(id) as KgEntity & { ayebi_slug?: string } | undefined;
  if (!row) return null;
  return { ...row, ayebiSlug: row.ayebi_slug };
}

export function findEntities(query: string, limit = 8): KgEntity[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const rows = getDb()
    .prepare(
      `SELECT id, label, kind, summary, ayebi_slug as ayebiSlug FROM kg_entities LIMIT 200`,
    )
    .all() as KgEntity[];
  return rows
    .map((entity) => ({
      entity,
      score: relevanceScore(`${entity.label} ${entity.summary}`, query),
    }))
    .filter((x) => x.score >= 45)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.entity);
}

export function relatedEntities(id: string, limit = 6) {
  return getDb()
    .prepare(
      `SELECT e.id, e.label, e.kind, e.summary, e.ayebi_slug as ayebiSlug, ed.relation
       FROM kg_edges ed JOIN kg_entities e ON e.id = ed.to_id
       WHERE ed.from_id = ? LIMIT ?`,
    )
    .all(id, limit) as Array<KgEntity & { relation: string }>;
}

export function panelFromQuery(query: string) {
  if (navigationalSiteForQuery(query)) return null;
  try {
    const db = getDb();
    const count = db.prepare("SELECT COUNT(*) as c FROM kg_entities").get() as { c: number } | undefined;
    if (!count || count.c < 8) syncAyebiToGraph();
  } catch {
    /* ignore */
  }
  const entities = findEntities(query, 5);
  if (!entities.length) return null;
  const scored = entities
    .map((entity) => ({
      entity,
      score: relevanceScore(`${entity.label} ${entity.summary}`, query),
    }))
    .filter((x) => x.score >= 45)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  const main = scored[0].entity;
  const related = relatedEntities(main.id, 5);
  return { entity: main, related };
}
