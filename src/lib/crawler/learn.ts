import { getDb } from "../storage/database";

/**
 * Boucle d'apprentissage de l'index — module léger (pas de cheerio ni de
 * fetch) pour être importable depuis la route /api/search sans alourdir
 * le bundle de la requête.
 */

export function enqueueUrl(url: string, priority = 0) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO crawl_queue (url, priority, status, scheduled_at, created_at)
     VALUES (?, ?, 'pending', ?, ?) ON CONFLICT(url) DO NOTHING`,
  ).run(url, priority, now, now);
}

/** Connecteurs français qui restent en minuscules dans les titres Wikipedia. */
const WIKI_LC = new Set([
  "de", "du", "la", "le", "les", "des", "et", "en", "au", "aux", "sur", "à", "d'", "l'",
]);

/** Slug Wikipedia d'une requête — convention réelle des titres : mots
 * capitalisés, connecteurs français en minuscules (Province_du_Kwango). */
function wikiSlug(q: string): string | null {
  const cleaned = q.trim().replace(/\s+/g, " ");
  if (cleaned.length < 3 || cleaned.length > 80) return null;
  // Requêtes trop conversationnelles → slug douteux, on saute.
  if (/^(comment|pourquoi|combien|quand|où|ou|est-ce|how|why|when)\b/i.test(cleaned)) {
    return null;
  }
  if (!/[a-zàâäéèêëîïôöûùç]{3,}/i.test(cleaned)) return null;
  return cleaned
    .split(" ")
    .map((w, i) =>
      i > 0 && WIKI_LC.has(w.toLowerCase())
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join("_");
}

/** URLs d'apprentissage pour une requête — utilisé par la route en direct. */
export function querySeeds(query: string): string[] {
  const slug = wikiSlug(query);
  if (!slug) return [];
  return [
    `https://fr.wikipedia.org/wiki/${slug}`,
    `https://en.wikipedia.org/wiki/${slug}`,
  ];
}

/**
 * Boucle auto-apprenante : les requêtes qui servent ≤2 résultats sont des
 * trous de couverture de l'index. On ensemence les articles Wikipedia
 * correspondants en haute priorité — l'index apprend ce que les
 * utilisateurs demandent réellement, pas ce qu'on a deviné en seed.
 * Idempotent : les URLs déjà en file/traitées sont ignorées par le
 * ON CONFLICT d'enqueueUrl.
 */
export function seedFromFailedQueries(limit = 30): number {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT query, COUNT(*) AS c FROM search_events
       WHERE results_count <= 2 AND created_at > datetime('now', '-30 days')
       GROUP BY query ORDER BY c DESC LIMIT ?`,
    )
    .all(limit) as { query: string; c: number }[];
  let seeded = 0;
  for (const { query } of rows) {
    const [fr, en] = querySeeds(query);
    if (!fr) continue;
    enqueueUrl(fr, 70);
    enqueueUrl(en, 60);
    seeded++;
  }
  return seeded;
}
