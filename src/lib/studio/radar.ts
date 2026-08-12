import { getDb } from "@/lib/storage/database";
import { enqueueUrl } from "@/lib/crawler/global-crawler";
import { parseSitemap } from "@/lib/crawler/sitemap";
import { countSubmittedUrls, recordSubmittedUrl } from "./sites";
import type {
  RadarAlert,
  RadarInspectResult,
  RadarOverview,
  RadarPageRow,
  RadarQueryRow,
  StudioSite,
} from "./types";

function daysAgoIso(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function domainClause(alias = "domain") {
  // match apex and subdomains: domain = ? OR domain LIKE '%.domain'
  return `(${alias} = ? OR ${alias} LIKE ?)`;
}

function domainParams(domain: string): [string, string] {
  return [domain, `%.${domain}`];
}

export function radarOverview(site: StudioSite): RadarOverview {
  const db = getDb();
  const [d, like] = domainParams(site.domain);
  const since7 = daysAgoIso(7);

  const indexed = db
    .prepare(`SELECT COUNT(*) as c FROM crawl_documents WHERE ${domainClause()}`)
    .get(d, like) as { c: number };

  const submitted = countSubmittedUrls(site.id);

  const clicks = db
    .prepare(
      `SELECT COUNT(*) as c FROM click_signals WHERE ${domainClause()} AND clicked_at >= ?`,
    )
    .get(d, like, since7) as { c: number };

  const imps = db
    .prepare(
      `SELECT COUNT(*) as c, AVG(position) as p FROM impression_signals WHERE ${domainClause()} AND shown_at >= ?`,
    )
    .get(d, like, since7) as { c: number; p: number | null };

  const queuePending = db
    .prepare(
      `SELECT COUNT(*) as c FROM crawl_queue WHERE status='pending' AND (url LIKE ? OR url LIKE ?)`,
    )
    .get(`%://${site.domain}/%`, `%://www.${site.domain}/%`) as { c: number };

  const queueFailed = db
    .prepare(
      `SELECT COUNT(*) as c FROM crawl_queue WHERE status='failed' AND (url LIKE ? OR url LIKE ?)`,
    )
    .get(`%://${site.domain}/%`, `%://www.${site.domain}/%`) as { c: number };

  const coveragePct =
    submitted > 0 ? Math.min(100, Math.round((indexed.c / submitted) * 1000) / 10) : indexed.c > 0 ? 100 : 0;

  const impressions7d = imps.c;
  const clicks7d = clicks.c;
  const ctr7d = impressions7d > 0 ? Math.round((clicks7d / impressions7d) * 1000) / 10 : 0;
  const avgPosition7d = imps.p != null ? Math.round(imps.p * 10) / 10 : null;

  const alerts = buildAlerts({
    site,
    indexed: indexed.c,
    submitted,
    clicks7d,
    impressions7d,
    queueFailed: queueFailed.c,
  });

  const nextAction = pickNextAction({
    site,
    indexed: indexed.c,
    submitted,
    clicks7d,
    verified: site.status === "verified",
  });

  return {
    domain: site.domain,
    indexedPages: indexed.c,
    submittedUrls: submitted,
    coveragePct,
    clicks7d,
    impressions7d,
    ctr7d,
    avgPosition7d,
    queuePending: queuePending.c,
    queueFailed: queueFailed.c,
    alerts,
    nextAction,
  };
}

function buildAlerts(input: {
  site: StudioSite;
  indexed: number;
  submitted: number;
  clicks7d: number;
  impressions7d: number;
  queueFailed: number;
}): RadarAlert[] {
  const alerts: RadarAlert[] = [];
  if (input.site.status !== "verified") {
    alerts.push({
      id: "verify",
      severity: "critical",
      title: "Propriété non vérifiée",
      detail: "Vérifiez le domaine pour débloquer les actions crawl prioritaires.",
    });
  }
  if (input.indexed === 0) {
    alerts.push({
      id: "no-index",
      severity: "warn",
      title: "Aucune page indexée",
      detail: "Soumettez un sitemap ou une URL pour démarrer le crawl Ayeba.",
    });
  }
  if (input.submitted > 0 && input.indexed < input.submitted * 0.3) {
    alerts.push({
      id: "coverage",
      severity: "warn",
      title: "Couverture faible",
      detail: `Seulement ${input.indexed} / ${input.submitted} URLs soumises sont indexées.`,
    });
  }
  if (input.impressions7d > 20 && input.clicks7d === 0) {
    alerts.push({
      id: "zero-ctr",
      severity: "info",
      title: "Impressions sans clic",
      detail: "Vos pages apparaissent dans Ayeba mais n’obtiennent pas de clics — revoyez titres et snippets.",
    });
  }
  if (input.queueFailed > 0) {
    alerts.push({
      id: "failed",
      severity: "warn",
      title: `${input.queueFailed} URL(s) en échec de crawl`,
      detail: "Vérifiez robots.txt, timeouts ou pages 4xx/5xx.",
    });
  }
  return alerts;
}

function pickNextAction(input: {
  site: StudioSite;
  indexed: number;
  submitted: number;
  clicks7d: number;
  verified: boolean;
}): RadarOverview["nextAction"] {
  if (!input.verified) {
    return {
      title: "Vérifier la propriété",
      detail: "Confirmez que vous contrôlez ce domaine pour activer Radar.",
    };
  }
  if (input.submitted === 0 && !input.site.sitemapUrl) {
    return {
      title: "Soumettre un sitemap",
      detail: "Donnez à Ayeba la carte de votre site pour indexer plus vite.",
    };
  }
  if (input.indexed === 0) {
    return {
      title: "Prioriser le crawl",
      detail: "Aucune page indexée — lancez l’indexation de la page d’accueil.",
    };
  }
  if (input.clicks7d === 0) {
    return {
      title: "Optimiser pour les clics",
      detail: "Surveillez les requêtes Radar et améliorez titres / extraits.",
    };
  }
  return {
    title: "Inspecter une URL clé",
    detail: "Vérifiez le statut d’indexation de vos pages stratégiques.",
  };
}

export function radarQueries(site: StudioSite, days = 28, limit = 50): RadarQueryRow[] {
  const db = getDb();
  const [d, like] = domainParams(site.domain);
  const since = daysAgoIso(days);

  const clickRows = db
    .prepare(
      `SELECT query, COUNT(*) as clicks FROM click_signals
       WHERE ${domainClause()} AND clicked_at >= ?
       GROUP BY query ORDER BY clicks DESC LIMIT ?`,
    )
    .all(d, like, since, limit) as { query: string; clicks: number }[];

  const impMap = new Map<string, { impressions: number; posSum: number }>();
  const impRows = db
    .prepare(
      `SELECT query, COUNT(*) as impressions, SUM(position) as pos_sum FROM impression_signals
       WHERE ${domainClause()} AND shown_at >= ?
       GROUP BY query`,
    )
    .all(d, like, since) as { query: string; impressions: number; pos_sum: number }[];

  for (const r of impRows) {
    impMap.set(r.query, { impressions: r.impressions, posSum: r.pos_sum });
  }

  const queries = new Set<string>([
    ...clickRows.map((r) => r.query),
    ...impRows.slice(0, limit).map((r) => r.query),
  ]);

  const clickMap = new Map(clickRows.map((r) => [r.query, r.clicks]));

  const rows: RadarQueryRow[] = [];
  for (const q of queries) {
    const clicks = clickMap.get(q) ?? 0;
    const imp = impMap.get(q);
    const impressions = imp?.impressions ?? 0;
    const avgPosition =
      imp && imp.impressions > 0 ? Math.round((imp.posSum / imp.impressions) * 10) / 10 : null;
    rows.push({
      query: q,
      clicks,
      impressions,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
      avgPosition,
    });
  }

  return rows.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, limit);
}

