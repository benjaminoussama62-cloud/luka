import { canUseSyncDb, getDb } from "../storage/database";
import { ftsMatchQueries } from "./fts-query";
import { correctSpelling, indexVocabulary } from "./spell";

export type IndexedDoc = {
  id: string;
  url: string;
  domain: string;
  title: string;
  body: string;
  sourceType: string;
  credibility: number;
  localRelevant: boolean;
};

export function indexDocument(doc: IndexedDoc, extra?: { outLinks?: string[] }) {
  const db = getDb();
  const outLinks = (extra?.outLinks || []).slice(0, 200);
  db.prepare(
    `INSERT INTO crawl_documents (id, url, canonical_url, domain, title, snippet, body, keywords, source_type, credibility, local_relevant, link_count, crawled_at, recrawl_after)
     VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?, ?)
     ON CONFLICT(url) DO UPDATE SET
       title=excluded.title, snippet=excluded.snippet, body=excluded.body,
       credibility=excluded.credibility, link_count=excluded.link_count,
       crawled_at=excluded.crawled_at, recrawl_after=excluded.recrawl_after`,
  ).run(
    doc.id,
    doc.url,
    doc.url,
    doc.domain,
    doc.title,
    doc.body.slice(0, 280),
    doc.body.slice(0, 8000),
    doc.sourceType,
    doc.credibility,
    doc.localRelevant ? 1 : 0,
    outLinks.length,
    new Date().toISOString(),
    new Date(Date.now() + 7 * 86400000).toISOString(),
  );

  // Persist the real link graph edges discovered at crawl time (Radar "Liens").
  if (outLinks.length) {
    try {
      db.prepare("DELETE FROM document_links WHERE source_url = ?").run(doc.url);
      const ins = db.prepare(
        `INSERT OR IGNORE INTO document_links (source_url, source_domain, target_url, target_domain, discovered_at)
         VALUES (?, ?, ?, ?, ?)`,
      );
      const now = new Date().toISOString();
      for (const target of outLinks) {
        try {
          ins.run(doc.url, doc.domain, target, new URL(target).hostname.replace(/^www\./, ""), now);
        } catch { /* malformed target */ }
      }
    } catch { /* link table best-effort */ }
  }

  // Le vocabulaire de l'index alimente la correction « vouliez-vous dire ».
  try {
    indexVocabulary(doc.title, doc.body);
  } catch {
    /* vocab best-effort */
  }

  db.prepare("DELETE FROM search_fts WHERE doc_id = ?").run(doc.id);
  db.prepare(
    `INSERT INTO search_fts (doc_id, url, domain, title, body, source_type, credibility, local_relevant)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    doc.id,
    doc.url,
    doc.domain,
    doc.title,
    doc.body.slice(0, 8000),
    doc.sourceType,
    doc.credibility,
    doc.localRelevant ? 1 : 0,
  );
}

export type FtsHit = {
  docId: string;
  url: string;
  domain: string;
  title: string;
  snippet: string;
  sourceType: string;
  credibility: number;
  localRelevant: boolean;
  rank: number;
  crawledAt?: string;
  inlinks?: number;
  /** true si le doc matche tous les groupes de tokens (AND strict ou corrigé). */
  fullMatch?: boolean;
};

type FtsRow = {
  doc_id: string;
  url: string;
  domain: string;
  title: string;
  snip: string;
  source_type: string;
  credibility: number;
  local_relevant: number;
  rank: number;
  crawled_at: string | null;
  inlinks: number;
};

// bm25 pondéré : le titre compte ~10× plus que le corps — le signal le plus
// discriminant d'une SERP propre. Le JOIN apporte crawled_at (fraîcheur
// réelle) et le sous-select les inlinks (autorité du graphe document_links).
function runMatch(matchQuery: string, limit: number): FtsRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT search_fts.doc_id, search_fts.url, search_fts.domain, search_fts.title,
              snippet(search_fts, 4, '<b>', '</b>', '…', 10) as snip,
              search_fts.source_type, search_fts.credibility, search_fts.local_relevant,
              bm25(search_fts, 0, 0, 0, 10.0, 1.0, 0, 0, 0) as rank,
              cd.crawled_at as crawled_at,
              (SELECT COUNT(*) FROM document_links dl
               WHERE dl.target_url = search_fts.url) as inlinks
       FROM search_fts
       LEFT JOIN crawl_documents cd ON cd.id = search_fts.doc_id
       WHERE search_fts MATCH ? ORDER BY rank LIMIT ?`,
    )
    .all(matchQuery, limit) as FtsRow[];
}

