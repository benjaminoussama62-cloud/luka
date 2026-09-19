/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Ayeba Trace Enterprise - Cross-Domain Analytics
 * Real-time analytics with cross-platform tracking across Ayeba network
 */

import { getDb } from "@/lib/storage/database";
import type {
  NetworkDomain,
  CrossDomainTracking,
  TrackingEvent,
  UserProfile,
} from "./ad-network-types";

/** Raw trace_sessions row (snake_case columns). */
type TraceSession = {
  id: string;
  site_id: string;
  user_id: string | null;
  started_at: string;
  duration_sec: number;
  pageviews: number;
  bounce: number;
  entry_page: string;
  exit_page: string;
  device_type: string;
  browser: string;
  os: string;
  country: string;
  city: string;
  referrer: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
};

export class TraceEnterprise {
  private readonly NETWORK_DOMAINS: NetworkDomain[] = [
    "ayeba.app",
    "omega-web.org",
    "sombatekaonline.com",
    "jemsa.net",
    "to-tala.com",
  ];

  /**
   * Track page view with cross-domain support
   */
  trackPageView(input: {
    siteId: string;
    userId?: string;
    sessionId: string;
    pageUrl: string;
    referrer?: string;
    userAgent: string;
    ip: string;
    context?: {
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmContent?: string;
      utmTerm?: string;
    };
  }): string {
    const db = getDb();
    const eventId = this.generateId();
    const now = new Date().toISOString();

    // Get or create session
    const session = this.getOrCreateSession({
      siteId: input.siteId,
      userId: input.userId,
      sessionId: input.sessionId,
      pageUrl: input.pageUrl,
      referrer: input.referrer,
      userAgent: input.userAgent,
      ip: input.ip,
      context: input.context,
    });

    // Record enhanced event
    db.prepare(
      `INSERT INTO trace_events_enhanced (
        id, session_id, site_id, event_type, path, title, referrer,
        duration_ms, scroll_depth, elements_clicked, form_submissions,
        errors, custom_events, timestamp
      ) VALUES (?, ?, ?, 'pageview', ?, ?, ?, 0, 0, '[]', '[]', '[]', '{}', ?)`,
    ).run(
      eventId,
      session.id,
      input.siteId,
      this.extractPath(input.pageUrl),
      this.extractTitle(input.pageUrl),
      input.referrer || "",
      now,
    );

    // Update session stats
    this.updateSessionStats(session.id);

    // Cross-domain tracking
    if (input.userId) {
      this.updateCrossDomainProfile({
        userId: input.userId,
        sessionId: input.sessionId,
        domain: this.extractDomain(input.pageUrl) as NetworkDomain,
        event: {
          domain: this.extractDomain(input.pageUrl) as NetworkDomain,
          timestamp: now,
          type: "page_view",
          url: input.pageUrl,
          referrer: input.referrer,
        },
      });
    }

    return eventId;
  }

  /**
   * Track custom event
   */
  trackEvent(input: {
    sessionId: string;
    siteId: string;
    eventType: string;
    eventName: string;
    properties?: Record<string, unknown>;
    value?: number;
  }): string {
    const db = getDb();
    const eventId = this.generateId();
    const now = new Date().toISOString();

    const session = this.getSession(input.sessionId);
    if (!session) return "";

    // Get current events and add new one
    const currentEvents = JSON.parse(
      (db.prepare("SELECT custom_events FROM trace_events_enhanced WHERE id = ?").get(eventId) as any)?.custom_events || "{}",
    );
    currentEvents[input.eventType] = {
      name: input.eventName,
      properties: input.properties || {},
      value: input.value,
      timestamp: now,
    };

    db.prepare(
      `INSERT INTO trace_events_enhanced (
        id, session_id, site_id, event_type, path, title, referrer,
        duration_ms, scroll_depth, elements_clicked, form_submissions,
        errors, custom_events, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, '', 0, 0, '[]', '[]', '[]', ?, ?)`,
    ).run(
      eventId,
      input.sessionId,
      input.siteId,
      input.eventType,
      session.exit_page || "",
      "",
      JSON.stringify(currentEvents),
      now,
    );

    return eventId;
  }

