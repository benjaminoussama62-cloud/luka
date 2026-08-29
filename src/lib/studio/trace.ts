import { getDb } from "@/lib/storage/database";
import { daysAgoIso, domainClause, domainParams } from "./domain";
import { ensureSiteModules } from "./modules";
import type { StudioSite, TraceOverview, TracePageRow, TraceReferrerRow } from "./types";

export function recordTraceEvent(input: {
  siteId: string;
  path: string;
  referrer?: string;
  sessionId?: string;
}) {
  const path = normalizePath(input.path);
  getDb()
    .prepare(
      `INSERT INTO trace_events (site_id, path, referrer, session_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      input.siteId,
      path,
      (input.referrer || "").slice(0, 500),
      (input.sessionId || "").slice(0, 64),
      new Date().toISOString(),
    );
}

function normalizePath(path: string) {
  const p = path.trim() || "/";
  if (p.startsWith("/")) return p.slice(0, 500);
  try {
    return new URL(p).pathname.slice(0, 500) || "/";
  } catch {
    return `/${p}`.slice(0, 500);
  }
}

export function traceOverview(site: StudioSite): TraceOverview {
  const mods = ensureSiteModules(site.id);
  const since7 = daysAgoIso(7);
  const db = getDb();

  const pv = db
    .prepare(`SELECT COUNT(*) as c FROM trace_events WHERE site_id = ? AND created_at >= ?`)
    .get(site.id, since7) as { c: number };

  const sessions = db
    .prepare(
      `SELECT COUNT(DISTINCT session_id) as c FROM trace_events
       WHERE site_id = ? AND created_at >= ? AND session_id != ''`,
    )
    .get(site.id, since7) as { c: number };

  const paths = db
    .prepare(
      `SELECT COUNT(DISTINCT path) as c FROM trace_events WHERE site_id = ? AND created_at >= ?`,
    )
    .get(site.id, since7) as { c: number };

  const topRef = db
    .prepare(
      `SELECT referrer, COUNT(*) as c FROM trace_events
       WHERE site_id = ? AND created_at >= ? AND referrer != ''
       GROUP BY referrer ORDER BY c DESC LIMIT 1`,
    )
    .get(site.id, since7) as { referrer: string; c: number } | undefined;

  const [d, like] = domainParams(site.domain);
  const searchRefs = db
    .prepare(
      `SELECT COUNT(*) as c FROM click_signals WHERE ${domainClause()} AND clicked_at >= ?`,
    )
    .get(d, like, since7) as { c: number };

  const sessionCount = Math.max(sessions.c, pv.c > 0 ? 1 : 0);
  const snippetInstalled = pv.c > 0;

  return {
    domain: site.domain,
    traceKey: mods.traceKey,
    snippetInstalled,
    sessions7d: sessionCount,
    pageviews7d: pv.c,
    uniquePaths7d: paths.c,
    avgPagesPerSession:
      sessionCount > 0 ? Math.round((pv.c / sessionCount) * 10) / 10 : 0,
    searchReferrals7d: searchRefs.c,
    topReferrer: topRef?.referrer || null,
  };
}

export function tracePages(site: StudioSite, days = 28, limit = 40): TracePageRow[] {
  const since = daysAgoIso(days);
  const rows = getDb()
    .prepare(
      `SELECT path,
              COUNT(*) as pageviews,
              COUNT(DISTINCT session_id) as sessions
       FROM trace_events
       WHERE site_id = ? AND created_at >= ?
       GROUP BY path
       ORDER BY pageviews DESC
       LIMIT ?`,
    )
    .all(site.id, since, limit) as { path: string; pageviews: number; sessions: number }[];

  return rows.map((r) => ({
    path: r.path,
    pageviews: r.pageviews,
    sessions: r.sessions,
    avgTimeSec: null,
  }));
}

export function traceReferrers(site: StudioSite, days = 28, limit = 20): TraceReferrerRow[] {
  const since = daysAgoIso(days);
  const rows = getDb()
    .prepare(
      `SELECT referrer,
              COUNT(DISTINCT session_id) as sessions,
              COUNT(*) as pageviews
       FROM trace_events
       WHERE site_id = ? AND created_at >= ? AND referrer != ''
       GROUP BY referrer
       ORDER BY pageviews DESC
       LIMIT ?`,
    )
    .all(site.id, since, limit) as { referrer: string; sessions: number; pageviews: number }[];

  const [d, like] = domainParams(site.domain);
  const ayebaRows = getDb()
    .prepare(
      `SELECT 'Ayeba Search' as referrer,
              COUNT(DISTINCT query) as sessions,
              COUNT(*) as pageviews
       FROM click_signals
       WHERE ${domainClause()} AND clicked_at >= ?`,
    )
    .get(d, like, since) as
    | { referrer: string; sessions: number; pageviews: number }
    | undefined;

  const merged = [...rows];
  if (ayebaRows && ayebaRows.pageviews > 0) {
    merged.unshift({
      referrer: "Ayeba Search",
      sessions: ayebaRows.sessions,
      pageviews: ayebaRows.pageviews,
    });
  }

  return merged.slice(0, limit);
}

export function traceSnippet(traceKey: string) {
  return `<script async src="https://ayeba.app/api/studio/trace/script?k=${traceKey}"></script>`;
}
