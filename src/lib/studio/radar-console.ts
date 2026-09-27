/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Radar — couche données Search Console.
 * Toutes les métriques proviennent des signaux réels de recherche Ayeba
 * (radar_daily, impression_signals, click_signals) et du crawl réel
 * (crawl_documents, crawl_queue, document_links).
 */
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/storage/database";
import { enqueueUrl } from "@/lib/crawler/global-crawler";
import type { RadarInspectResult, StudioSite } from "./types";

/** Champs live persistés (sous-ensemble de RadarLiveResult). */
type LivePersist = {
  status: number;
  indexable: boolean;
  noindex: boolean;
  latencyMs: number;
  fetchedAt: string;
  canonical: string | null;
  metaDescription: string | null;
  error?: string;
};

const n = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const sinceDays = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

/* ---------------- Performance ---------------- */

export function radarPerformanceSeries(domain: string, days = 28) {
  const rows = getDb()
    .prepare(
      `SELECT day,
              SUM(impressions) as impressions,
              SUM(clicks) as clicks,
              SUM(position_sum) as pos_sum,
              SUM(position_count) as pos_count
       FROM radar_daily
       WHERE domain = ? AND day >= ?
       GROUP BY day ORDER BY day`,
    )
    .all(domain, sinceDays(days).slice(0, 10)) as any[];
  return rows.map((r) => ({
    day: r.day,
    impressions: n(r.impressions),
    clicks: n(r.clicks),
    ctr: n(r.impressions) > 0 ? Math.round((n(r.clicks) / n(r.impressions)) * 1000) / 10 : 0,
    position: n(r.pos_count) > 0 ? Math.round((n(r.pos_sum) / n(r.pos_count)) * 10) / 10 : null,
  }));
}

export function radarPerformanceTotals(domain: string, days = 28) {
  const r = getDb()
    .prepare(
      `SELECT SUM(impressions) as impressions, SUM(clicks) as clicks,
              SUM(position_sum) as pos_sum, SUM(position_count) as pos_count
       FROM radar_daily WHERE domain = ? AND day >= ?`,
    )
    .get(domain, sinceDays(days).slice(0, 10)) as any;
  const impressions = n(r?.impressions);
  const clicks = n(r?.clicks);
  return {
    impressions,
    clicks,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
    position: n(r?.pos_count) > 0 ? Math.round((n(r?.pos_sum) / n(r?.pos_count)) * 10) / 10 : null,
  };
}

/**
 * Comparaison type GSC : période actuelle vs période précédente de même durée.
 * deltas en valeur absolue + % (null si base à 0).
 */
export function radarPerformanceCompare(domain: string, days = 28) {
  const current = radarPerformanceTotals(domain, days);
  const db = getDb();
  const endPrev = sinceDays(days).slice(0, 10);
  const startPrev = sinceDays(days * 2).slice(0, 10);
  const r = db
    .prepare(
      `SELECT SUM(impressions) as impressions, SUM(clicks) as clicks,
              SUM(position_sum) as pos_sum, SUM(position_count) as pos_count
       FROM radar_daily WHERE domain = ? AND day >= ? AND day < ?`,
    )
    .get(domain, startPrev, endPrev) as any;
  const impressions = n(r?.impressions);
  const clicks = n(r?.clicks);
  const previous = {
    impressions,
    clicks,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
    position: n(r?.pos_count) > 0 ? Math.round((n(r?.pos_sum) / n(r?.pos_count)) * 10) / 10 : null,
  };
  const pct = (cur: number, prev: number) =>
    prev === 0 ? (cur > 0 ? 100 : null) : Math.round(((cur - prev) / prev) * 1000) / 10;
  return {
    days,
    current,
    previous,
    delta: {
      clicks: current.clicks - previous.clicks,
      clicksPct: pct(current.clicks, previous.clicks),
      impressions: current.impressions - previous.impressions,
      impressionsPct: pct(current.impressions, previous.impressions),
      ctr: Math.round((current.ctr - previous.ctr) * 10) / 10,
      position:
        current.position != null && previous.position != null
          ? Math.round((current.position - previous.position) * 10) / 10
          : null,
    },
  };
}