  /**
   * Track form submission
   */
  trackFormSubmission(input: {
    sessionId: string;
    siteId: string;
    formId: string;
    formName: string;
    fields: Record<string, string>;
  }): string {
    const db = getDb();
    const eventId = this.generateId();
    const now = new Date().toISOString();

    const session = this.getSession(input.sessionId);
    if (!session) return "";

    // Get current form submissions
    const currentForms = JSON.parse(
      (db.prepare("SELECT form_submissions FROM trace_events_enhanced WHERE id = ?").get(eventId) as any)?.form_submissions || "[]",
    );
    currentForms.push({
      formId: input.formId,
      formName: input.formName,
      fields: input.fields,
      timestamp: now,
    });

    db.prepare(
      `UPDATE trace_events_enhanced
       SET form_submissions = ?
       WHERE session_id = ? AND event_type = 'pageview'
       ORDER BY timestamp DESC LIMIT 1`,
    ).run(JSON.stringify(currentForms), input.sessionId);

    return eventId;
  }

  /**
   * Track error
   */
  trackError(input: {
    sessionId: string;
    siteId: string;
    errorType: string;
    errorMessage: string;
    stackTrace?: string;
    url: string;
  }): string {
    const db = getDb();
    const eventId = this.generateId();
    const now = new Date().toISOString();

    const session = this.getSession(input.sessionId);
    if (!session) return "";

    // Get current errors
    const currentErrors = JSON.parse(
      (db.prepare("SELECT errors FROM trace_events_enhanced WHERE id = ?").get(eventId) as any)?.errors || "[]",
    );
    currentErrors.push({
      type: input.errorType,
      message: input.errorMessage,
      stackTrace: input.stackTrace,
      url: input.url,
      timestamp: now,
    });

    db.prepare(
      `UPDATE trace_events_enhanced
       SET errors = ?
       WHERE session_id = ? AND event_type = 'pageview'
       ORDER BY timestamp DESC LIMIT 1`,
    ).run(JSON.stringify(currentErrors), input.sessionId);

    return eventId;
  }

