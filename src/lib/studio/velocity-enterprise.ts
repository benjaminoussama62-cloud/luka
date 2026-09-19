/**
 * Ayeba Velocity Enterprise - Performance Monitoring & Audits
 * Real-time performance analysis with actionable recommendations
 */

import { getDb } from "@/lib/storage/database";
import type {
  VelocityAudit,
  VelocityFinding,
  VelocityOverview,
} from "./types";

export class VelocityEnterprise {
  /**
   * Get performance overview for site
   */
  getOverview(siteId: string): VelocityOverview {
    const db = getDb();

    // Get latest audit
    const latest = db
      .prepare(
        `SELECT * FROM velocity_metrics_detailed
         WHERE site_id = ?
         ORDER BY timestamp DESC
         LIMIT 1`,
      )
      .get(siteId) as VelocityAudit | undefined;

    // Get recent audits
    const audits = db
      .prepare(
        `SELECT * FROM velocity_metrics_detailed
         WHERE site_id = ?
         ORDER BY timestamp DESC
         LIMIT 10`,
      )
      .all(siteId) as VelocityAudit[];

    // Generate action plan from latest audit
    const actionPlan = latest ? this.generateActionPlan(latest) : [];

    return {
      domain: "", // Will be filled from site data
      latestScore: latest?.overall_score || null,
      latestTtfbMs: latest?.metrics ? JSON.parse(latest.metrics as string).ttfb_ms || null : null,
      audits,
      actionPlan,
    };
  }

  /**
   * Run performance audit on URL
   */
  async runAudit(siteId: string, url: string): Promise<VelocityAudit> {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    // Simulate performance metrics (in production, use real measurement)
    const metrics = await this.measurePerformance(url);

    // Calculate scores
    const performanceScore = this.calculatePerformanceScore(metrics);
    const accessibilityScore = this.calculateAccessibilityScore(metrics);
    const bestPracticesScore = this.calculateBestPracticesScore(metrics);
    const seoScore = this.calculateSeoScore(metrics);

    const overallScore = Math.round(
      (performanceScore + accessibilityScore + bestPracticesScore + seoScore) / 4,
    );

    // Generate findings
    const findings = this.generateFindings(metrics, overallScore);

    // Store audit
    db.prepare(
      `INSERT INTO velocity_metrics_detailed (
        id, site_id, url, timestamp, overall_score, performance_score,
        accessibility_score, best_practices_score, seo_score, metrics,
        opportunities, diagnostics, passed_audits, failed_audits, warnings,
        total_size_bytes, resource_count, dom_size, cpu_time_ms,
        script_execution_time_ms, rendering_time_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      siteId,
      url,
      now,
      overallScore,
      performanceScore,
      accessibilityScore,
      bestPracticesScore,
      seoScore,
      JSON.stringify(metrics),
      JSON.stringify(findings.filter((f) => f.severity === "info")),
      JSON.stringify(findings.filter((f) => f.severity === "warn" || f.severity === "critical")),
      findings.filter((f) => f.severity === "info").length,
      findings.filter((f) => f.severity === "critical").length,
      findings.filter((f) => f.severity === "warn").length,
      metrics.totalSizeBytes || 0,
      metrics.resourceCount || 0,
      metrics.domSize || 0,
      metrics.cpuTimeMs || 0,
      metrics.scriptExecutionTimeMs || 0,
      metrics.renderingTimeMs || 0,
    );

    return this.getAudit(id);
  }

  /**
   * Get audit by ID
   */
  getAudit(id: string): VelocityAudit | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM velocity_metrics_detailed WHERE id = ?")
      .get(id) as VelocityAudit | undefined;
    if (!row) return null;

    return {
      ...row,
      metrics: JSON.parse(row.metrics as string),
      findings: [
        ...JSON.parse(row.opportunities as string),
        ...JSON.parse(row.diagnostics as string),
      ],
    };
  }

  /**
   * Get audits for site
   */
  getSiteAudits(siteId: string, limit: number = 20): VelocityAudit[] {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT * FROM velocity_metrics_detailed
         WHERE site_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`,
      )
      .all(siteId, limit) as VelocityAudit[];

    return rows.map((row) => ({
      ...row,
      metrics: JSON.parse(row.metrics as string),
      findings: [
        ...JSON.parse(row.opportunities as string),
        ...JSON.parse(row.diagnostics as string),
      ],
    }));
  }

