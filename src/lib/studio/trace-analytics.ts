/**
 * Trace — real analytics queries over the enhanced tracking tables.
 * Every number comes from collected events; empty means no traffic yet.
 */
import { getDb } from "@/lib/storage/database";

type Row = Record<string, unknown>;
const n = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/* ---------- Temps réel / Vue d'ensemble ---------- */

export function traceDailySeries(siteId: string, days = 28) {
  return getDb()
    .prepare(
      `SELECT substr(started_at, 1, 10) as day,
              COUNT(*) as sessions,
              SUM(pageviews) as pageviews
       FROM trace_sessions
       WHERE site_id = ? AND started_at >= ?
       GROUP BY day ORDER BY day`,
    )
    .all(siteId, daysAgo(days)) as Array<{ day: string; sessions: number; pageviews: number }>;
}

export function traceTotals(siteId: string, days = 28) {
  const db = getDb();
  const since = daysAgo(days);
  const sessions = db
    .prepare(`SELECT COUNT(*) as c, AVG(duration_sec) as dur, AVG(CASE WHEN bounce=1 THEN 1.0 ELSE 0 END)*100 as bounce
              FROM trace_sessions WHERE site_id = ? AND started_at >= ?`)
    .get(siteId, since) as Row;
  const pageviews = db
    .prepare(`SELECT COUNT(*) as c FROM trace_events_enhanced WHERE site_id = ? AND timestamp >= ? AND event_type='pageview'`)
    .get(siteId, since) as Row;
  const users = db
    .prepare(`SELECT COUNT(DISTINCT COALESCE(user_id, id)) as c FROM trace_sessions WHERE site_id = ? AND started_at >= ?`)
    .get(siteId, since) as Row;
  const newUsers = db
    .prepare(`SELECT COUNT(*) as c FROM trace_sessions WHERE site_id = ? AND started_at >= ? AND is_first_visit = 1`)
    .get(siteId, since) as Row;
  return {
    sessions: n(sessions?.c),
    pageviews: n(pageviews?.c),
    users: n(users?.c),
    newUsers: n(newUsers?.c),
    avgSessionDurationSec: Math.round(n(sessions?.dur)),
    bounceRate: Math.round(n(sessions?.bounce) * 10) / 10,
    pagesPerSession: sessions?.c ? Math.round((n(pageviews?.c) / n(sessions.c)) * 10) / 10 : 0,
  };
}

/* ---------- Audience ---------- */

export function traceAudience(siteId: string, days = 28) {
  const db = getDb();
  const since = daysAgo(days);
  const group = (col: string, limit = 15) =>
    db
      .prepare(
        `SELECT ${col} as label, COUNT(*) as sessions, SUM(pageviews) as pageviews,
                AVG(CASE WHEN bounce=1 THEN 1.0 ELSE 0 END)*100 as bounce_rate
         FROM trace_sessions
         WHERE site_id = ? AND started_at >= ? AND ${col} IS NOT NULL AND ${col} != ''
         GROUP BY ${col} ORDER BY sessions DESC LIMIT ?`,
      )
      .all(siteId, since, limit) as Row[];

  const hourly = db
    .prepare(
      `SELECT CAST(strftime('%H', started_at) AS INTEGER) as hour, COUNT(*) as sessions
       FROM trace_sessions WHERE site_id = ? AND started_at >= ?
       GROUP BY hour ORDER BY hour`,
    )
    .all(siteId, since) as Array<{ hour: number; sessions: number }>;

  const newVsReturning = db
    .prepare(
      `SELECT is_first_visit as first, COUNT(*) as c FROM trace_sessions
       WHERE site_id = ? AND started_at >= ? GROUP BY is_first_visit`,
    )
    .all(siteId, since) as Array<{ first: number; c: number }>;

  return {
    devices: group("device_type"),
    browsers: group("browser", 10),
    os: group("os", 10),
    countries: group("country", 20),
    cities: group("city", 20),
    languages: group("language", 15),
    screenResolutions: group("screen_resolution", 10),
    hourly,
    newVsReturning: {
      new: newVsReturning.find((r) => r.first === 1)?.c ?? 0,
      returning: newVsReturning.find((r) => r.first === 0)?.c ?? 0,
    },
  };
}

/* ---------- Acquisition ---------- */