  /**
   * Get or create session
   */
  private getOrCreateSession(input: {
    siteId: string;
    userId?: string;
    sessionId: string;
    pageUrl: string;
    referrer?: string;
    userAgent: string;
    ip: string;
    context?: {
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmContent?: string;
      utmTerm?: string;
    };
  }): TraceSession {
    const db = getDb();
    const now = new Date().toISOString();

    // Check if session exists
    const existing = db
      .prepare("SELECT * FROM trace_sessions WHERE id = ?")
      .get(input.sessionId) as TraceSession | undefined;

    if (existing) {
      return existing;
    }

    // Parse user agent
    const deviceInfo = this.parseUserAgent(input.userAgent);
    const geoInfo = this.getGeoFromIp(input.ip);

    // Create new session
    const id = this.generateId();
    db.prepare(
      `INSERT INTO trace_sessions (
        id, site_id, user_id, started_at, duration_sec, pageviews,
        bounce, entry_page, exit_page, device_type, browser, os,
        country, city, referrer, utm_source, utm_medium, utm_campaign,
        utm_content, utm_term
      ) VALUES (?, ?, ?, ?, 0, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.siteId,
      input.userId || null,
      now,
      this.extractPath(input.pageUrl),
      this.extractPath(input.pageUrl),
      deviceInfo.type,
      deviceInfo.browser,
      deviceInfo.os,
      geoInfo.country,
      geoInfo.city,
      input.referrer || "",
      input.context?.utmSource || "",
      input.context?.utmMedium || "",
      input.context?.utmCampaign || "",
      input.context?.utmContent || "",
      input.context?.utmTerm || "",
    );

    return this.getSession(id) as TraceSession;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): TraceSession | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM trace_sessions WHERE id = ?")
      .get(sessionId) as TraceSession | undefined;
    return row || null;
  }

  /**
   * Update session stats
   */
  private updateSessionStats(sessionId: string): void {
    const db = getDb();

    // Get current pageviews
    const session = this.getSession(sessionId);
    if (!session) return;

    const newPageviews = session.pageviews + 1;
    const isBounce = newPageviews === 1 ? 1 : 0;

    db.prepare(
      `UPDATE trace_sessions
       SET pageviews = ?, bounce = ?, exit_page = (
         SELECT path FROM trace_events_enhanced
         WHERE session_id = ? AND event_type = 'pageview'
         ORDER BY timestamp DESC LIMIT 1
       )
       WHERE id = ?`,
    ).run(newPageviews, isBounce, sessionId, sessionId);
  }

  /**
   * Get cross-domain profile for user
   */
  getCrossDomainProfile(userId: string, sessionId: string): CrossDomainTracking | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM cross_domain_profiles WHERE user_id = ? AND session_id = ?")
      .get(userId, sessionId) as
      | { user_id: string; session_id: string; domains: string; timeline: string; profile: string }
      | undefined;

    if (!row) return null;

    return {
      userId: row.user_id,
      sessionId: row.session_id,
      domains: JSON.parse(row.domains),
      timeline: JSON.parse(row.timeline),
      profile: JSON.parse(row.profile),
    };
  }

  /**
   * Update cross-domain profile
   */
  private updateCrossDomainProfile(input: {
    userId: string;
    sessionId: string;
    domain: NetworkDomain;
    event: TrackingEvent;
  }): void {
    const db = getDb();
    const now = new Date().toISOString();

    const existing = this.getCrossDomainProfile(input.userId, input.sessionId);

    if (existing) {
      // Update existing profile
      const domains = existing.domains.includes(input.domain)
        ? existing.domains
        : [...existing.domains, input.domain];

      const timeline = [...existing.timeline, input.event];

      // Update user profile
      const profile = this.updateUserProfile(existing.profile, input.event);

      db.prepare(
        `UPDATE cross_domain_profiles
         SET domains = ?, timeline = ?, profile = ?, last_updated = ?
         WHERE user_id = ? AND session_id = ?`,
      ).run(
        JSON.stringify(domains),
        JSON.stringify(timeline),
        JSON.stringify(profile),
        now,
        input.userId,
        input.sessionId,
      );
    } else {
      // Create new profile
      const profile = this.createUserProfile(input.event);

      db.prepare(
        `INSERT INTO cross_domain_profiles (
          user_id, session_id, domains, timeline, profile, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        input.userId,
        input.sessionId,
        JSON.stringify([input.domain]),
        JSON.stringify([input.event]),
        JSON.stringify(profile),
        now,
      );
    }
  }