export type RadarPerfFilters = { query?: string; url?: string };

/** Export CSV Search Analytics (requêtes, pages ou croisement page×requête). */
export function radarPerformanceCsv(
  domain: string,
  dim: RadarDimension,
  days = 28,
  filters?: RadarPerfFilters,
): string {
  if (dim === "page_query") {
    const rows = radarPageQueryCross(domain, days, 500, filters);
    const header = "query,page,clicks,impressions,ctr,position";
    const lines = rows.map(
      (r) =>
        `"${String(r.query).replace(/"/g, '""')}","${String(r.url).replace(/"/g, '""')}",${r.clicks},${r.impressions},${r.ctr},${r.position ?? ""}`,
    );
    return [header, ...lines].join("\n");
  }
  const rows = radarBreakdown(domain, dim, days, 500, filters);
  const header = "label,clicks,impressions,ctr,position";
  const lines = rows.map(
    (r) =>
      `"${String(r.label).replace(/"/g, '""')}",${r.clicks},${r.impressions},${r.ctr},${r.position ?? ""}`,
  );
  return [header, ...lines].join("\n");
}

export type RadarDimension = "query" | "url" | "country" | "device" | "page_query";

function mapAggRow(r: any) {
  return {
    label: r.label as string,
    impressions: n(r.impressions),
    clicks: n(r.clicks),
    ctr: n(r.impressions) > 0 ? Math.round((n(r.clicks) / n(r.impressions)) * 1000) / 10 : 0,
    position: n(r.pos_count) > 0 ? Math.round((n(r.pos_sum) / n(r.pos_count)) * 10) / 10 : null,
  };
}

/**
 * Croisement page × requête (radar_daily a query+url dans la PK).
 * Filtres optionnels pour zoomer sur une requête ou une page.
 */
export function radarPageQueryCross(
  domain: string,
  days = 28,
  limit = 50,
  filters?: RadarPerfFilters,
) {
  const db = getDb();
  const since = sinceDays(days).slice(0, 10);
  const clauses = ["domain = ?", "day >= ?", "query != ''", "url != ''"];
  const params: unknown[] = [domain, since];
  if (filters?.query?.trim()) {
    clauses.push("query LIKE ?");
    params.push(`%${filters.query.trim()}%`);
  }
  if (filters?.url?.trim()) {
    clauses.push("url LIKE ?");
    params.push(`%${filters.url.trim()}%`);
  }
  params.push(limit);
  return (db
    .prepare(
      `SELECT query, url,
              SUM(impressions) as impressions,
              SUM(clicks) as clicks,
              SUM(position_sum) as pos_sum,
              SUM(position_count) as pos_count
       FROM radar_daily
       WHERE ${clauses.join(" AND ")}
       GROUP BY query, url
       ORDER BY clicks DESC, impressions DESC
       LIMIT ?`,
    )
    .all(...params) as any[]).map((r: any) => ({
      query: r.query as string,
      url: r.url as string,
      impressions: n(r.impressions),
      clicks: n(r.clicks),
      ctr: n(r.impressions) > 0 ? Math.round((n(r.clicks) / n(r.impressions)) * 1000) / 10 : 0,
      position: n(r.pos_count) > 0 ? Math.round((n(r.pos_sum) / n(r.pos_count)) * 10) / 10 : null,
    }));
}

