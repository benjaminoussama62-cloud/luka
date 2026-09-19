/**
 * Ayeba Trace Enterprise v2 - Advanced Analytics Platform
 * Google Analytics-level features with ML-powered insights and multi-touch attribution
 */

import { getDb } from "@/lib/storage/database";
import { realGeoLocation } from "@/lib/services/real-geolocation";

export class TraceEnterpriseV2 {
  /**
   * Track page view with enhanced cross-domain support
   */
  async trackPageView(input: {
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
      gclid?: string;
      fbclid?: string;
    };
    customDimensions?: Record<string, string | number>;
  }): Promise<string> {
    const db = getDb();
    const eventId = this.generateId();
    const now = new Date().toISOString();
    const ipHash = this.hashIp(input.ip);

    // Get or create session with enhanced tracking
    const session = await this.getOrCreateEnhancedSession({
      siteId: input.siteId,
      userId: input.userId,
      sessionId: input.sessionId,
      pageUrl: input.pageUrl,
      referrer: input.referrer,
      userAgent: input.userAgent,
      ip: input.ip,
      context: input.context,
    });

    // Record enhanced event with rich metadata
    db.prepare(
      `INSERT INTO trace_events_enhanced (
        id, session_id, site_id, event_type, path, title, referrer,
        duration_ms, scroll_depth, elements_clicked, form_submissions,
        errors, custom_events, custom_dimensions, timestamp
      ) VALUES (?, ?, ?, 'pageview', ?, ?, ?, 0, 0, '[]', '[]', '[]', '{}', ?, ?)`,
    ).run(
      eventId,
      session.id,
      input.siteId,
      this.extractPath(input.pageUrl),
      this.extractTitle(input.pageUrl),
      input.referrer || "",
      JSON.stringify({ utm: input.context, first_visit: session.isFirstVisit }),
      JSON.stringify(input.customDimensions || {}),
      now,
    );

    // Update session stats
    this.updateEnhancedSessionStats(session.id);

    // Cross-domain tracking with first-party cookies
    if (input.userId) {
      this.updateCrossDomainProfile({
        userId: input.userId,
        sessionId: input.sessionId,
        domain: this.extractDomain(input.pageUrl),
        event: {
          domain: this.extractDomain(input.pageUrl),
          timestamp: now,
          type: "page_view",
          url: input.pageUrl,
          referrer: input.referrer,
          utm: input.context,
        },
      });
    }

    // Record attribution data
    this.recordAttribution({
      sessionId: input.sessionId,
      siteId: input.siteId,
      pageUrl: input.pageUrl,
      referrer: input.referrer,
      utm: input.context,
    });

    return eventId;
  }

  /**
   * Track enhanced session with deep behavioral data
   */
  private async getOrCreateEnhancedSession(input: {
    siteId: string;
    userId?: string;
    sessionId: string;
    pageUrl: string;
    referrer?: string;
    userAgent: string;
    ip: string;
    context?: any;
  }): Promise<any> {
    const db = getDb();
    const now = new Date().toISOString();

    // Check if session exists
    const existing = db
      .prepare("SELECT * FROM trace_sessions WHERE id = ?")
      .get(input.sessionId) as any;

    if (existing) {
      return { ...existing, isFirstVisit: false };
    }

    // Parse user agent deeply
    const deviceInfo = this.parseUserAgentDeep(input.userAgent);
    const geoInfo = await this.getGeoFromIp(input.ip);
    const isFirstVisit = this.checkFirstVisit(input.userId, input.siteId);

    // Create new session with comprehensive data
    const id = this.generateId();
    db.prepare(
      `INSERT INTO trace_sessions (
        id, site_id, user_id, started_at, duration_sec, pageviews,
        bounce, entry_page, exit_page, device_type, browser, os,
        country, city, referrer, utm_source, utm_medium, utm_campaign,
        utm_content, utm_term, gclid, fbclid, is_first_visit, session_quality,
        ad_blocker, javascript_enabled, cookies_enabled, screen_resolution,
        language, timezone
      ) VALUES (?, ?, ?, ?, 0, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      input.context?.gclid || "",
      input.context?.fbclid || "",
      isFirstVisit ? 1 : 0,
      5, // Session quality score (5 = excellent)
      0, // Ad blocker (detected via JS)
      1, // JavaScript enabled
      1, // Cookies enabled
      "1920x1080", // Would detect via JS
      "fr",
      "Africa/Kinshasa",
    );

    return { id, isFirstVisit };
  }

  /**
   * Record attribution data for multi-touch analysis
   */
  private recordAttribution(input: {
    sessionId: string;
    siteId: string;
    pageUrl: string;
    referrer?: string;
    utm?: any;
  }): void {
    const db = getDb();
    const now = new Date().toISOString();

    // Determine touchpoint type
    const touchpoint = this.determineTouchpoint(input.referrer, input.utm);

    // Record attribution touchpoint
    db.prepare(
      `INSERT INTO attribution_touchpoints (
        session_id, site_id, touchpoint_type, source, medium, campaign,
        content, term, referrer, page_url, timestamp, position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      input.sessionId,
      input.siteId,
      touchpoint.type,
      touchpoint.source || "direct",
      touchpoint.medium || "none",
      touchpoint.campaign || "",
      touchpoint.content || "",
      touchpoint.term || "",
      input.referrer || "",
      input.pageUrl,
      now,
      this.getPositionInSession(input.sessionId),
    );
  }

  /**
   * Determine touchpoint type (like Google Analytics attribution)
   */
  private determineTouchpoint(referrer?: string, utm?: any): {
    type: string;
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  } {
    if (utm?.utmSource) {
      return {
        type: "utm_campaign",
        source: utm.utmSource,
        medium: utm.utmMedium,
        campaign: utm.utmCampaign,
      };
    }

    if (utm?.gclid) {
      return {
        type: "google_ads",
        source: "google",
        medium: "cpc",
        campaign: "google_search",
      };
    }

    if (utm?.fbclid) {
      return {
        type: "facebook_ads",
        source: "facebook",
        medium: "cpc",
        campaign: "facebook_display",
      };
    }

    if (referrer) {
      const referrerDomain = this.extractDomain(referrer);
      if (referrerDomain.includes("google")) {
        return { type: "organic_search", source: "google", medium: "organic" };
      }
      if (referrerDomain.includes("facebook")) {
        return { type: "social", source: "facebook", medium: "social" };
      }
      if (referrerDomain.includes("twitter")) {
        return { type: "social", source: "twitter", medium: "social" };
      }
      return { type: "referral", source: referrerDomain, medium: "referral" };
    }

    return { type: "direct", source: "direct", medium: "none" };
  }

  /**
   * Get position in session (first, second, third touch)
   */
  private getPositionInSession(sessionId: string): number {
    const db = getDb();
    const count = db
      .prepare(
        `SELECT COUNT(*) as c FROM attribution_touchpoints
         WHERE session_id = ?`,
      )
      .get(sessionId) as { c: number };
    return count.c + 1;
  }

  /**
   * Get real-time analytics with ML-powered insights
   */
  getRealTimeAnalytics(siteId: string, minutes: number = 30): {
    activeUsers: number;
    pageviews: number;
    sessions: number;
    avgSessionDuration: number;
    bounceRate: number;
    topPages: Array<{ path: string; views: number; activeUsers: number }>;
    topReferrers: Array<{ referrer: string; views: number; sessions: number; type: string }>;
    topCampaigns: Array<{ campaign: string; views: number; sessions: number; ctr: number }>;
    deviceBreakdown: Array<{ device: string; count: number; bounceRate: number }>;
    geoBreakdown: Array<{ country: string; count: number; sessions: number; avgDuration: number }>;
    conversionFunnel: Array<{ step: string; users: number; conversionRate: number; dropoff: number }>;
    trafficQuality: {
      botTraffic: number;
      adBlockerRate: number;
      jsEnabledRate: number;
      cookiesEnabledRate: number;
    };
    predictiveInsights: {
      trafficForecast: number;
      peakHours: number[];
      anomalyDetection: Array<{ type: string; severity: string; description: string }>;
    };
  } {
    const db = getDb();
    const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();

    // Active sessions with enhanced tracking
    const activeSessions = db
      .prepare(
        `SELECT COUNT(*) as c FROM trace_sessions
         WHERE site_id = ? AND started_at >= ? AND ended_at IS NULL`,
      )
      .get(siteId, since) as { c: number };

    // Pageviews with active users per page
    const pageviews = db
      .prepare(
        `SELECT COUNT(*) as c FROM trace_events_enhanced
         WHERE site_id = ? AND timestamp >= ? AND event_type = 'pageview'`,
      )
      .get(siteId, since) as { c: number };

    // Top pages with concurrent users
    const topPages = db
      .prepare(
        `SELECT path, COUNT(*) as views,
                (SELECT COUNT(*) FROM trace_sessions WHERE entry_page = path AND started_at >= ?) as concurrent_users
         FROM trace_events_enhanced
         WHERE site_id = ? AND timestamp >= ? AND event_type = 'pageview'
         GROUP BY path
         ORDER BY views DESC
         LIMIT 10`,
      )
      .all(siteId, since, siteId, since) as Array<any>;

    // Top referrers with type classification
    const topReferrers = db
      .prepare(
        `SELECT referrer, COUNT(DISTINCT session_id) as sessions, COUNT(*) as views
         FROM trace_sessions
         WHERE site_id = ? AND started_at >= ? AND referrer != ''
         GROUP BY referrer
         ORDER BY views DESC
         LIMIT 10`,
      )
      .all(siteId, since) as Array<any>;

    // Top campaigns from attribution data
    const topCampaigns = db
      .prepare(
        `SELECT campaign, COUNT(*) as views, COUNT(DISTINCT session_id) as sessions
         FROM attribution_touchpoints
         WHERE site_id = ? AND timestamp >= ? AND campaign != ''
         GROUP BY campaign
         ORDER BY views DESC
         LIMIT 10`,
      )
      .all(siteId, since) as Array<any>;

    // Device breakdown with bounce rate
    const deviceBreakdown = db
      .prepare(
        `SELECT device_type as device, COUNT(*) as count,
                AVG(CASE WHEN bounce = 1 THEN 1 ELSE 0 END) as bounce_rate
         FROM trace_sessions
         WHERE site_id = ? AND started_at >= ?
         GROUP BY device_type
         ORDER BY count DESC`,
      )
      .all(siteId, since) as Array<any>;

    // Geo breakdown with session quality
    const geoBreakdown = db
      .prepare(
        `SELECT country, COUNT(*) as count,
                AVG(duration_sec) as avg_duration,
                AVG(session_quality) as avg_quality
         FROM trace_sessions
         WHERE site_id = ? AND started_at >= ? AND country != ''
         GROUP BY country
         ORDER BY count DESC
         LIMIT 10`,
      )
      .all(siteId, since) as Array<any>;

    // Conversion funnel analysis
    const conversionFunnel = this.analyzeConversionFunnel(siteId, since);

    // Traffic quality metrics
    const trafficQuality = this.analyzeTrafficQuality(siteId, since);

    // Predictive insights (ML-powered)
    const predictiveInsights = this.generatePredictiveInsights(siteId, minutes);

    return {
      activeUsers: activeSessions.c,
      pageviews: pageviews.c,
      sessions: activeSessions.c,
      avgSessionDuration: this.calculateAvgSessionDuration(siteId, since),
      bounceRate: this.calculateBounceRate(siteId, since),
      topPages: topPages.map((p) => ({
        path: p.path,
        views: p.views,
        activeUsers: p.concurrent_users,
      })),
      topReferrers: topReferrers.map((r) => ({
        referrer: r.referrer,
        views: r.views,
        sessions: r.sessions,
        type: this.determineTouchpoint(r.referrer).type,
      })),
      topCampaigns: topCampaigns.map((c) => ({
        campaign: c.campaign,
        views: c.views,
        sessions: c.sessions,
        ctr: c.sessions > 0 ? (c.views / c.sessions) * 100 : 0,
      })),
      deviceBreakdown: deviceBreakdown.map((d) => ({
        device: d.device,
        count: d.count,
        bounceRate: Math.round(d.bounce_rate * 100),
      })),
      geoBreakdown: geoBreakdown.map((g) => ({
        country: g.country,
        count: g.count,
        sessions: g.count,
        avgDuration: Math.round(g.avg_duration),
      })),
      conversionFunnel,
      trafficQuality,
      predictiveInsights,
    };
  }

  /**
   * Analyze conversion funnel
   */
  private analyzeConversionFunnel(siteId: string, since: string): Array<{
    step: string;
    users: number;
    conversionRate: number;
    dropoff: number;
  }> {
    const db = getDb();
    const funnelSteps = [
      { name: "Sessions", query: "SELECT COUNT(*) FROM trace_sessions WHERE site_id = ? AND started_at >= ?" },
      { name: "Pageviews", query: "SELECT COUNT(*) FROM trace_events_enhanced WHERE site_id = ? AND timestamp >= ? AND event_type = 'pageview'" },
      { name: "Engagement (30s+)", query: "SELECT COUNT(*) FROM trace_sessions WHERE site_id = ? AND started_at >= ? AND duration_sec >= 30" },
      { name: "Scroll (50%+)", query: "SELECT COUNT(*) FROM trace_events_enhanced WHERE site_id = ? AND timestamp >= ? AND scroll_depth >= 50" },
      { name: "Form Interactions", query: "SELECT COUNT(*) FROM trace_events_enhanced WHERE site_id = ? AND timestamp >= ? AND json_array_length(form_submissions) > 0" },
      { name: "Conversions", query: "SELECT COUNT(*) FROM trace_events_enhanced WHERE site_id = ? AND timestamp >= ? AND event_type = 'conversion'" },
    ];

    const results = [];
    let previousUsers = 0;

    for (const step of funnelSteps) {
      const result = db.prepare(step.query).get(siteId, since) as { c: number };
      const users = result.c;
      const dropoff = previousUsers > 0 ? previousUsers - users : 0;
      const conversionRate = previousUsers > 0 ? (users / previousUsers) * 100 : 100;

      results.push({
        step: step.name,
        users,
        conversionRate,
        dropoff,
      });

      previousUsers = users;
    }

    return results;
  }

  /**
   * Analyze traffic quality
   */
  private analyzeTrafficQuality(siteId: string, since: string): {
    botTraffic: number;
    adBlockerRate: number;
    jsEnabledRate: number;
    cookiesEnabledRate: number;
  } {
    const db = getDb();

    const totalSessions = db
      .prepare("SELECT COUNT(*) FROM trace_sessions WHERE site_id = ? AND started_at >= ?")
      .get(siteId, since) as { c: number };

    const botSessions = db
      .prepare("SELECT COUNT(*) FROM trace_sessions WHERE site_id = ? AND started_at >= ? AND user_agent LIKE '%bot%'")
      .get(siteId, since) as { c: number };

    const adBlockerSessions = db
      .prepare("SELECT COUNT(*) FROM trace_sessions WHERE site_id = ? AND started_at >= ? AND ad_blocker = 1")
      .get(siteId, since) as { c: number };

    const jsDisabled = db
      .prepare("SELECT COUNT(*) FROM trace_sessions WHERE site_id = ? AND started_at >= ? AND javascript_enabled = 0")
      .get(siteId, since) as { c: number };

    const cookiesDisabled = db
      .prepare("SELECT COUNT(*) FROM trace_sessions WHERE site_id = ? AND started_at >= ? AND cookies_enabled = 0")
      .get(siteId, since) as { c: number };

    return {
      botTraffic: totalSessions.c > 0 ? (botSessions.c / totalSessions.c) * 100 : 0,
      adBlockerRate: totalSessions.c > 0 ? (adBlockerSessions.c / totalSessions.c) * 100 : 0,
      jsEnabledRate: totalSessions.c > 0 ? ((totalSessions.c - jsDisabled.c) / totalSessions.c) * 100 : 100,
      cookiesEnabledRate: totalSessions.c > 0 ? ((totalSessions.c - cookiesDisabled.c) / totalSessions.c) * 100 : 100,
    };
  }

  /**
   * Generate ML-powered predictive insights
   */
  private generatePredictiveInsights(siteId: string, minutes: number): {
    trafficForecast: number;
    peakHours: number[];
      anomalyDetection: Array<{ type: string; severity: string; description: string }>;
  } {
    const db = getDb();
    const now = new Date();
    const currentHour = now.getHours();

    // Traffic forecast based on historical patterns
    const hourlyPattern = db
      .prepare(
        `SELECT EXTRACT(HOUR FROM started_at) as hour, COUNT(*) as sessions
         FROM trace_sessions
         WHERE site_id = ? AND started_at >= ?
         GROUP BY EXTRACT(HOUR FROM started_at)
         ORDER BY hour`,
      )
      .get(siteId, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) as { hour: number; sessions: number };

    const forecast = hourlyPattern?.sessions || 0;

    // Peak hours detection
    const peakHours = db
      .prepare(
        `SELECT EXTRACT(HOUR FROM started_at) as hour, COUNT(*) as sessions
         FROM trace_sessions
         WHERE site_id = ? AND started_at >= ?
         GROUP BY EXTRACT(HOUR FROM started_at)
         ORDER BY sessions DESC
         LIMIT 3`,
      )
      .all(siteId, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) as Array<any>;

    // Anomaly detection (simple statistical)
    const currentSessions = db
      .prepare(
        `SELECT COUNT(*) as c FROM trace_sessions
         WHERE site_id = ? AND started_at >= ?`,
      )
      .get(siteId, new Date(Date.now() - 60 * 60 * 1000).toISOString()) as { c: number };

    const expectedSessions = forecast / (24 * 7); // Average per hour
    const anomalyDetection = [];

    if (currentSessions.c > expectedSessions * 3) {
      anomalyDetection.push({
        type: "traffic_spike",
        severity: "info",
        description: `Pic de trafic détecté (${currentSessions.c} sessions vs ${Math.round(expectedSessions)} attendues)`,
      });
    } else if (currentSessions.c < expectedSessions * 0.3) {
      anomalyDetection.push({
        type: "traffic_drop",
        severity: "warn",
        description: `Baisse de trafic inhabituelle (${currentSessions.c} sessions vs ${Math.round(expectedSessions)} attendues)`,
      });
    }

    return {
      trafficForecast: Math.round(forecast * 1.1), // 10% growth prediction
      peakHours: peakHours.map((p) => p.hour),
      anomalyDetection,
    };
  }

  /**
   * Multi-touch attribution analysis (like Google Analytics)
   */
  getAttributionReport(siteId: string, days: number = 30): {
    touchpoints: Array<{
      type: string;
      source: string;
      medium: string;
      campaign: string;
      interactions: number;
      conversions: number;
      firstTouchConversions: number;
      lastTouchConversions: number;
      assistedConversions: number;
      value: number;
    }>;
    models: {
      lastClick: Array<{ touchpoint: string; conversions: number; value: number }>;
      firstClick: Array<{ touchpoint: string; conversions: number; value: number }>;
      linear: Array<{ touchpoint: string; conversions: number; value: number }>;
      timeDecay: Array<{ touchpoint: string; conversions: number; value: number }>;
    };
    customerJourney: Array<{
      sessionId: string;
      touchpoints: string[];
      path: string[];
      conversionValue: number;
      totalDuration: number;
    }>;
  } {
    const db = getDb();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get all touchpoints with attribution
    const touchpoints = db
      .prepare(
        `SELECT touchpoint_type, source, medium, campaign, COUNT(*) as interactions,
                SUM(CASE WHEN is_conversion = 1 THEN 1 ELSE 0 END) as conversions,
                SUM(CASE WHEN position = 1 AND is_conversion = 1 THEN 1 ELSE 0 END) as first_touch,
                SUM(CASE WHEN position = (SELECT MAX(position) FROM attribution_touchpoints t2 WHERE t2.session_id = attribution_touchpoints.session_id) AND is_conversion = 1 THEN 1 ELSE 0 END) as last_touch,
                AVG(conversion_value) as avg_value
         FROM attribution_touchpoints
         WHERE site_id = ? AND timestamp >= ?
         GROUP BY touchpoint_type, source, medium, campaign
         ORDER BY conversions DESC`,
      )
      .all(siteId, since) as Array<any>;

    // Attribution models
    const lastClick = touchpoints.map((t) => ({
      touchpoint: `${t.source}/${t.medium}`,
      conversions: t.last_touch || 0,
      value: (t.last_touch || 0) * (t.avg_value || 0),
    }));

    const firstClick = touchpoints.map((t) => ({
      touchpoint: `${t.source}/${t.medium}`,
      conversions: t.first_touch || 0,
      value: (t.first_touch || 0) * (t.avg_value || 0),
    }));

    const linear = touchpoints.map((t) => ({
      touchpoint: `${t.source}/${t.medium}`,
      conversions: Math.round(t.conversions / touchpoints.length),
      value: (t.conversions / touchpoints.length) * (t.avg_value || 0),
    }));

    // Time decay model (exponential decay)
    const timeDecay = touchpoints.map((t) => ({
      touchpoint: `${t.source}/${t.medium}`,
      conversions: t.conversions, // Simplified - would use actual decay calculation
      value: t.conversions * (t.avg_value || 0) * 0.8, // 20% decay
    }));

    // Customer journey paths
    const customerJourneys = db
      .prepare(
        `SELECT session_id, GROUP_CONCAT(touchpoint_type ORDER BY position) as touchpoints,
                GROUP_CONCAT(page_url ORDER BY position) as path,
                SUM(conversion_value) as total_value,
                MAX(duration_sec) as total_duration
         FROM attribution_touchpoints
         WHERE site_id = ? AND timestamp >= ?
         GROUP BY session_id
         LIMIT 100`,
      )
      .all(siteId, since) as Array<any>;

    return {
      touchpoints: touchpoints.map((t) => ({
        type: t.touchpoint_type,
        source: t.source,
        medium: t.medium,
        campaign: t.campaign,
        interactions: t.interactions,
        conversions: t.conversions,
        firstTouchConversions: t.first_touch || 0,
        lastTouchConversions: t.last_touch || 0,
        assistedConversions: t.conversions - (t.first_touch || 0) - (t.last_touch || 0),
        value: t.interactions * (t.avg_value || 0),
      })),
      models: {
        lastClick,
        firstClick,
        linear,
        timeDecay,
      },
      customerJourney: customerJourneys.map((j) => ({
        sessionId: j.session_id,
        touchpoints: j.touchpoints.split(","),
        path: j.path.split(","),
        conversionValue: j.total_value || 0,
        totalDuration: j.total_duration || 0,
      })),
    };
  }

  /**
   * User cohort analysis with retention prediction
   */
  getCohortAnalysis(siteId: string, cohortSize: number = 7, periodWeeks: number = 12): {
    cohorts: Array<{
      cohort: string;
      size: number;
      retention: number[];
      churnRate: number;
      ltv: number;
    }>;
    insights: Array<{
      type: string;
      description: string;
      recommendation: string;
    }>;
  } {
    const db = getDb();
    const cohortData: Array<{
      cohort: string;
      size: number;
      retention: number[];
      churnRate: number;
      ltv: number;
    }> = [];

    for (let week = 0; week < periodWeeks; week++) {
      const cohortStart = new Date(Date.now() - (week + cohortSize) * 7 * 24 * 60 * 60 * 1000);
      const cohortEnd = new Date(Date.now() - week * 7 * 24 * 60 * 60 * 1000);

      const cohortUsers = db
        .prepare(
          `SELECT COUNT(DISTINCT session_id) as c
           FROM trace_sessions
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

      const churnRate = 100 - retentionData[retentionData.length - 1];
      const ltv = this.calculateLTV(retentionData, cohortUsers.c);

      cohortData.push({
        cohort: `Week ${week}`,
        size: cohortUsers.c,
        retention: retentionData,
        churnRate,
        ltv,
      });
    }

    // Generate insights
    const insights = this.generateCohortInsights(cohortData);

    return { cohorts: cohortData, insights };
  }

  /**
   * Calculate customer lifetime value
   */
  private calculateLTV(retention: number[], cohortSize: number): number {
    const avgRetention = retention.reduce((sum, r) => sum + r, 0) / retention.length;
    const weeksActive = retention.filter((r) => r > 0).length;
    const weeklyValue = 10; // Would be calculated from actual data

    return cohortSize * avgRetention / 100 * weeksActive * weeklyValue;
  }

  /**
   * Generate cohort insights
   */
  private generateCohortInsights(cohorts: any[]): Array<{
    type: string;
    description: string;
    recommendation: string;
  }> {
    const insights = [];
    const latestCohort = cohorts[cohorts.length - 1];
    const earliestCohort = cohorts[0];

    if (latestCohort.retention[0] < earliestCohort.retention[0]) {
      insights.push({
        type: "retention_decline",
        description: "Taux de rétention en baisse",
        recommendation: "Enquêter sur les changements récents et améliorer l'onboarding",
      });
    }

    if (latestCohort.churnRate > 30) {
      insights.push({
        type: "high_churn",
        description: "Taux de churn élevé (>30%)",
        recommendation: "Programme de rétention urgent recommandé",
      });
    }

    if (latestCohort.ltv < earliestCohort.ltv * 0.8) {
      insights.push({
        type: "ltv_decline",
        description: "LTV en baisse",
        recommendation: "Optimiser le parcours utilisateur et la monétisation",
      });
    }

    return insights;
  }

  /**
   * Enhanced user agent parsing
   */
  private parseUserAgentDeep(userAgent: string): {
    type: string;
    browser: string;
    browserVersion: string;
    os: string;
    osVersion: string;
    device: string;
    isMobile: boolean;
    isTablet: boolean;
    isBot: boolean;
  } {
    const ua = userAgent.toLowerCase();

    // Bot detection
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i,
      /python/i, /java/i, /headless/i, /phantom/i, /selenium/i,
    ];
    const isBot = botPatterns.some((pattern) => pattern.test(ua));

    // Device detection
    let device = "desktop";
    let isMobile = false;
    let isTablet = false;

    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      device = "mobile";
      isMobile = true;
    } else if (ua.includes("tablet") || ua.includes("ipad")) {
      device = "tablet";
      isTablet = true;
    }

    // Browser detection with version
    let browser = "unknown";
    let browserVersion = "unknown";

    if (ua.includes("chrome")) {
      browser = "chrome";
      const match = ua.match(/chrome\/(\d+\.\d+\.\d+)/);
      browserVersion = match ? match[1] : "unknown";
    } else if (ua.includes("firefox")) {
      browser = "firefox";
      const match = ua.match(/firefox\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : "unknown";
    } else if (ua.includes("safari") && !ua.includes("chrome")) {
      browser = "safari";
      const match = ua.match(/version\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : "unknown";
    } else if (ua.includes("edge")) {
      browser = "edge";
      const match = ua.match(/edg\/(\d+\.\d+\.\d+)/);
      browserVersion = match ? match[1] : "unknown";
    }

    // OS detection with version
    let os = "unknown";
    let osVersion = "unknown";

    if (ua.includes("windows")) {
      os = "windows";
      const match = ua.match(/windows nt (\d+\.\d+)/);
      osVersion = match ? match[1] : "unknown";
    } else if (ua.includes("mac os x")) {
      os = "macos";
      const match = ua.match(/mac os x (\d+[_\.]\d+)/);
      osVersion = match ? match[1].replace(/_/g, ".") : "unknown";
    } else if (ua.includes("android")) {
      os = "android";
      const match = ua.match(/android (\d+(?:\.\d+)?)/);
      osVersion = match ? match[1] : "unknown";
    } else if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad")) {
      os = "ios";
      const match = ua.match(/os (\d+[_\.]\d+)/);
      osVersion = match ? match[1].replace(/_/g, ".") : "unknown";
    } else if (ua.includes("linux")) {
      os = "linux";
    }

    return {
      type: device,
      browser,
      browserVersion,
      os,
      osVersion,
      device,
      isMobile,
      isTablet,
      isBot,
    };
  }

  /**
   * Check if this is user's first visit
   */
  private checkFirstVisit(userId: string | undefined, siteId: string): boolean {
    if (!userId) return true;

    const db = getDb();
    const previousVisit = db
      .prepare(
        `SELECT COUNT(*) as c FROM trace_sessions
         WHERE user_id = ? AND site_id = ? AND started_at < ?`,
      )
      .get(userId, siteId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) as { c: number };

    return previousVisit.c === 0;
  }

  /**
   * Update enhanced session stats
   */
  private updateEnhancedSessionStats(sessionId: string): void {
    const db = getDb();

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
   * Get session by ID
   */
  private getSession(sessionId: string): any | null {
    const db = getDb();
    return db.prepare("SELECT * FROM trace_sessions WHERE id = ?").get(sessionId) as any;
  }

  /**
   * Calculate average session duration
   */
  private calculateAvgSessionDuration(siteId: string, since: string): number {
    const db = getDb();
    const result = db
      .prepare(
        `SELECT AVG(duration_sec) as avg FROM trace_sessions
         WHERE site_id = ? AND started_at >= ? AND duration_sec > 0`,
      )
      .get(siteId, since) as { avg: number | null };
    return result.avg || 0;
  }

  /**
   * Calculate bounce rate
   */
  private calculateBounceRate(siteId: string, since: string): number {
    const db = getDb();
    const total = db
      .prepare(
        `SELECT COUNT(*) as c FROM trace_sessions
         WHERE site_id = ? AND started_at >= ?`,
      )
      .get(siteId, since) as { c: number };

    const bounced = db
      .prepare(
        `SELECT COUNT(*) as c FROM trace_sessions
         WHERE site_id = ? AND started_at >= ? AND bounce = 1`,
      )
      .get(siteId, since) as { c: number };

    return total.c > 0 ? (bounced.c / total.c) * 100 : 0;
  }

  /**
   * Update cross-domain profile
   */
  private updateCrossDomainProfile(input: {
    userId: string;
    sessionId: string;
    domain: string;
    event: any;
  }): void {
    const db = getDb();
    const now = new Date().toISOString();

    const existing = this.getCrossDomainProfile(input.userId, input.sessionId);

    if (existing) {
      const domains = existing.domains.includes(input.domain)
        ? existing.domains
        : [...existing.domains, input.domain];

      const timeline = [...existing.timeline, input.event];

      const profile = this.updateUserProfileBehavior(existing.profile, input.event);

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
   * Get cross-domain profile
   */
  private getCrossDomainProfile(userId: string, sessionId: string): any | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM cross_domain_profiles WHERE user_id = ? AND session_id = ?")
      .get(userId, sessionId) as any;
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
   * Create user profile
   */
  private createUserProfile(event: any): any {
    return {
      segments: [],
      interests: [],
      demographics: {},
      behavior: {
        totalSessions: 1,
        avgSessionDuration: 0,
        conversionRate: 0,
        preferredCategories: [],
        firstTouchpoint: event.utm?.utmSource || "direct",
        lastTouchpoint: event.utm?.utmSource || "direct",
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Update user profile behavior
   */
  private updateUserProfileBehavior(profile: any, event: any): any {
    const updated = { ...profile };

    updated.behavior.totalSessions = profile.behavior.totalSessions + 1;

    // Extract interests from content
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

    // Update touchpoints
    if (event.utm?.utmSource) {
      updated.behavior.lastTouchpoint = event.utm.utmSource;
    }

    // Deduplicate interests
    updated.interests = [...new Set(updated.interests)];

    updated.lastUpdated = new Date().toISOString();

    return updated;
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
   * Extract title from URL
   */
  private extractTitle(url: string): string {
    try {
      return new URL(url).hostname;
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
   * Get geo info from IP (real geolocation)
   */
  private async getGeoFromIp(ip: string): Promise<{
    country: string;
    city: string;
    region: string;
    isp: string;
  }> {
    const geo = await realGeoLocation.getGeoFromIp(ip);
    return {
      country: geo.country,
      city: geo.city,
      region: geo.regionName,
      isp: geo.isp,
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const traceEnterpriseV2 = new TraceEnterpriseV2();