export function radarPages(site: StudioSite, days = 28, limit = 50): RadarPageRow[] {
  const db = getDb();
  const [d, like] = domainParams(site.domain);
  const since = daysAgoIso(days);

  const docs = db
    .prepare(
      `SELECT url, title, crawled_at FROM crawl_documents WHERE ${domainClause()} ORDER BY crawled_at DESC LIMIT 200`,
    )
    .all(d, like) as { url: string; title: string; crawled_at: string }[];

  const clickRows = db
    .prepare(
      `SELECT url, COUNT(*) as clicks FROM click_signals
       WHERE ${domainClause()} AND clicked_at >= ?
       GROUP BY url`,
    )
    .all(d, like, since) as { url: string; clicks: number }[];

  const impRows = db
    .prepare(
      `SELECT url, COUNT(*) as impressions FROM impression_signals
       WHERE ${domainClause()} AND shown_at >= ?
       GROUP BY url`,
    )
    .all(d, like, since) as { url: string; impressions: number }[];

  const clickMap = new Map(clickRows.map((r) => [r.url, r.clicks]));
  const impMap = new Map(impRows.map((r) => [r.url, r.impressions]));
  const docMap = new Map(docs.map((r) => [r.url, r]));

  const urls = new Set<string>([
    ...docs.map((d) => d.url),
    ...clickRows.map((c) => c.url),
    ...impRows.map((i) => i.url),
  ]);

  const rows: RadarPageRow[] = [];
  for (const url of urls) {
    const doc = docMap.get(url);
    const clicks = clickMap.get(url) ?? 0;
    const impressions = impMap.get(url) ?? 0;
    rows.push({
      url,
      title: doc?.title || url,
      clicks,
      impressions,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
      indexed: Boolean(doc),
      crawledAt: doc?.crawled_at ?? null,
    });
  }

  return rows.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, limit);
}