export function radarBreakdown(
  domain: string,
  dim: RadarDimension,
  days = 28,
  limit = 50,
  filters?: RadarPerfFilters,
) {
  const db = getDb();
  const since = sinceDays(days);

  if (dim === "page_query") {
    return radarPageQueryCross(domain, days, limit, filters).map((r) => ({
      label: `${r.query} · ${r.url}`,
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.ctr,
      position: r.position,
      query: r.query,
      url: r.url,
    }));
  }

  if (dim === "query" || dim === "url") {
    const col = dim === "query" ? "query" : "url";
    const clauses = [`domain = ?`, `day >= ?`, `${col} != ''`];
    const params: unknown[] = [domain, since.slice(0, 10)];
    // Filtre croisé : restreindre l'autre dimension si fournie
    if (dim === "query" && filters?.url?.trim()) {
      clauses.push("url LIKE ?");
      params.push(`%${filters.url.trim()}%`);
    }
    if (dim === "url" && filters?.query?.trim()) {
      clauses.push("query LIKE ?");
      params.push(`%${filters.query.trim()}%`);
    }
    if (dim === "query" && filters?.query?.trim()) {
      clauses.push("query LIKE ?");
      params.push(`%${filters.query.trim()}%`);
    }
    if (dim === "url" && filters?.url?.trim()) {
      clauses.push("url LIKE ?");
      params.push(`%${filters.url.trim()}%`);
    }
    params.push(limit);
    return (db
      .prepare(
        `SELECT ${col} as label,
                SUM(impressions) as impressions,
                SUM(clicks) as clicks,
                SUM(position_sum) as pos_sum,
                SUM(position_count) as pos_count
         FROM radar_daily
         WHERE ${clauses.join(" AND ")}
         GROUP BY ${col}
         ORDER BY clicks DESC, impressions DESC
         LIMIT ?`,
      )
      .all(...params) as any[]).map(mapAggRow);
  }

  // country / device come from raw signals (recorded at search time)
  const col = dim;
  const imps = db
    .prepare(
      `SELECT ${col} as label, COUNT(*) as c
       FROM impression_signals
       WHERE domain = ? AND shown_at >= ?
       GROUP BY ${col}`,
    )
    .all(domain, since) as any[];
  const clks = db
    .prepare(
      `SELECT ${col} as label, COUNT(*) as c
       FROM click_signals
       WHERE domain = ? AND clicked_at >= ?
       GROUP BY ${col}`,
    )
    .all(domain, since) as any[];
  const pos = db
    .prepare(
      `SELECT ${col} as label, AVG(position) as p
       FROM impression_signals
       WHERE domain = ? AND shown_at >= ? AND position > 0
       GROUP BY ${col}`,
    )
    .all(domain, since) as any[];

  const map = new Map<string, { impressions: number; clicks: number; posSum: number; posCount: number }>();
  for (const r of imps) {
    map.set(r.label || "(inconnu)", { impressions: n(r.c), clicks: 0, posSum: 0, posCount: 0 });
  }
  for (const r of clks) {
    const k = r.label || "(inconnu)";
    const e = map.get(k) || { impressions: 0, clicks: 0, posSum: 0, posCount: 0 };
    e.clicks = n(r.c);
    map.set(k, e);
  }
  for (const r of pos) {
    const k = r.label || "(inconnu)";
    const e = map.get(k);
    if (e && r.p != null) { e.posSum = n(r.p); e.posCount = 1; }
  }
  return [...map.entries()]
    .map(([label, v]) => ({
      label,
      impressions: v.impressions,
      clicks: v.clicks,
      ctr: v.impressions > 0 ? Math.round((v.clicks / v.impressions) * 1000) / 10 : 0,
      position: v.posCount ? Math.round(v.posSum * 10) / 10 : null,
    }))
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, limit);
}

/* ---------------- Couverture / Index ---------------- */