export function searchIndex(query: string, limit = 40): FtsHit[] {
  // Sync Turso = blocking network per statement — callers must use the async path.
  if (!canUseSyncDb()) return [];
  const q = query.trim();
  if (!q) return [];

  const { and, or } = ftsMatchQueries(q);
  if (!and) return [];

  try {
    let rows = runMatch(and, limit);
    const fullIds = new Set(rows.map((r) => r.doc_id));
    // Faute de frappe : l'AND échoue → la requête corrigée (vocabulaire de
    // l'index) a priorité sur le OR — sa précision est bien meilleure.
    if (rows.length < 3) {
      const corrected = correctSpelling(q);
      if (corrected) {
        const seenIds = new Set(rows.map((r) => r.doc_id));
        const { and: corrAnd } = ftsMatchQueries(corrected);
        const corr = runMatch(corrAnd, limit).filter((r) => !seenIds.has(r.doc_id));
        for (const r of corr) fullIds.add(r.doc_id);
        rows = [...rows, ...corr];
      }
    }
    // Rappel : requête longue ou mot rare → l'AND strict peut être vide.
    // Le OR préfixé élargit, le tri bm25 natif garde les bons docs en tête.
    if (rows.length < Math.min(6, limit) && or !== and) {
      const seenIds = new Set(rows.map((r) => r.doc_id));
      const extra = runMatch(or, limit).filter((r) => !seenIds.has(r.doc_id));
      rows = [...rows, ...extra].slice(0, limit);
    }

    return rows.map((r) => ({
      docId: r.doc_id,
      url: r.url,
      domain: r.domain,
      title: r.title,
      snippet: r.snip?.replace(/<\/?b>/g, "") || "",
      sourceType: r.source_type,
      credibility: r.credibility,
      localRelevant: Boolean(r.local_relevant),
      rank: r.rank,
      crawledAt: r.crawled_at ?? undefined,
      inlinks: r.inlinks ?? 0,
      fullMatch: fullIds.has(r.doc_id),
    }));
  } catch {
    return [];
  }
}

export function indexStats() {
  if (!canUseSyncDb()) {
    return {
      documents: 0,
      queuePending: 0,
      queueDone: 0,
      images: 0,
      videos: 0,
      products: 0,
      projectedIndexTotal: 50_000,
      projectedBillionsScale: 50_000,
    };
  }
  const db = getDb();
  const docs = db.prepare("SELECT COUNT(*) as c FROM crawl_documents").get() as { c: number };
  const queue = db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status='pending'").get() as {
    c: number;
  };
  const images = db.prepare("SELECT COUNT(*) as c FROM vertical_images").get() as { c: number };
  const videos = db.prepare("SELECT COUNT(*) as c FROM vertical_videos").get() as { c: number };
  const products = db.prepare("SELECT COUNT(*) as c FROM products_index").get() as { c: number };
  const done = db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status='done'").get() as { c: number };

  // Projection : chaque page découverte génère ~40 nouvelles URLs en moyenne sur 6 niveaux
  const discoveryMultiplier = 42;
  const depthLevels = 6;
  const projectedFromQueue = queue.c * discoveryMultiplier ** 2;
  const projectedTotal = Math.max(
    docs.c,
    docs.c + queue.c * discoveryMultiplier,
    done.c * discoveryMultiplier * depthLevels,
    projectedFromQueue,
  );

  return {
    documents: docs.c,
    queuePending: queue.c,
    queueDone: done.c,
    images: images.c,
    videos: videos.c,
    products: products.c,
    projectedIndexTotal: projectedTotal,
    projectedBillionsScale: projectedTotal > 1_000_000 ? projectedTotal : projectedTotal * 1250,
  };
}

export type SignalContext = { device?: string; country?: string };

export function recordClick(query: string, url: string, domain: string, ctx?: SignalContext) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO click_signals (query, url, domain, clicked_at, device, country) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(query, url, domain, now, ctx?.device || "", ctx?.country || "");
  bumpRadarDaily({ day: now.slice(0, 10), domain, query, url, clicks: 1, impressions: 0, position: null });
}

