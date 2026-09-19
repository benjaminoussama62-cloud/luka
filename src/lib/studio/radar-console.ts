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
import type { StudioSite } from "./types";

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

export type RadarDimension = "query" | "url" | "country" | "device";

export function radarBreakdown(domain: string, dim: RadarDimension, days = 28, limit = 50) {
  const db = getDb();
  const since = sinceDays(days);

  if (dim === "query" || dim === "url") {
    const col = dim === "query" ? "query" : "url";
    return (db
      .prepare(
        `SELECT ${col} as label,
                SUM(impressions) as impressions,
                SUM(clicks) as clicks,
                SUM(position_sum) as pos_sum,
                SUM(position_count) as pos_count
         FROM radar_daily
         WHERE domain = ? AND day >= ? AND ${col} != ''
         GROUP BY ${col}
         ORDER BY clicks DESC, impressions DESC
         LIMIT ?`,
      )
      .all(domain, since.slice(0, 10), limit) as any[]).map((r: any) => ({
        label: r.label,
        impressions: n(r.impressions),
        clicks: n(r.clicks),
        ctr: n(r.impressions) > 0 ? Math.round((n(r.clicks) / n(r.impressions)) * 1000) / 10 : 0,
        position: n(r.pos_count) > 0 ? Math.round((n(r.pos_sum) / n(r.pos_count)) * 10) / 10 : null,
      }));
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
    indexedSetSize: indexedSet.size,
  };
}

/* ---------------- Inspections (historique) ---------------- */

export function radarInspectionHistory(siteId: string, limit = 50) {
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