export function traceAcquisition(siteId: string, days = 28) {
  const db = getDb();
  const since = daysAgo(days);

  const channels = db
    .prepare(
      `SELECT CASE
          WHEN referrer = '' OR referrer IS NULL THEN 'Direct'
          WHEN referrer LIKE '%ayeba%' THEN 'Ayeba Search'
          WHEN referrer LIKE '%google%' OR referrer LIKE '%bing%' OR referrer LIKE '%duckduckgo%' OR referrer LIKE '%yahoo%' THEN 'Recherche organique'
          WHEN referrer LIKE '%facebook%' OR referrer LIKE '%twitter%' OR referrer LIKE '%instagram%' OR referrer LIKE '%linkedin%' OR referrer LIKE '%tiktok%' OR referrer LIKE '%whatsapp%' THEN 'Réseaux sociaux'
          ELSE 'Sites référents'
        END as channel,
        COUNT(*) as sessions, SUM(pageviews) as pageviews
       FROM trace_sessions
       WHERE site_id = ? AND started_at >= ?
       GROUP BY channel ORDER BY sessions DESC`,
    )
    .all(siteId, since) as Row[];

  const referrers = db
    .prepare(
      `SELECT referrer, COUNT(*) as sessions, SUM(pageviews) as pageviews,
              AVG(duration_sec) as avg_duration
       FROM trace_sessions
       WHERE site_id = ? AND started_at >= ? AND referrer != ''
       GROUP BY referrer ORDER BY sessions DESC LIMIT 30`,
    )
    .all(siteId, since) as Row[];

  const campaigns = db
    .prepare(
      `SELECT utm_source as source, utm_medium as medium, utm_campaign as campaign,
              COUNT(*) as sessions, SUM(pageviews) as pageviews
       FROM trace_sessions
       WHERE site_id = ? AND started_at >= ? AND utm_campaign IS NOT NULL AND utm_campaign != ''
       GROUP BY utm_source, utm_medium, utm_campaign
       ORDER BY sessions DESC LIMIT 30`,
    )
    .all(siteId, since) as Row[];

  const touchpoints = db
    .prepare(
      `SELECT touchpoint_type as type, source, medium, COUNT(*) as interactions
       FROM attribution_touchpoints
       WHERE site_id = ? AND timestamp >= ?
       GROUP BY touchpoint_type, source, medium
       ORDER BY interactions DESC LIMIT 30`,
    )
    .all(siteId, since) as Row[];

  return { channels, referrers, campaigns, touchpoints };
}

/* ---------- Comportement ---------- */

export function traceBehavior(siteId: string, days = 28) {
  const db = getDb();
  const since = daysAgo(days);

  const pages = db
    .prepare(
      `SELECT e.path,
              COUNT(*) as pageviews,
              COUNT(DISTINCT e.session_id) as sessions,
              AVG(e.duration_ms) as avg_duration_ms,
              AVG(e.scroll_depth) as avg_scroll
       FROM trace_events_enhanced e
       WHERE e.site_id = ? AND e.timestamp >= ? AND e.event_type = 'pageview'
       GROUP BY e.path ORDER BY pageviews DESC LIMIT 50`,
    )
    .all(siteId, since) as Row[];

  const entryPages = db
    .prepare(
      `SELECT entry_page as path, COUNT(*) as sessions,
              AVG(CASE WHEN bounce=1 THEN 1.0 ELSE 0 END)*100 as bounce_rate
       FROM trace_sessions
       WHERE site_id = ? AND started_at >= ? AND entry_page IS NOT NULL AND entry_page != ''
       GROUP BY entry_page ORDER BY sessions DESC LIMIT 30`,
    )
    .all(siteId, since) as Row[];

  const exitPages = db
    .prepare(
      `SELECT exit_page as path, COUNT(*) as exits
       FROM trace_sessions
       WHERE site_id = ? AND started_at >= ? AND exit_page IS NOT NULL AND exit_page != ''
       GROUP BY exit_page ORDER BY exits DESC LIMIT 30`,
    )
    .all(siteId, since) as Row[];

  const eventTypes = db
    .prepare(
      `SELECT event_type as type, COUNT(*) as count
       FROM trace_events_enhanced
       WHERE site_id = ? AND timestamp >= ?
       GROUP BY event_type ORDER BY count DESC`,
    )
    .all(siteId, since) as Row[];

  return { pages, entryPages, exitPages, eventTypes };
}

/* ---------- Conversions ---------- */

export function traceConversions(siteId: string, days = 28) {
  const db = getDb();
  const since = daysAgo(days);

  const steps = [
    { name: "Sessions", q: `SELECT COUNT(*) as c FROM trace_sessions WHERE site_id = ? AND started_at >= ?` },
    { name: "Pages vues", q: `SELECT COUNT(*) as c FROM trace_events_enhanced WHERE site_id = ? AND timestamp >= ? AND event_type = 'pageview'` },
    { name: "Engagées (30s+)", q: `SELECT COUNT(*) as c FROM trace_sessions WHERE site_id = ? AND started_at >= ? AND duration_sec >= 30` },
    { name: "Scroll 50%+", q: `SELECT COUNT(*) as c FROM trace_events_enhanced WHERE site_id = ? AND timestamp >= ? AND scroll_depth >= 50` },
    { name: "Formulaires", q: `SELECT COUNT(*) as c FROM trace_events_enhanced WHERE site_id = ? AND timestamp >= ? AND json_array_length(form_submissions) > 0` },
    { name: "Conversions", q: `SELECT COUNT(*) as c FROM trace_events_enhanced WHERE site_id = ? AND timestamp >= ? AND event_type = 'conversion'` },
  ].map((s) => ({ step: s.name, users: n((db.prepare(s.q).get(siteId, since) as Row)?.c) }));

  const conversions = db
    .prepare(
      `SELECT is_conversion, COUNT(*) as c, SUM(conversion_value) as value
       FROM attribution_touchpoints
       WHERE site_id = ? AND timestamp >= ? GROUP BY is_conversion`,
    )
    .all(siteId, since) as Row[];

  return {
    funnel: steps.map((s, i) => ({
      ...s,
      rate: i === 0 ? 100 : steps[0].users > 0 ? Math.round((s.users / steps[0].users) * 1000) / 10 : 0,
    })),
    attributed: {
      conversions: n(conversions.find((r) => r.is_conversion === 1)?.c),
      value: n(conversions.find((r) => r.is_conversion === 1)?.value),
    },
  };
}