export function inspectUrl(site: StudioSite, rawUrl: string): RadarInspectResult {
  let url: string;
  try {
    const u = new URL(rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`);
    url = u.toString();
  } catch {
    throw Object.assign(new Error("URL invalide"), { status: 400 });
  }

  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host !== site.domain && !host.endsWith(`.${site.domain}`)) {
    throw Object.assign(new Error("URL hors de ce domaine"), { status: 400 });
  }

  const db = getDb();
  const doc = db
    .prepare(
      `SELECT url, title, snippet, domain, crawled_at FROM crawl_documents WHERE url = ? OR canonical_url = ?`,
    )
    .get(url, url) as
    | { url: string; title: string; snippet: string; domain: string; crawled_at: string }
    | undefined;

  const queue = db
    .prepare(`SELECT status FROM crawl_queue WHERE url = ?`)
    .get(url) as { status: string } | undefined;

  const since = daysAgoIso(30);
  const clicks = db
    .prepare(`SELECT COUNT(*) as c FROM click_signals WHERE url = ? AND clicked_at >= ?`)
    .get(url, since) as { c: number };
  const imps = db
    .prepare(`SELECT COUNT(*) as c FROM impression_signals WHERE url = ? AND shown_at >= ?`)
    .get(url, since) as { c: number };

  return {
    url,
    indexed: Boolean(doc),
    title: doc?.title ?? null,
    snippet: doc?.snippet ?? null,
    domain: doc?.domain ?? host,
    crawledAt: doc?.crawled_at ?? null,
    inQueue: Boolean(queue),
    queueStatus: queue?.status ?? null,
    clicks30d: clicks.c,
    impressions30d: imps.c,
  };
}

export function submitUrlForCrawl(site: StudioSite, rawUrl: string, priority = 80) {
  if (site.status !== "verified") {
    throw Object.assign(new Error("Vérifiez d’abord la propriété du site"), { status: 403 });
  }
  let url: string;
  try {
    url = new URL(rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`).toString();
  } catch {
    throw Object.assign(new Error("URL invalide"), { status: 400 });
  }
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host !== site.domain && !host.endsWith(`.${site.domain}`)) {
    throw Object.assign(new Error("URL hors de ce domaine"), { status: 400 });
  }

  enqueueUrl(url, priority);
  const db = getDb();
  const row = db.prepare(`SELECT priority, status FROM crawl_queue WHERE url = ?`).get(url) as
    | { priority: number; status: string }
    | undefined;
  if (row) {
    const nextPriority = Math.max(row.priority || 0, priority);
    const nextStatus = row.status === "failed" ? "pending" : row.status;
    db.prepare(`UPDATE crawl_queue SET priority = ?, status = ? WHERE url = ?`).run(
      nextPriority,
      nextStatus,
      url,
    );
  }

  recordSubmittedUrl(site.id, url, "manual");
  return { ok: true, url };
}

export async function submitSitemap(site: StudioSite, sitemapUrl?: string) {
  if (site.status !== "verified") {
    throw Object.assign(new Error("Vérifiez d’abord la propriété du site"), { status: 403 });
  }
  const target =
    (sitemapUrl || site.sitemapUrl || `https://${site.domain}/sitemap.xml`).trim();
  let host: string;
  try {
    host = new URL(target).hostname.replace(/^www\./, "");
  } catch {
    throw Object.assign(new Error("URL de sitemap invalide"), { status: 400 });
  }
  if (host !== site.domain && !host.endsWith(`.${site.domain}`)) {
    throw Object.assign(new Error("Sitemap hors de ce domaine"), { status: 400 });
  }

  const count = await parseSitemap(target, 400);
  recordSubmittedUrl(site.id, target, "sitemap");

  // Track submitted URLs for coverage (best-effort parse of loc tags)
  try {
    const res = await fetch(target, {
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "AyebaStudioBot/1.0 (+https://ayeba.app/studio)" },
    });
    if (res.ok) {
      const xml = await res.text();
      const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)];
      for (const m of locs.slice(0, 400)) {
        const u = m[1].trim().replace(/&amp;/g, "&");
        try {
          const h = new URL(u).hostname.replace(/^www\./, "");
          if (h === site.domain || h.endsWith(`.${site.domain}`)) {
            recordSubmittedUrl(site.id, u, "sitemap");
          }
        } catch {
          /* skip */
        }
      }
    }
  } catch {
    /* coverage tracking best-effort */
  }

  enqueueUrl(`https://${site.domain}/`, 90);
  enqueueUrl(target, 85);

  return { ok: true, sitemapUrl: target, urlsEnqueued: count };
}