  /**
   * Measure performance (simulated - in production use real measurement)
   */
  private async measurePerformance(url: string): Promise<any> {
    // Simulate performance metrics
    // In production, use tools like Lighthouse, WebPageTest, or custom measurement
    return {
      ttfbMs: Math.floor(Math.random() * 500) + 100,
      firstContentfulPaintMs: Math.floor(Math.random() * 1000) + 500,
      firstMeaningfulPaintMs: Math.floor(Math.random() * 1500) + 1000,
      largestContentfulPaintMs: Math.floor(Math.random() * 2500) + 1500,
      firstInputDelayMs: Math.floor(Math.random() * 100),
      cumulativeLayoutShiftMs: Math.random() * 0.25,
      totalBlockingTimeMs: Math.floor(Math.random() * 300),
      timeToInteractiveMs: Math.floor(Math.random() * 3000) + 2000,
      speedIndexMs: Math.floor(Math.random() * 3500) + 2500,
      totalSizeBytes: Math.floor(Math.random() * 2000000) + 500000,
      resourceCount: Math.floor(Math.random() * 50) + 10,
      domSize: Math.floor(Math.random() * 1500) + 500,
      cpuTimeMs: Math.floor(Math.random() * 500) + 100,
      scriptExecutionTimeMs: Math.floor(Math.random() * 800) + 200,
      renderingTimeMs: Math.floor(Math.random() * 600) + 150,
      httpRequests: Math.floor(Math.random() * 30) + 5,
      httpsRequests: Math.floor(Math.random() * 25) + 5,
      imageCount: Math.floor(Math.random() * 15) + 3,
      scriptCount: Math.floor(Math.random() * 10) + 2,
      cssCount: Math.floor(Math.random() * 5) + 1,
      fontCount: Math.floor(Math.random() * 3) + 1,
      compressedResources: Math.floor(Math.random() * 20) + 5,
      uncompressedResources: Math.floor(Math.random() * 10) + 2,
      cachedResources: Math.floor(Math.random() * 15) + 3,
      uncachedResources: Math.floor(Math.random() * 15) + 3,
    };
  }

  /**
   * Calculate performance score (0-100)
   */
  private calculatePerformanceScore(metrics: any): number {
    let score = 100;

    // TTFB penalty
    if (metrics.ttfbMs > 600) score -= 20;
    else if (metrics.ttfbMs > 400) score -= 10;
    else if (metrics.ttfbMs > 200) score -= 5;

    // LCP penalty
    if (metrics.largestContentfulPaintMs > 4000) score -= 25;
    else if (metrics.largestContentfulPaintMs > 2500) score -= 15;
    else if (metrics.largestContentfulPaintMs > 1800) score -= 5;

    // FID penalty
    if (metrics.firstInputDelayMs > 300) score -= 20;
    else if (metrics.firstInputDelayMs > 100) score -= 10;

    // CLS penalty
    if (metrics.cumulativeLayoutShiftMs > 0.25) score -= 25;
    else if (metrics.cumulativeLayoutShiftMs > 0.1) score -= 10;

    // TBT penalty
    if (metrics.totalBlockingTimeMs > 600) score -= 15;
    else if (metrics.totalBlockingTimeMs > 300) score -= 8;

    return Math.max(0, score);
  }