export function radarCoverage(site: StudioSite) {
  const db = getDb();
  const like = `%.${site.domain}`;

  const indexed = db
    .prepare(
      `SELECT url, title, crawled_at, link_count, credibility
       FROM crawl_documents
       WHERE domain = ? OR domain LIKE ?
       ORDER BY crawled_at DESC LIMIT 200`,
    )
    .all(site.domain, like) as any[];

  const pending = db
    .prepare(
      `SELECT url, priority, scheduled_at FROM crawl_queue
       WHERE status IN ('pending','processing') AND (url LIKE ? OR url LIKE ?)
       ORDER BY priority DESC LIMIT 100`,
    )
    .all(`%://${site.domain}%`, `%.${site.domain}%`) as any[];

  const failed = db
    .prepare(
      `SELECT url, attempts, last_error, scheduled_at FROM crawl_queue
       WHERE status = 'failed' AND (url LIKE ? OR url LIKE ?)
       ORDER BY scheduled_at DESC LIMIT 100`,
    )
    .all(`%://${site.domain}%`, `%.${site.domain}%`) as any[];

  const submitted = db
    .prepare(
      `SELECT u.url, u.source, u.submitted_at,
              CASE WHEN d.url IS NULL THEN 0 ELSE 1 END as indexed
       FROM studio_site_urls u
       LEFT JOIN crawl_documents d ON d.url = u.url
       WHERE u.site_id = ?
       ORDER BY u.submitted_at DESC LIMIT 200`,
    )
    .all(site.id) as any[];

  const indexedSet = new Set(indexed.map((p) => p.url));
  const discoveredNotIndexed = submitted.filter((s) => !n(s.indexed)).length;

  return {
    totals: {
      indexed: indexed.length,
      pending: pending.length,
      failed: failed.length,
      submitted: submitted.length,
      discoveredNotIndexed,
    },
    pages: indexed.map((p) => ({
      url: p.url,
      title: p.title,
      crawledAt: p.crawled_at,
      linkCount: n(p.link_count),
      credibility: Math.round(n(p.credibility) * 100),
    })),
    pending: pending.map((p) => ({ url: p.url, priority: n(p.priority), scheduledAt: p.scheduled_at })),
    failed: failed.map((f) => ({
      url: f.url, attempts: n(f.attempts), error: f.last_error || "", scheduledAt: f.scheduled_at,
    })),
    submitted: submitted.map((s) => ({
      url: s.url, source: s.source, submittedAt: s.submitted_at, indexed: n(s.indexed) === 1,
    })),
    indexRequests: radarIndexRequestHistory(site.id, 50),
    indexedSetSize: indexedSet.size,
  };
}

/**
 * Demande d'indexation type GSC — enqueueUrl réel + journal radar_index_requests.
 * URLs hors domaine rejetées. Max 100 par appel.
 */
export function radarRequestIndexing(
  site: StudioSite,
  urls: string[],
  reason = "request_indexing",
): { queued: number; rejected: string[]; requests: Array<{ url: string; status: string }> } {
  if (site.status !== "verified") {
    throw Object.assign(new Error("Vérifiez d’abord la propriété du site"), { status: 403 });
  }
  const db = getDb();
  const now = new Date().toISOString();
  const rejected: string[] = [];
  const requests: Array<{ url: string; status: string }> = [];
  let queued = 0;
  const seen = new Set<string>();

  for (const raw of urls.slice(0, 100)) {
    let url = String(raw || "").trim();
    if (!url) continue;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
      const parsed = new URL(url);
      url = parsed.toString();
      if (seen.has(url)) continue;
      seen.add(url);
      const host = parsed.hostname.replace(/^www\./, "");
      if (host !== site.domain && !host.endsWith(`.${site.domain}`)) {
        rejected.push(url);
        requests.push({ url, status: "rejected_domain" });
        continue;
      }
      enqueueUrl(url, 95);
      const queue = db.prepare(`SELECT status, priority FROM crawl_queue WHERE url = ?`).get(url) as
        | { status: string; priority: number }
        | undefined;
      if (queue) {
        db.prepare(`UPDATE crawl_queue SET priority = ?, status = ? WHERE url = ?`).run(
          Math.max(queue.priority || 0, 95),
          queue.status === "failed" ? "pending" : queue.status,
          url,
        );
      }
      db.prepare(
        `INSERT INTO studio_site_urls (site_id, url, source, submitted_at)
         VALUES (?, ?, 'request_indexing', ?) ON CONFLICT(site_id, url) DO NOTHING`,
      ).run(site.id, url, now);
      db.prepare(
        `INSERT INTO radar_index_requests (id, site_id, url, status, reason, requested_at, queue_status)
         VALUES (?, ?, ?, 'queued', ?, ?, ?)`,
      ).run(randomUUID(), site.id, url, reason, now, queue?.status || "pending");
      queued++;
      requests.push({ url, status: "queued" });
    } catch {
      rejected.push(raw);
      requests.push({ url: raw, status: "invalid" });
    }
  }

  return { queued, rejected, requests };
}

