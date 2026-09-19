/**
 * Ayeba Radar Enterprise - Advanced SEO & Indexing
 * Search engine optimization with real-time indexing and inspection
 */

import { getDb } from "@/lib/storage/database";
import type {
  RadarInspectResult,
  RadarOverview,
  RadarQueryRow,
  RadarPageRow,
  RadarAlert,
} from "./types";

export class RadarEnterprise {
  /**
   * Get comprehensive SEO overview for site
   */
  getOverview(siteId: string, domain: string): RadarOverview {
    const db = getDb();
    const now = new Date();
    const day7ago = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Indexed pages count
    const indexedPages = db
      .prepare(
        `SELECT COUNT(*) as c FROM radar_url_inspection
         WHERE site_id = ? AND indexed = 1`,
      )
      .get(siteId) as { c: number };

    // Submitted URLs count
    const submittedUrls = db
      .prepare(
        `SELECT COUNT(*) as c FROM studio_site_urls
         WHERE site_id = ?`,
      )
      .get(siteId) as { c: number };

    // Coverage percentage
    const coveragePct = submittedUrls.c > 0 ? Math.round((indexedPages.c / submittedUrls.c) * 100) : 0;

    // Clicks and impressions from radar_daily
    const stats = db
      .prepare(
        `SELECT SUM(clicks) as clicks, SUM(impressions) as impressions,
                SUM(position_sum) / SUM(position_count) as avg_pos
         FROM radar_daily
         WHERE domain = ? AND day >= ?`,
      )
      .get(domain, day7ago) as {
      clicks: number | null;
      impressions: number | null;
      avg_pos: number | null;
    };

    const clicks7d = stats.clicks || 0;
    const impressions7d = stats.impressions || 0;
    const ctr7d = impressions7d > 0 ? Math.round((clicks7d / impressions7d) * 1000) / 10 : 0;
    const avgPosition7d = stats.avg_pos || null;

    // Queue status
    const queuePending = db
      .prepare(
        `SELECT COUNT(*) as c FROM crawl_queue
         WHERE status = 'pending'`,
      )
      .get() as { c: number };

    const queueFailed = db
      .prepare(
        `SELECT COUNT(*) as c FROM crawl_queue
         WHERE status = 'failed'`,
      )
      .get() as { c: number };

    // Generate alerts
    const alerts = this.generateAlerts({
      indexedPages: indexedPages.c,
      submittedUrls: submittedUrls.c,
      coveragePct,
      clicks7d,
      impressions7d,
      queuePending: queuePending.c,
      queueFailed: queueFailed.c,
    });

    // Generate next action
    const nextAction = this.generateNextAction(alerts, coveragePct);

    return {
      domain,
      indexedPages: indexedPages.c,
      submittedUrls: submittedUrls.c,
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

  /**
   * Inspect specific URL
   */
  inspectUrl(siteId: string, url: string): RadarInspectResult {
    const db = getDb();
    const now = new Date();
    const day30ago = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Check if indexed
    const inspection = db
      .prepare(
        `SELECT * FROM radar_url_inspection
         WHERE site_id = ? AND url = ?`,
      )
      .get(siteId, url) as any;

    const indexed = inspection ? inspection.indexed === 1 : false;

    // Get click stats
    const stats = db
      .prepare(
        `SELECT SUM(clicks) as clicks, SUM(impressions) as impressions
         FROM radar_daily
         WHERE url = ? AND day >= ?`,
      )
      .get(url, day30ago) as {
      clicks: number | null;
      impressions: number | null;
    };

    // Check queue status
    const queueItem = db
      .prepare(
        `SELECT * FROM crawl_queue
         WHERE url = ?`,
      )
      .get(url) as any;

    const inQueue = !!queueItem;
    const queueStatus = queueItem ? queueItem.status : null;

    return {
      url,
      indexed,
      title: inspection?.title || null,
      snippet: inspection?.snippet || null,
      domain: inspection?.domain || null,
      crawledAt: inspection?.crawled_at || null,
      inQueue,
      queueStatus,
      clicks30d: stats.clicks || 0,
      impressions30d: stats.impressions || 0,
    };
  }

  /**
   * Submit URL for indexing
   */
  submitUrl(siteId: string, url: string): { success: boolean; message: string } {
    const db = getDb();
    const now = new Date().toISOString();

    try {
      // Check if already submitted
      const existing = db
        .prepare(
          `SELECT * FROM studio_site_urls
           WHERE site_id = ? AND url = ?`,
        )
        .get(siteId, url);

      if (existing) {
        return { success: false, message: "URL already submitted" };
      }

      // Add to submitted URLs
      db.prepare(
        `INSERT INTO studio_site_urls (site_id, url, source, submitted_at)
         VALUES (?, ?, 'manual', ?)`,
      ).run(siteId, url, now);

      // Add to crawl queue
      db.prepare(
        `INSERT INTO crawl_queue (url, priority, status, scheduled_at, created_at)
         VALUES (?, 10, 'pending', ?, ?)`,
      ).run(url, now, now);

      return { success: true, message: "URL submitted for indexing" };
    } catch (error) {
      return { success: false, message: "Failed to submit URL" };
    }
  }

  /**
   * Submit sitemap
   */
  submitSitemap(siteId: string, sitemapUrl: string): {
    success: boolean;
    message: string;
    urlsFound?: number;
  } {
    const db = getDb();
    const now = new Date().toISOString();

    try {
      // Update site sitemap URL
      db.prepare(
        `UPDATE studio_sites SET sitemap_url = ? WHERE id = ?`,
      ).run(sitemapUrl, siteId);

      // In production, fetch and parse sitemap, then submit URLs
      // For now, return success
      return {
        success: true,
        message: "Sitemap submitted successfully",
        urlsFound: 0,
      };
    } catch (error) {
      return { success: false, message: "Failed to submit sitemap" };
    }
  }

  /**
   * Get top queries for site
   */
  getTopQueries(siteId: string, domain: string, days: number = 28, limit: number = 50): RadarQueryRow[] {
    const db = getDb();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const rows = db
      .prepare(
        `SELECT query, SUM(clicks) as clicks, SUM(impressions) as impressions,
                SUM(position_sum) / SUM(position_count) as avg_pos
         FROM radar_daily
         WHERE domain = ? AND day >= ? AND query != ''
         GROUP BY query
         ORDER BY clicks DESC
         LIMIT ?`,
      )
      .all(domain, since, limit) as Array<{
      query: string;
      clicks: number;
      impressions: number;
      avg_pos: number | null;
    }>;

    return rows.map((row) => ({
      query: row.query,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.impressions > 0 ? Math.round((row.clicks / row.impressions) * 1000) / 10 : 0,
      avgPosition: row.avg_pos,
    }));
  }

  /**
   * Get top pages for site
   */
  getTopPages(siteId: string, domain: string, days: number = 28, limit: number = 50): RadarPageRow[] {
    const db = getDb();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const rows = db
      .prepare(
        `SELECT url, SUM(clicks) as clicks, SUM(impressions) as impressions
         FROM radar_daily
         WHERE domain = ? AND day >= ? AND url != ''
         GROUP BY url
         ORDER BY clicks DESC
         LIMIT ?`,
      )
      .all(domain, since, limit) as Array<{
      url: string;
      clicks: number;
      impressions: number;
    }>;

    return rows.map((row) => {
      const inspection = db
        .prepare(
          `SELECT title, indexed, crawled_at FROM radar_url_inspection
           WHERE site_id = ? AND url = ?`,
        )
        .get(siteId, row.url) as any;

      return {
        url: row.url,
        title: inspection?.title || row.url,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.impressions > 0 ? Math.round((row.clicks / row.impressions) * 1000) / 10 : 0,
        indexed: inspection ? inspection.indexed === 1 : false,
        crawledAt: inspection?.crawled_at || null,
      };
    });
  }

  /**
   * Get crawl statistics
   */
  getCrawlStats(siteId: string): {
    totalIndexed: number;
    totalSubmitted: number;
    pendingIndexing: number;
    lastCrawl: string | null;
    crawlErrors: number;
  } {
    const db = getDb();

    const totalIndexed = db
      .prepare(
        `SELECT COUNT(*) as c FROM radar_url_inspection
         WHERE site_id = ? AND indexed = 1`,
      )
      .get(siteId) as { c: number };

    const totalSubmitted = db
      .prepare(
        `SELECT COUNT(*) as c FROM studio_site_urls
         WHERE site_id = ?`,
      )
      .get(siteId) as { c: number };

    const pendingIndexing = totalSubmitted.c - totalIndexed.c;

    const lastCrawl = db
      .prepare(
        `SELECT MAX(crawled_at) as last FROM radar_url_inspection
         WHERE site_id = ?`,
      )
      .get(siteId) as { last: string | null };

    const crawlErrors = db
      .prepare(
        `SELECT COUNT(*) as c FROM crawl_queue
         WHERE status = 'failed'`,
      )
      .get() as { c: number };

    return {
      totalIndexed: totalIndexed.c,
      totalSubmitted: totalSubmitted.c,
      pendingIndexing,
      lastCrawl: lastCrawl.last,
      crawlErrors: crawlErrors.c,
    };
  }

  /**
   * Request recrawl of specific URL
   */
  requestRecrawl(siteId: string, url: string): { success: boolean; message: string } {
    const db = getDb();
    const now = new Date().toISOString();

    try {
      // Check if URL exists
      const existing = db
        .prepare(
          `SELECT * FROM radar_url_inspection
           WHERE site_id = ? AND url = ?`,
        )
        .get(siteId, url);

      if (!existing) {
        return { success: false, message: "URL not found in index" };
      }

      // Add to crawl queue with high priority
      db.prepare(
        `INSERT INTO crawl_queue (url, priority, status, scheduled_at, created_at)
         VALUES (?, 20, 'pending', ?, ?)`,
      ).run(url, now, now);

      return { success: true, message: "Recrawl requested successfully" };
    } catch (error) {
      return { success: false, message: "Failed to request recrawl" };
    }
  }

  /**
   * Generate SEO alerts
   */
  private generateAlerts(metrics: {
    indexedPages: number;
    submittedUrls: number;
    coveragePct: number;
    clicks7d: number;
    impressions7d: number;
    queuePending: number;
    queueFailed: number;
  }): RadarAlert[] {
    const alerts: RadarAlert[] = [];

    // Low coverage alert
    if (metrics.coveragePct < 50 && metrics.submittedUrls > 10) {
      alerts.push({
        id: this.generateId(),
        severity: "warn",
        title: "Indexation faible",
        detail: `Seulement ${metrics.coveragePct}% de vos pages sont indexées. Vérifiez votre sitemap.`,
      });
    }

    // No impressions alert
    if (metrics.impressions7d === 0 && metrics.indexedPages > 0) {
      alerts.push({
        id: this.generateId(),
        severity: "critical",
        title: "Aucune impression",
        detail: "Vos pages indexées ne reçoivent aucune impression. Vérifiez votre contenu.",
      });
    }

    // High queue pending
    if (metrics.queuePending > 100) {
      alerts.push({
        id: this.generateId(),
        severity: "info",
        title: "File d'attente importante",
        detail: `${metrics.queuePending} URLs en attente d'indexation.`,
      });
    }

    // Crawl errors
    if (metrics.queueFailed > 10) {
      alerts.push({
        id: this.generateId(),
        severity: "warn",
        title: "Erreurs d'exploration",
        detail: `${metrics.queueFailed} URLs ont échoué lors de l'exploration.`,
      });
    }

    // Low CTR
    if (metrics.impressions7d > 100 && metrics.clicks7d / metrics.impressions7d < 0.01) {
      alerts.push({
        id: this.generateId(),
        severity: "info",
        title: "CTR faible",
        detail: "Votre taux de clic est inférieur à 1%. Améliorez vos titres et descriptions.",
      });
    }

    return alerts;
  }

  /**
   * Generate next action recommendation
   */
  private generateNextAction(alerts: RadarAlert[], coveragePct: number): {
    title: string;
    detail: string;
    href?: string;
  } {
    const criticalAlerts = alerts.filter((a) => a.severity === "critical");
    const warnAlerts = alerts.filter((a) => a.severity === "warn");

    if (criticalAlerts.length > 0) {
      return {
        title: "Résoudre les problèmes critiques",
        detail: criticalAlerts[0].detail,
        href: "/studio/radar/issues",
      };
    }

    if (warnAlerts.length > 0) {
      return {
        title: "Améliorer l'indexation",
        detail: warnAlerts[0].detail,
        href: "/studio/radar/coverage",
      };
    }

    if (coveragePct < 80) {
      return {
        title: "Soumettre plus d'URLs",
        detail: "Augmentez votre couverture d'indexation en soumettant votre sitemap.",
        href: "/studio/radar/sitemaps",
      };
    }

    return {
      title: "Surveiller les performances",
      detail: "Votre indexation est bonne. Continuez à surveiller vos performances.",
      href: "/studio/radar/performance",
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const radarEnterprise = new RadarEnterprise();
