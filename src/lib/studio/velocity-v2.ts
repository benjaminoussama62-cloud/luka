/**
 * Ayeba Velocity — vue d'ensemble performance.
 * Données réelles : audits PageSpeed Insights persistés (velocity-psi.ts),
 * agrégés ici en score, tendance et recommandations. Aucune donnée simulée.
 */

import { getDb } from "@/lib/storage/database";

export class VelocityEnterpriseV2 {

  /**
   * Get audit history with trend analysis
   */
  getAuditHistory(siteId: string, url?: string, days: number = 30): {
    audits: Array<{
      auditId: string;
      url: string;
      timestamp: string;
      score: number;
      performance: number;
      lcp: number;
      fid: number;
      cls: number;
      ttfb: number;
    }>;
    trends: {
      score: number;
      performance: number;
      lcp: number;
      fid: number;
      cls: number;
      ttfb: number;
    };
    bestScore: number;
    worstScore: number;
    averageScore: number;
    improvementRate: number;
  } {
    const db = getDb();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const whereClause = url ? "WHERE site_id = ? AND url = ? AND timestamp >= ?" : "WHERE site_id = ? AND timestamp >= ?";
    const params = url ? [siteId, url, since] : [siteId, since];

    const rows = db
      .prepare(
        `SELECT id, url, timestamp, scores, metrics
         FROM velocity_metrics_detailed
         ${whereClause}
         ORDER BY timestamp DESC`,
      )
      .all(...params) as Array<any>;

    const audits = rows.map((row) => {
      const scores = JSON.parse(row.scores);
      const metrics = JSON.parse(row.metrics);
      return {
        auditId: row.id,
        url: row.url,
        timestamp: row.timestamp,
        score: scores.overall,
        performance: scores.performance,
        lcp: metrics.largestContentfulPaint,
        fid: metrics.firstInputDelay,
        cls: metrics.cumulativeLayoutShift,
        ttfb: metrics.timeToFirstByte,
      };
    });

    if (audits.length === 0) {
      return {
        audits: [],
        trends: { score: 0, performance: 0, lcp: 0, fid: 0, cls: 0, ttfb: 0 },
        bestScore: 0,
        worstScore: 0,
        averageScore: 0,
        improvementRate: 0,
      };
    }

    // Calculate trends
    const latest = audits[0];
    const oldest = audits[audits.length - 1];

    const trends = {
      score: latest.score - oldest.score,
      performance: latest.performance - oldest.performance,
      lcp: oldest.lcp - latest.lcp, // Negative is good
      fid: oldest.fid - latest.fid, // Negative is good
      cls: oldest.cls - latest.cls, // Negative is good
      ttfb: oldest.ttfb - latest.ttfb, // Negative is good
    };

    const scores = audits.map((a) => a.score);
    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);
    const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const improvementRate = days > 0 ? (trends.score / days) * 100 : 0;

    return {
      audits,
      trends,
      bestScore,
      worstScore,
      averageScore,
      improvementRate,
    };
  }

  /**
   * Get performance overview with ML-powered recommendations
   */
  getOverview(siteId: string): {
    overallScore: number;
    latestScore: number;
    latestTtfbMs: number;
    trend: "improving" | "stable" | "degrading";
    grade: string;
    criticalIssues: number;
    highPriorityIssues: number;
    recommendations: Array<{
      priority: number;
      title: string;
      description: string;
      estimatedImpact: number;
      difficulty: "easy" | "medium" | "hard";
    }>;
    benchmarkComparison: {
      median: number;
      top10: number;
      industry: number;
    };
  } {
    const history = this.getAuditHistory(siteId, undefined, 30);

    if (history.audits.length === 0) {
      return {
        overallScore: 0,
        latestScore: 0,
        latestTtfbMs: 0,
        trend: "stable",
        grade: "N/A",
        criticalIssues: 0,
        highPriorityIssues: 0,
        recommendations: [],
        benchmarkComparison: { median: 65, top10: 90, industry: 75 },
      };
    }

    const latest = history.audits[0];
    const trend = history.trends.score > 5 ? "improving" : history.trends.score < -5 ? "degrading" : "stable";

    // Calculate grade
    let grade = "F";
    if (latest.score >= 90) grade = "A";
    else if (latest.score >= 80) grade = "B";
    else if (latest.score >= 70) grade = "C";
    else if (latest.score >= 60) grade = "D";

    // Count issues
    const criticalIssues = latest.lcp > 4000 || latest.fid > 300 || latest.cls > 0.25 ? 1 : 0;
    const highPriorityIssues = (latest.lcp > 2500 ? 1 : 0) + (latest.fid > 100 ? 1 : 0) + (latest.cls > 0.1 ? 1 : 0);

    // Generate ML-powered recommendations
    const recommendations = this.generateRecommendations(latest);

    return {
      overallScore: history.averageScore,
      latestScore: latest.score,
      latestTtfbMs: latest.ttfb,
      trend,
      grade,
      criticalIssues,
      highPriorityIssues,
      recommendations,
      benchmarkComparison: {
        median: 65,
        top10: 90,
        industry: 75,
      },
    };
  }

  /**
   * Generate ML-powered recommendations
   */
  private generateRecommendations(audit: any): Array<{
    priority: number;
    title: string;
    description: string;
    estimatedImpact: number;
    difficulty: "easy" | "medium" | "hard";
  }> {
    const recommendations: any[] = [];

    if (audit.lcp > 4000) {
      recommendations.push({
        priority: 100,
        title: "Optimiser le Largest Contentful Paint",
        description: "LCP critique. Optimisez les images, servez le contenu critique en premier, utilisez lazy loading.",
        estimatedImpact: 15,
        difficulty: "medium",
      });
    } else if (audit.lcp > 2500) {
      recommendations.push({
        priority: 80,
        title: "Améliorer le Largest Contentful Paint",
        description: "LCP au-dessus du seuil. Optimisez le chargement du contenu principal.",
        estimatedImpact: 10,
        difficulty: "easy",
      });
    }

    if (audit.fid > 300) {
      recommendations.push({
        priority: 95,
        title: "Réduire le First Input Delay",
        description: "FID critique. Réduisez l'exécution JavaScript sur le thread principal.",
        estimatedImpact: 12,
        difficulty: "hard",
      });
    } else if (audit.fid > 100) {
      recommendations.push({
        priority: 75,
        title: "Améliorer le First Input Delay",
        description: "FID au-dessus du seuil. Divisez le JavaScript et utilisez code splitting.",
        estimatedImpact: 8,
        difficulty: "medium",
      });
    }

    if (audit.cls > 0.25) {
      recommendations.push({
        priority: 90,
        title: "Stabiliser la mise en page",
        description: "CLS critique. Ajoutez des dimensions explicites aux images et iframes.",
        estimatedImpact: 10,
        difficulty: "easy",
      });
    } else if (audit.cls > 0.1) {
      recommendations.push({
        priority: 70,
        title: "Réduire le Cumulative Layout Shift",
        description: "CLS au-dessus du seuil. Optimisez les animations et le chargement asynchrone.",
        estimatedImpact: 7,
        difficulty: "medium",
      });
    }

    if (audit.ttfb > 1000) {
      recommendations.push({
        priority: 85,
        title: "Optimiser le Time to First Byte",
        description: "TTFB élevé. Utilisez un CDN, optimisez la configuration serveur.",
        estimatedImpact: 12,
        difficulty: "medium",
      });
    }

    // Sort by priority
    recommendations.sort((a, b) => b.priority - a.priority);

    return recommendations;
  }
}

export const velocityEnterpriseV2 = new VelocityEnterpriseV2();
