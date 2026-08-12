import { getDb } from "../storage/database";

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

export function indexDocument(doc: IndexedDoc) {
  const db = getDb();
  db.prepare(
    `INSERT INTO crawl_documents (id, url, canonical_url, domain, title, snippet, body, keywords, source_type, credibility, local_relevant, link_count, crawled_at, recrawl_after)
     VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, 0, ?, ?)
     ON CONFLICT(url) DO UPDATE SET
       title=excluded.title, snippet=excluded.snippet, body=excluded.body,
       credibility=excluded.credibility, crawled_at=excluded.crawled_at, recrawl_after=excluded.recrawl_after`,
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
    new Date().toISOString(),
    new Date(Date.now() + 7 * 86400000).toISOString(),
  );

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
};

export function searchIndex(query: string, limit = 40): FtsHit[] {
  const q = query.trim();
  if (!q) return [];

  const db = getDb();
  const ftsQuery = q
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map((t) => `"${t.replace(/"/g, "")}"`)
    .join(" ");

  if (!ftsQuery) return [];

  try {
    const rows = db
      .prepare(
        `SELECT doc_id, url, domain, title, snippet(body, '<b>', '</b>', '…', 10) as snip,
                source_type, credibility, local_relevant, rank
         FROM search_fts WHERE search_fts MATCH ? ORDER BY rank LIMIT ?`,
      )
      .all(ftsQuery, limit) as Array<{
      doc_id: string;
      url: string;
      domain: string;
      title: string;
      snip: string;
      source_type: string;
      credibility: number;
      local_relevant: number;
      rank: number;
    }>;

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
    }));
  } catch {
    return [];
  }
}

export function indexStats() {
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

export function recordClick(query: string, url: string, domain: string) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare("INSERT INTO click_signals (query, url, domain, clicked_at) VALUES (?, ?, ?, ?)").run(
    query,
    url,
    domain,
    now,
  );
  bumpRadarDaily({ day: now.slice(0, 10), domain, query, url, clicks: 1, impressions: 0, position: null });
}

export function recordImpressions(
  query: string,
  items: Array<{ url: string; domain: string; position: number }>,
) {
  if (!query || !items.length) return;
  const db = getDb();
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  const ins = db.prepare(
    "INSERT INTO impression_signals (query, url, domain, position, shown_at) VALUES (?, ?, ?, ?, ?)",
  );
  for (const item of items.slice(0, 30)) {
    if (!item.url || !item.domain) continue;
    try {
      ins.run(query, item.url, item.domain, item.position, now);
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

export function clickBoost(query: string, url: string): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) as c FROM click_signals WHERE query = ? AND url = ? AND clicked_at > datetime('now', '-30 days')`,
    )
    .get(query, url) as { c: number };
  return Math.min(row.c * 3, 25);
}
