import { getDb } from "@/lib/storage/database";

function n(v: unknown) {
  return Number(v) || 0;
}

/**
 * Realtime snapshot (last N minutes) from real Trace tables — no mocks.
 * Active users/sessions = distinct sessions with events in the window.
 */
export function getTraceRealtime(siteId: string, minutes = 30) {
  const db = getDb();
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();

  const activeUsers = n(
    (
      db
        .prepare(
          `SELECT COUNT(DISTINCT session_id) as c FROM trace_events_enhanced
           WHERE site_id = ? AND timestamp >= ?`,
        )
        .get(siteId, since) as { c: number }
    )?.c,
  );

  const sessions = n(
    (
      db
        .prepare(
          `SELECT COUNT(*) as c FROM trace_sessions
           WHERE site_id = ? AND started_at >= ?`,
        )
        .get(siteId, since) as { c: number }
    )?.c,
  );

  const events = n(
    (
      db
        .prepare(
          `SELECT COUNT(*) as c FROM trace_events_enhanced
           WHERE site_id = ? AND timestamp >= ?`,
        )
        .get(siteId, since) as { c: number }
    )?.c,
  );

  const pageviews = n(
    (
      db
        .prepare(
          `SELECT COUNT(*) as c FROM trace_events_enhanced
           WHERE site_id = ? AND timestamp >= ? AND event_type = 'pageview'`,
        )
        .get(siteId, since) as { c: number }
    )?.c,
  );

  const conversions = n(
    (
      db
        .prepare(
          `SELECT COUNT(*) as c FROM trace_events_enhanced
           WHERE site_id = ? AND timestamp >= ? AND event_type = 'conversion'`,
        )
        .get(siteId, since) as { c: number }
    )?.c,
  );

  const byMinute = db
    .prepare(
      `SELECT strftime('%Y-%m-%dT%H:%M', timestamp) as minute,
              COUNT(DISTINCT session_id) as users,
              COUNT(*) as events
       FROM trace_events_enhanced
       WHERE site_id = ? AND timestamp >= ?
       GROUP BY minute
       ORDER BY minute ASC`,
    )
    .all(siteId, since) as Array<{ minute: string; users: number; events: number }>;

  const topPages = db
    .prepare(
      `SELECT path,
              COUNT(*) as views,
              COUNT(DISTINCT session_id) as activeUsers
       FROM trace_events_enhanced
       WHERE site_id = ? AND timestamp >= ? AND event_type = 'pageview'
       GROUP BY path
       ORDER BY views DESC
       LIMIT 15`,
    )
    .all(siteId, since) as Array<{ path: string; views: number; activeUsers: number }>;

  const topEvents = db
    .prepare(
      `SELECT event_type,
              COUNT(*) as count,
              COUNT(DISTINCT session_id) as sessions
       FROM trace_events_enhanced
       WHERE site_id = ? AND timestamp >= ?
       GROUP BY event_type
       ORDER BY count DESC
       LIMIT 15`,
    )
    .all(siteId, since) as Array<{ event_type: string; count: number; sessions: number }>;

  const topReferrers = db
    .prepare(
      `SELECT COALESCE(NULLIF(referrer, ''), '(direct)') as referrer,
              COUNT(DISTINCT id) as sessions
       FROM trace_sessions
       WHERE site_id = ? AND started_at >= ?
       GROUP BY referrer
       ORDER BY sessions DESC
       LIMIT 10`,
    )
    .all(siteId, since) as Array<{ referrer: string; sessions: number }>;

  const recentEvents = db
    .prepare(
      `SELECT event_type, path, title, session_id, timestamp
       FROM trace_events_enhanced
       WHERE site_id = ? AND timestamp >= ?
       ORDER BY timestamp DESC
       LIMIT 40`,
    )
    .all(siteId, since) as Array<{
    event_type: string;
    path: string;
    title: string | null;
    session_id: string;
    timestamp: string;
  }>;

  const devices = db
    .prepare(
      `SELECT COALESCE(NULLIF(device_type, ''), 'inconnu') as device,
              COUNT(*) as count
       FROM trace_sessions
       WHERE site_id = ? AND started_at >= ?
       GROUP BY device_type
       ORDER BY count DESC`,
    )
    .all(siteId, since) as Array<{ device: string; count: number }>;

  return {
    minutes,
    since,
    activeUsers,
    sessions: Math.max(sessions, activeUsers),
    events,
    pageviews,
    conversions,
    byMinute,
    topPages,
    topEvents,
    topReferrers,
    recentEvents,
    devices,
  };
}