export function radarIndexRequestHistory(siteId: string, limit = 50) {
  try {
    return (getDb()
      .prepare(
        `SELECT id, url, status, reason, requested_at, queue_status
         FROM radar_index_requests
         WHERE site_id = ?
         ORDER BY requested_at DESC LIMIT ?`,
      )
      .all(siteId, limit) as any[]).map((r) => ({
      id: r.id as string,
      url: r.url as string,
      status: r.status as string,
      reason: (r.reason as string) || "request_indexing",
      requestedAt: r.requested_at as string,
      createdAt: r.requested_at as string,
      queueStatus: (r.queue_status as string) || null,
    }));
  } catch {
    return [];
  }
}

/**
 * Alertes anomalies Search Analytics (chute > 30 % vs période précédente).
 */
export function radarAnomalyAlerts(domain: string, days = 28) {
  const cmp = radarPerformanceCompare(domain, days);
  const alerts: Array<{ id: string; severity: "info" | "warn" | "critical"; title: string; detail: string }> = [];
  if (cmp.delta.clicksPct != null && cmp.delta.clicksPct <= -30 && cmp.previous.clicks >= 5) {
    alerts.push({
      id: "clicks-drop",
      severity: "critical",
      title: "Chute des clics",
      detail: `${cmp.delta.clicksPct}% de clics vs les ${days} j précédents (${cmp.previous.clicks} → ${cmp.current.clicks}).`,
    });
  }
  if (
    cmp.delta.impressionsPct != null &&
    cmp.delta.impressionsPct <= -30 &&
    cmp.previous.impressions >= 20
  ) {
    alerts.push({
      id: "imps-drop",
      severity: "warn",
      title: "Chute des impressions",
      detail: `${cmp.delta.impressionsPct}% d'impressions vs période précédente (${cmp.previous.impressions} → ${cmp.current.impressions}).`,
    });
  }
  if (cmp.delta.position != null && cmp.delta.position >= 3 && cmp.previous.position != null) {
    alerts.push({
      id: "pos-drop",
      severity: "warn",
      title: "Position moyenne en baisse",
      detail: `Position ${cmp.previous.position} → ${cmp.current.position} (+${cmp.delta.position}).`,
    });
  }
  return { compare: cmp, alerts };
}

/* ---------------- Inspections (historique) ---------------- */

export function radarInspectionHistory(siteId: string, limit = 50) {
  try {
    const events = getDb()
      .prepare(
        `SELECT id, url, kind, indexed, title, crawled_at, in_queue, queue_status,
                live_status, live_indexable, live_noindex, live_latency_ms, live_error,
                clicks_30d, impressions_30d, created_at
         FROM radar_inspection_events
         WHERE site_id = ?
         ORDER BY created_at DESC LIMIT ?`,
      )
      .all(siteId, limit) as any[];
    if (events.length) {
      return events.map((e) => ({
        id: e.id,
        url: e.url,
        kind: e.kind,
        indexed: n(e.indexed),
        title: e.title,
        crawled_at: e.crawled_at,
        in_queue: n(e.in_queue),
        queue_status: e.queue_status,
        seo_score: null as number | null,
        word_count: 0,
        internal_links: 0,
        external_links: 0,
        last_updated: e.created_at,
        live_status: e.live_status,
        live_indexable: e.live_indexable,
        live_noindex: e.live_noindex,
        live_latency_ms: e.live_latency_ms,
        live_error: e.live_error,
        clicks_30d: n(e.clicks_30d),
        impressions_30d: n(e.impressions_30d),
      }));
    }
  } catch {
    /* table absente — repli snapshot */
  }

  return getDb()
    .prepare(
      `SELECT url, indexed, title, crawled_at, in_queue, queue_status,
              seo_score, word_count, internal_links, external_links, last_updated
       FROM radar_url_inspection
       WHERE site_id = ?
       ORDER BY last_updated DESC LIMIT ?`,
    )
    .all(siteId, limit) as any[];
}