  /**
   * Calculate accessibility score (0-100)
   */
  private calculateAccessibilityScore(metrics: any): number {
    let score = 100;

    // Simplified accessibility checks
    // In production, use axe-core or similar
    if (metrics.altTextMissing > 0) score -= 10;
    if (metrics.formLabelsMissing > 0) score -= 15;
    if (metrics.colorContrastPoor > 0) score -= 20;
    if (metrics.ariaMissing > 0) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Calculate best practices score (0-100)
   */
  private calculateBestPracticesScore(metrics: any): number {
    let score = 100;

    // HTTPS check
    if (!metrics.httpsEnabled) score -= 30;

    // HTTP/2 check
    if (!metrics.http2Enabled) score -= 10;

    // Compression check
    if (metrics.uncompressedResources > 5) score -= 15;

    // Image optimization
    if (metrics.unoptimizedImages > 5) score -= 15;

    // Caching
    if (metrics.uncachedResources > 10) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Calculate SEO score (0-100)
   */
  private calculateSeoScore(metrics: any): number {
    let score = 100;

    // Meta description
    if (!metrics.metaDescription) score -= 15;

    // Title tag
    if (!metrics.title || metrics.title.length < 30) score -= 10;

    // Heading structure
    if (!metrics.h1Present) score -= 20;
    if (metrics.headingStructurePoor) score -= 10;

    // Robots.txt
    if (!metrics.robotsTxtValid) score -= 10;

    // Sitemap
    if (!metrics.sitemapValid) score -= 10;

    // Mobile friendly
    if (!metrics.mobileFriendly) score -= 20;

    return Math.max(0, score);
  }

  /**
   * Generate performance findings
   */
  private generateFindings(metrics: any, overallScore: number): VelocityFinding[] {
    const findings: VelocityFinding[] = [];

    // Critical findings
    if (metrics.ttfbMs > 600) {
      findings.push({
        id: this.generateId(),
        severity: "critical",
        title: "TTFB élevé",
        detail: `Le temps jusqu'au premier octet est de ${metrics.ttfbMs}ms. Idéalement < 200ms.`,
        savingsMs: metrics.ttfbMs - 200,
      });
    }

    if (metrics.largestContentfulPaintMs > 4000) {
      findings.push({
        id: this.generateId(),
        severity: "critical",
        title: "LCP lent",
        detail: `Le Largest Contentful Paint est de ${metrics.largestContentfulPaintMs}ms. Idéalement < 2500ms.`,
        savingsMs: metrics.largestContentfulPaintMs - 2500,
      });
    }

    if (metrics.cumulativeLayoutShiftMs > 0.25) {
      findings.push({
        id: this.generateId(),
        severity: "critical",
        title: "CLS élevé",
        detail: `Le Cumulative Layout Shift est de ${metrics.cumulativeLayoutShiftMs}. Idéalement < 0.1.`,
      });
    }

    // Warning findings
    if (metrics.firstInputDelayMs > 100) {
      findings.push({
        id: this.generateId(),
        severity: "warn",
        title: "FID détecté",
        detail: `Le First Input Delay est de ${metrics.firstInputDelayMs}ms. Idéalement < 100ms.`,
      });
    }

    if (metrics.totalSizeBytes > 1500000) {
      findings.push({
        id: this.generateId(),
        severity: "warn",
        title: "Page lourde",
        detail: `La page fait ${(metrics.totalSizeBytes / 1024 / 1024).toFixed(2)}MB. Idéalement < 1MB.`,
      });
    }

    if (metrics.scriptCount > 10) {
      findings.push({
        id: this.generateId(),
        severity: "warn",
        title: "Trop de scripts",
        detail: `${metrics.scriptCount} scripts détectés. Considérez le bundling.`,
      });
    }

    if (metrics.uncompressedResources > 5) {
      findings.push({
        id: this.generateId(),
        severity: "warn",
        title: "Ressources non compressées",
        detail: `${metrics.uncompressedResources} ressources ne sont pas compressées.`,
      });
    }

    // Info findings
    if (metrics.unoptimizedImages > 3) {
      findings.push({
        id: this.generateId(),
        severity: "info",
        title: "Images non optimisées",
        detail: `${metrics.unoptimizedImages} images peuvent être optimisées.`,
      });
    }

    if (metrics.uncachedResources > 5) {
      findings.push({
        id: this.generateId(),
        severity: "info",
        title: "Cache manquant",
        detail: `${metrics.uncachedResources} ressources n'ont pas de cache configuré.`,
      });
    }

    if (metrics.httpRequests > 25) {
      findings.push({
        id: this.generateId(),
        severity: "info",
        title: "Trop de requêtes HTTP",
        detail: `${metrics.httpRequests} requêtes HTTP. Considérez la réduction.`,
      });
    }

    return findings;
  }

  /**
   * Generate action plan from audit
   */
  private generateActionPlan(audit: VelocityAudit): VelocityFinding[] {
    const findings = audit.findings || [];
    const critical = findings.filter((f) => f.severity === "critical");
    const warnings = findings.filter((f) => f.severity === "warn");

    // Prioritize by potential impact
    const actionPlan = [...critical, ...warnings]
      .sort((a, b) => (b.savingsMs || 0) - (a.savingsMs || 0))
      .slice(0, 5);

    return actionPlan;
  }

  /**
   * Get performance trends for site
   */
  getPerformanceTrends(siteId: string, days: number = 30): {
    date: string;
    score: number;
    ttfbMs: number;
    lcpMs: number;
  }[] {
    const db = getDb();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const rows = db
      .prepare(
        `SELECT
           DATE(timestamp) as date,
           AVG(overall_score) as score,
           AVG(JSON_EXTRACT(metrics, '$.ttfb_ms')) as ttfb_ms,
           AVG(JSON_EXTRACT(metrics, '$.largestContentfulPaintMs')) as lcp_ms
         FROM velocity_metrics_detailed
         WHERE site_id = ? AND timestamp >= ?
         GROUP BY DATE(timestamp)
         ORDER BY date DESC`,
      )
      .all(siteId, since) as Array<{
      date: string;
      score: number;
      ttfb_ms: number;
      lcp_ms: number;
    }>;

    return rows.map((row) => ({
      date: row.date,
      score: Math.round(row.score),
      ttfbMs: Math.round(row.ttfb_ms),
      lcpMs: Math.round(row.lcp_ms),
    }));
  }

  /**
   * Compare performance with competitors
   */
  getCompetitorComparison(siteId: string): {
    yourScore: number;
    industryAverage: number;
    topPerformer: number;
    metrics: {
      ttfb: { yours: number; average: number; top: number };
      lcp: { yours: number; average: number; top: number };
      cls: { yours: number; average: number; top: number };
    };
  } {
    const latest = this.getOverview(siteId);
    const yourScore = latest.latestScore || 0;

    // Simulated industry data (in production, use real benchmarking)
    const industryAverage = 65;
    const topPerformer = 92;

    const latestAudit = latest.audits[0];
    const metrics = latestAudit?.metrics || {};

    return {
      yourScore,
      industryAverage,
      topPerformer,
      metrics: {
        ttfb: {
          yours: metrics.ttfbMs || 0,
          average: 350,
          top: 150,
        },
        lcp: {
          yours: metrics.largestContentfulPaintMs || 0,
          average: 2800,
          top: 1200,
        },
        cls: {
          yours: metrics.cumulativeLayoutShiftMs || 0,
          average: 0.15,
          top: 0.05,
        },
      },
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const velocityEnterprise = new VelocityEnterprise();