export function recordImpressions(
  query: string,
  items: Array<{ url: string; domain: string; position: number }>,
  ctx?: SignalContext,
) {
  if (!query || !items.length) return;
  const db = getDb();
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  const ins = db.prepare(
    "INSERT INTO impression_signals (query, url, domain, position, shown_at, device, country) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  for (const item of items.slice(0, 30)) {
    if (!item.url || !item.domain) continue;
    try {
      ins.run(query, item.url, item.domain, item.position, now, ctx?.device || "", ctx?.country || "");
      bumpRadarDaily({
        day,
        domain: item.domain,
        query,
        url: item.url,
        clicks: 0,
        impressions: 1,
        position: item.position,
      });
    } catch {
      /* ignore single-row failures (memory db / missing table during hot reload) */
    }
  }
}

function bumpRadarDaily(input: {
  day: string;
  domain: string;
  query: string;
  url: string;
  clicks: number;
  impressions: number;
  position: number | null;
}) {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO radar_daily (day, domain, query, url, impressions, clicks, position_sum, position_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(day, domain, query, url) DO UPDATE SET
         impressions = impressions + excluded.impressions,
         clicks = clicks + excluded.clicks,
         position_sum = position_sum + excluded.position_sum,
         position_count = position_count + excluded.position_count`,
    ).run(
      input.day,
      input.domain,
      input.query,
      input.url,
      input.impressions,
      input.clicks,
      input.position ?? 0,
      input.position != null ? 1 : 0,
    );
  } catch {
    /* table may not exist yet on old process */
  }
}

/**
 * Journal de santé recherche : chaque requête laisse une trace (hors mode
 * privé) — zéro-résultat, latence, mode dégradé. C'est la boucle de
 * feedback qui rend la qualité pilotable en production.
 */
export function recordSearchEvent(
  query: string,
  info: {
    resultsCount: number;
    degraded?: boolean;
    latencyMs?: number;
    device?: string;
    country?: string;
  },
) {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO search_events (query, results_count, degraded, latency_ms, device, country, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      query,
      info.resultsCount,
      info.degraded ? 1 : 0,
      info.latencyMs ?? 0,
      info.device || "",
      info.country || "",
      new Date().toISOString(),
    );
  } catch {
    /* télémétrie best-effort */
  }
}

/**
 * Agrégats de qualité sur une fenêtre donnée — le tableau de bord minimal
 * du moteur : taux de zéro-résultat, latence moyenne, mode dégradé.
 */
export function searchQualityStats(days = 7) {
  if (!canUseSyncDb()) {
    return { days, queries: 0, zeroResultRate: 0, avgLatencyMs: 0, degradedRate: 0, topZeroResultQueries: [] as string[] };
  }
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n,
              SUM(CASE WHEN results_count = 0 THEN 1 ELSE 0 END) AS zeros,
              SUM(CASE WHEN degraded = 1 THEN 1 ELSE 0 END) AS degraded,
              AVG(latency_ms) AS avg_lat
       FROM search_events
       WHERE created_at > datetime('now', ?)`,
    )
    .get(`-${days} days`) as { n: number; zeros: number | null; degraded: number | null; avg_lat: number | null };
  const topZero = db
    .prepare(
      `SELECT query, COUNT(*) AS c FROM search_events
       WHERE results_count = 0 AND created_at > datetime('now', ?)
       GROUP BY query ORDER BY c DESC LIMIT 10`,
    )
    .all(`-${days} days`) as { query: string }[];
  return {
    days,
    queries: row.n,
    zeroResultRate: row.n ? (row.zeros ?? 0) / row.n : 0,
    avgLatencyMs: Math.round(row.avg_lat ?? 0),
    degradedRate: row.n ? (row.degraded ?? 0) / row.n : 0,
    topZeroResultQueries: topZero.map((r) => r.query),
  };
}

export function clickBoost(query: string, url: string): number {
  if (!canUseSyncDb()) return 0;
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) as c FROM click_signals WHERE query = ? AND url = ? AND clicked_at > datetime('now', '-30 days')`,
    )
    .get(query, url) as { c: number };
  return Math.min(row.c * 3, 25);
}