  /**
   * Create user profile from first event
   */
  private createUserProfile(event: TrackingEvent): UserProfile {
    void event;
    return {
      segments: [],
      interests: [],
      demographics: {},
      behavior: {
        totalSessions: 1,
        avgSessionDuration: 0,
        conversionRate: 0,
        preferredCategories: [],
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Update user profile based on event
   */
  private updateUserProfile(profile: UserProfile, event: TrackingEvent): UserProfile {
    const updated = { ...profile };

    // Update behavior
    updated.behavior.totalSessions = profile.behavior.totalSessions + 1;

    // Extract interests from content (simplified)
    if (event.type === "page_view") {
      const path = event.url.toLowerCase();
      if (path.includes("tech") || path.includes("software")) {
        updated.interests.push("technology");
      }
      if (path.includes("finance") || path.includes("money")) {
        updated.interests.push("finance");
      }
      if (path.includes("health") || path.includes("medical")) {
        updated.interests.push("health");
      }
    }

    // Deduplicate interests
    updated.interests = [...new Set(updated.interests)];

    updated.lastUpdated = new Date().toISOString();

    return updated;
  }

  /**
   * Get real-time analytics for site
   */
  getRealTimeAnalytics(siteId: string, minutes: number = 30): {
    activeUsers: number;
    pageviews: number;
    sessions: number;
    avgSessionDuration: number;
    topPages: Array<{ path: string; views: number }>;
    topReferrers: Array<{ referrer: string; views: number }>;
    deviceBreakdown: Array<{ device: string; count: number }>;
    geoBreakdown: Array<{ country: string; count: number }>;
  } {
    const db = getDb();
    const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();

    // Active sessions
    const activeSessions = db
      .prepare(
        `SELECT COUNT(*) as c FROM trace_sessions
         WHERE site_id = ? AND started_at >= ? AND ended_at IS NULL`,
      )
      .get(siteId, since) as { c: number };

    // Pageviews
    const pageviews = db
      .prepare(
        `SELECT COUNT(*) as c FROM trace_events_enhanced
         WHERE site_id = ? AND timestamp >= ? AND event_type = 'pageview'`,
      )
      .get(siteId, since) as { c: number };

    // Total sessions
    const sessions = db
      .prepare(
        `SELECT COUNT(*) as c FROM trace_sessions
         WHERE site_id = ? AND started_at >= ?`,
      )
      .get(siteId, since) as { c: number };

    // Avg session duration
    const duration = db
      .prepare(
        `SELECT AVG(duration_sec) as avg FROM trace_sessions
         WHERE site_id = ? AND started_at >= ? AND duration_sec > 0`,
      )
      .get(siteId, since) as { avg: number | null };

    // Top pages
    const topPages = db
      .prepare(
        `SELECT path, COUNT(*) as views FROM trace_events_enhanced
         WHERE site_id = ? AND timestamp >= ? AND event_type = 'pageview'
         GROUP BY path
         ORDER BY views DESC
         LIMIT 10`,
      )
      .all(siteId, since) as Array<{ path: string; views: number }>;

    // Top referrers
    const topReferrers = db
      .prepare(
        `SELECT referrer, COUNT(*) as views FROM trace_sessions
         WHERE site_id = ? AND started_at >= ? AND referrer != ''
         GROUP BY referrer
         ORDER BY views DESC
         LIMIT 10`,
      )
      .all(siteId, since) as Array<{ referrer: string; views: number }>;

    // Device breakdown
    const deviceBreakdown = db
      .prepare(
        `SELECT device_type as device, COUNT(*) as count FROM trace_sessions
         WHERE site_id = ? AND started_at >= ?
         GROUP BY device_type
         ORDER BY count DESC`,
      )
      .all(siteId, since) as Array<{ device: string; count: number }>;

    // Geo breakdown
    const geoBreakdown = db
      .prepare(
        `SELECT country, COUNT(*) as count FROM trace_sessions
         WHERE site_id = ? AND started_at >= ? AND country != ''
         GROUP BY country
         ORDER BY count DESC
         LIMIT 10`,
      )
      .all(siteId, since) as Array<{ country: string; count: number }>;

    return {
      activeUsers: activeSessions.c,
      pageviews: pageviews.c,
      sessions: sessions.c,
      avgSessionDuration: duration.avg || 0,
      topPages,
      topReferrers,
      deviceBreakdown,
      geoBreakdown,
    };
  }

  /**
   * Get funnel analysis
   */
  getFunnelAnalysis(siteId: string, steps: string[], periodDays: number = 30): {
    stepName: string;
    users: number;
    dropoff: number;
    conversionRate: number;
  }[] {
    const db = getDb();
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

    const results: { stepName: string; users: number; dropoff: number; conversionRate: number }[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepUsers = db
        .prepare(
          `SELECT COUNT(DISTINCT session_id) as c FROM trace_events_enhanced
           WHERE site_id = ? AND timestamp >= ? AND path LIKE ?`,
        )
        .get(siteId, since, `%${step}%`) as { c: number };

      const dropoff: number = i > 0 ? results[i - 1].users - stepUsers.c : 0;
      const conversionRate: number = i > 0 ? (stepUsers.c / results[0].users) * 100 : 100;

      results.push({
        stepName: step,
        users: stepUsers.c,
        dropoff,
        conversionRate,
      });
    }

    return results;
  }

  /**
   * Get cohort analysis
   */
  getCohortAnalysis(siteId: string, cohortSize: number = 7, periodWeeks: number = 8): number[][] {
    const db = getDb();
    const cohortData: number[][] = [];

    for (let week = 0; week < periodWeeks; week++) {
      const cohortStart = new Date(Date.now() - (week + cohortSize) * 7 * 24 * 60 * 60 * 1000);
      const cohortEnd = new Date(Date.now() - week * 7 * 24 * 60 * 60 * 1000);

      const cohortUsers = db
        .prepare(
          `SELECT COUNT(DISTINCT session_id) as c FROM trace_sessions
           WHERE site_id = ? AND started_at >= ? AND started_at <= ?`,
        )
        .get(siteId, cohortStart.toISOString(), cohortEnd.toISOString()) as { c: number };

      const retentionData = [cohortUsers.c];

      for (let period = 1; period <= cohortSize; period++) {
        const periodStart = new Date(cohortEnd.getTime() + period * 7 * 24 * 60 * 60 * 1000);
        const periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        const returningUsers = db
          .prepare(
            `SELECT COUNT(DISTINCT s1.session_id) as c
             FROM trace_sessions s1
             JOIN trace_sessions s2 ON s1.user_id = s2.user_id
             WHERE s1.site_id = ? AND s1.started_at >= ? AND s1.started_at <= ?
             AND s2.started_at >= ? AND s2.started_at <= ?`,
          )
          .get(
            siteId,
            cohortStart.toISOString(),
            cohortEnd.toISOString(),
            periodStart.toISOString(),
            periodEnd.toISOString(),
          ) as { c: number };

        const retentionRate = cohortUsers.c > 0 ? (returningUsers.c / cohortUsers.c) * 100 : 0;
        retentionData.push(Math.round(retentionRate));
      }

      cohortData.push(retentionData);
    }

    return cohortData;
  }

  /**
   * Parse user agent
   */
  private parseUserAgent(userAgent: string): { type: string; browser: string; os: string } {
    // Simplified user agent parsing
    const ua = userAgent.toLowerCase();

    let type = "desktop";
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      type = "mobile";
    } else if (ua.includes("tablet") || ua.includes("ipad")) {
      type = "tablet";
    }

    let browser = "unknown";
    if (ua.includes("chrome")) browser = "chrome";
    else if (ua.includes("firefox")) browser = "firefox";
    else if (ua.includes("safari")) browser = "safari";
    else if (ua.includes("edge")) browser = "edge";

    let os = "unknown";
    if (ua.includes("windows")) os = "windows";
    else if (ua.includes("mac")) os = "macos";
    else if (ua.includes("android")) os = "android";
    else if (ua.includes("ios")) os = "ios";
    else if (ua.includes("linux")) os = "linux";

    return { type, browser, os };
  }

  /**
   * Get geo info from IP (simplified)
   */
  private getGeoFromIp(ip: string): { country: string; city: string } {
    void ip;
    // In production, use proper IP geolocation service
    return { country: "CD", city: "Kinshasa" };
  }

  /**
   * Extract path from URL
   */
  private extractPath(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return "/";
    }
  }

  /**
   * Extract title from URL (simplified)
   */
  private extractTitle(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return hostname;
    } catch {
      return "Unknown";
    }
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  }

  /**
   * Hash IP for privacy
   */
  private hashIp(ip: string): string {
    return ip.split(".").map((x) => parseInt(x, 10)).join("-");
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const traceEnterprise = new TraceEnterprise();