/** Persiste inspection index + éventuel test live (snapshot + journal). */
export function persistRadarInspection(
  siteId: string,
  inspection: RadarInspectResult,
  live?: LivePersist | null,
) {
  const db = getDb();
  const now = new Date().toISOString();
  const kind = live ? "live" : "index";

  db.prepare(
    `INSERT INTO radar_url_inspection (
       id, site_id, url, indexed, title, snippet, domain, crawled_at,
       in_queue, queue_status, canonical_url, meta_description,
       internal_links, external_links, word_count, last_updated,
       live_status, live_indexable, live_noindex, live_latency_ms, live_fetched_at, last_kind
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(site_id, url) DO UPDATE SET
       indexed = excluded.indexed,
       title = excluded.title,
       snippet = excluded.snippet,
       domain = excluded.domain,
       crawled_at = excluded.crawled_at,
       in_queue = excluded.in_queue,
       queue_status = excluded.queue_status,
       canonical_url = COALESCE(excluded.canonical_url, radar_url_inspection.canonical_url),
       meta_description = COALESCE(excluded.meta_description, radar_url_inspection.meta_description),
       last_updated = excluded.last_updated,
       live_status = COALESCE(excluded.live_status, radar_url_inspection.live_status),
       live_indexable = COALESCE(excluded.live_indexable, radar_url_inspection.live_indexable),
       live_noindex = COALESCE(excluded.live_noindex, radar_url_inspection.live_noindex),
       live_latency_ms = COALESCE(excluded.live_latency_ms, radar_url_inspection.live_latency_ms),
       live_fetched_at = COALESCE(excluded.live_fetched_at, radar_url_inspection.live_fetched_at),
       last_kind = excluded.last_kind`,
  ).run(
    randomUUID(),
    siteId,
    inspection.url,
    inspection.indexed ? 1 : 0,
    inspection.title,
    inspection.snippet,
    inspection.domain,
    inspection.crawledAt,
    inspection.inQueue ? 1 : 0,
    inspection.queueStatus,
    live?.canonical ?? null,
    live?.metaDescription ?? null,
    now,
    live?.status ?? null,
    live ? (live.indexable ? 1 : 0) : null,
    live ? (live.noindex ? 1 : 0) : null,
    live?.latencyMs ?? null,
    live?.fetchedAt ?? null,
    kind,
  );

  db.prepare(
    `INSERT INTO radar_inspection_events (
       id, site_id, url, kind, indexed, title, crawled_at, in_queue, queue_status,
       live_status, live_indexable, live_noindex, live_latency_ms, live_error,
       clicks_30d, impressions_30d, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    siteId,
    inspection.url,
    kind,
    inspection.indexed ? 1 : 0,
    inspection.title,
    inspection.crawledAt,
    inspection.inQueue ? 1 : 0,
    inspection.queueStatus,
    live?.status ?? null,
    live ? (live.indexable ? 1 : 0) : null,
    live ? (live.noindex ? 1 : 0) : null,
    live?.latencyMs ?? null,
    live?.error ?? null,
    inspection.clicks30d,
    inspection.impressions30d,
    now,
  );
}

/* ---------------- Sitemaps ---------------- */

export function radarSitemaps(siteId: string) {
  return getDb()
    .prepare(
      `SELECT sitemap_url, status, discovered_count, last_error, submitted_at, last_read
       FROM radar_sitemaps WHERE site_id = ? ORDER BY submitted_at DESC`,
    )
    .all(siteId) as any[];
}

/** Soumet un sitemap : fetch réel du XML, comptage des URLs, file de crawl. */
export async function radarSubmitSitemap(site: StudioSite, sitemapUrl: string) {
  const target = sitemapUrl.trim();
  let host: string;
  try {
    host = new URL(target).hostname.replace(/^www\./, "");
  } catch {
    throw Object.assign(new Error("URL de sitemap invalide"), { status: 400 });
  }
  if (host !== site.domain && !host.endsWith(`.${site.domain}`)) {
    throw Object.assign(new Error("Sitemap hors de ce domaine"), { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  let status = "error";
  let discovered = 0;
  let lastError: string | null = null;

  try {
    const res = await fetch(target, {
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "AyebaStudioBot/1.0 (+https://ayeba.app/studio)" },
    });
    if (!res.ok) {
      lastError = `HTTP ${res.status}`;
    } else {
      const xml = await res.text();
      if (!/<urlset|<sitemapindex/i.test(xml)) {
        lastError = "Format XML de sitemap non reconnu";
      } else {
        const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) =>
          m[1].replace(/&amp;/g, "&"),
        );
        discovered = locs.length;
        let queued = 0;
        for (const u of locs.slice(0, 500)) {
          try {
            const h = new URL(u).hostname.replace(/^www\./, "");
            if (h === site.domain || h.endsWith(`.${site.domain}`)) {
              enqueueUrl(u, 60);
              db.prepare(
                `INSERT INTO studio_site_urls (site_id, url, source, submitted_at)
                 VALUES (?, ?, 'sitemap', ?) ON CONFLICT(site_id, url) DO NOTHING`,
              ).run(site.id, u, now);
              queued++;
            }
          } catch { /* url malformée */ }
        }
        status = "success";
        lastError = null;
      }
    }
  } catch (e) {
    lastError = e instanceof Error ? e.message.slice(0, 200) : "Lecture impossible";
  }

  db.prepare(
    `INSERT INTO radar_sitemaps (id, site_id, sitemap_url, status, discovered_count, last_error, submitted_at, last_read)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(site_id, sitemap_url) DO UPDATE SET
       status = excluded.status, discovered_count = excluded.discovered_count,
       last_error = excluded.last_error, last_read = excluded.last_read`,
  ).run(id, site.id, target, status, discovered, lastError, now, now);

  enqueueUrl(`https://${site.domain}/`, 90);
  return { sitemapUrl: target, status, discoveredCount: discovered, error: lastError };
}

/* ---------------- Liens ---------------- */

export function radarLinks(domain: string) {
  const db = getDb();
  const like = `%.${domain}`;

  // Liens internes : pages du site les plus citées par d'autres pages du site
  const topInternal = db
    .prepare(
      `SELECT target_url as url, COUNT(*) as count
       FROM document_links
       WHERE target_domain = ? AND source_domain = ?
       GROUP BY target_url ORDER BY count DESC LIMIT 50`,
    )
    .all(domain, domain) as any[];

  // Backlinks : domaines externes pointant vers le site
  const topExternal = db
    .prepare(
      `SELECT source_domain as domain, COUNT(*) as count,
              COUNT(DISTINCT target_url) as pages
       FROM document_links
       WHERE target_domain = ? AND source_domain != ? AND source_domain NOT LIKE ?
       GROUP BY source_domain ORDER BY count DESC LIMIT 50`,
    )
    .all(domain, domain, like) as any[];

  // Pages externes les plus liées par le site
  const topOutbound = db
    .prepare(
      `SELECT target_domain as domain, COUNT(*) as count
       FROM document_links
       WHERE source_domain = ? AND target_domain != ? AND target_domain NOT LIKE ?
       GROUP BY target_domain ORDER BY count DESC LIMIT 50`,
    )
    .all(domain, domain, like) as any[];

  const totals = db
    .prepare(
      `SELECT
         SUM(CASE WHEN target_domain = ? AND source_domain = ? THEN 1 ELSE 0 END) as internal,
         SUM(CASE WHEN target_domain = ? AND source_domain != ? THEN 1 ELSE 0 END) as inbound,
         SUM(CASE WHEN source_domain = ? AND target_domain != ? THEN 1 ELSE 0 END) as outbound
       FROM document_links
       WHERE source_domain = ? OR target_domain = ?`,
    )
    .get(domain, domain, domain, domain, domain, domain, domain, domain) as any;

  return {
    totals: {
      internal: n(totals?.internal),
      inbound: n(totals?.inbound),
      outbound: n(totals?.outbound),
    },
    topInternal: topInternal.map((r) => ({ url: r.url, count: n(r.count) })),
    topExternal: topExternal.map((r) => ({ domain: r.domain, count: n(r.count), pages: n(r.pages) })),
    topOutbound: topOutbound.map((r) => ({ domain: r.domain, count: n(r.count) })),
  };
}
