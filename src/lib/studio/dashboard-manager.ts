/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Ayeba Studio Dashboard Manager - Unified Dashboard
 * Central hub for navigating between all 5 services with real-time data
 */

import { getDb } from "@/lib/storage/database";
import { radarEnterprise } from "./radar-enterprise";
import { traceEnterprise } from "./trace-enterprise";
import { yieldEnterprise } from "./yield-enterprise";
import { velocityEnterprise } from "./velocity-enterprise";
import { aetherEnterprise } from "./aether-enterprise";
import type { StudioSite } from "./types";

export type DashboardWidget = {
  id: string;
  type: "metric" | "chart" | "table" | "alert" | "action";
  title: string;
  module: "radar" | "trace" | "yield" | "velocity" | "aether";
  data: any;
  config: {
    size: "small" | "medium" | "large" | "full";
    position: { row: number; col: number };
    refreshInterval?: number;
  };
  lastUpdated: string;
};

export type DashboardLayout = {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  createdAt: string;
  updatedAt: string;
};

export class DashboardManager {
  /**
   * Get comprehensive dashboard for site
   */
  async getSiteDashboard(site: StudioSite): Promise<{
    overview: any;
    widgets: DashboardWidget[];
    quickActions: Array<{
      id: string;
      label: string;
      icon: string;
      module: string;
      action: string;
      href: string;
    }>;
    alerts: Array<{
      id: string;
      severity: "critical" | "warn" | "info";
      title: string;
      message: string;
      module: string;
      action?: string;
    }>;
  }> {
    // Gather data from all services
    const radarOverview = radarEnterprise.getOverview(site.id, site.domain);
    const traceOverview = traceEnterprise.getRealTimeAnalytics(site.id, 30);
    const yieldDataOverview = yieldEnterprise.getPublisherSites(site.userId).find(s => s.id === site.id);
    const velocityOverview = velocityEnterprise.getOverview(site.id);
    const aetherOverview = await aetherEnterprise.generateOverview(site);

    // Generate widgets
    const widgets = this.generateWidgets({
      site,
      radar: radarOverview,
      trace: traceOverview,
      yield: yieldDataOverview,
      velocity: velocityOverview,
      aether: aetherOverview,
    });

    // Generate quick actions
    const quickActions = this.generateQuickActions(site);

    // Generate alerts
    const alerts = this.generateAlerts({
      site,
      radar: radarOverview,
      trace: traceOverview,
      yield: yieldDataOverview,
      velocity: velocityOverview,
    });

    return {
      overview: {
        site: {
          id: site.id,
          domain: site.domain,
          displayName: site.displayName,
          status: site.status,
        },
        health: this.calculateOverallHealth(radarOverview, traceOverview, yieldDataOverview, velocityOverview),
        summary: aetherOverview.headline,
      },
      widgets,
      quickActions,
      alerts,
    };
  }

  /**
   * Generate dashboard widgets
   */
  private generateWidgets(data: {
    site: StudioSite;
    radar: any;
    trace: any;
    yield: any;
    velocity: any;
    aether: any;
  }): DashboardWidget[] {
    const widgets: DashboardWidget[] = [];
    const now = new Date().toISOString();

    // Radar widgets
    widgets.push({
      id: this.generateId(),
      type: "metric",
      title: "Indexation",
      module: "radar",
      data: {
        value: data.radar.indexedPages,
        label: "Pages indexées",
        trend: this.calculateTrend(data.radar.indexedPages, data.radar.submittedUrls),
        secondary: `${data.radar.coveragePct}% couverture`,
      },
      config: {
        size: "small",
        position: { row: 1, col: 1 },
        refreshInterval: 300000, // 5 minutes
      },
      lastUpdated: now,
    });

    widgets.push({
      id: this.generateId(),
      type: "metric",
      title: "Impressions recherche",
      module: "radar",
      data: {
        value: data.radar.impressions7d,
        label: "7 derniers jours",
        trend: "up",
        secondary: `CTR: ${data.radar.ctr7d}%`,
      },
      config: {
        size: "small",
        position: { row: 1, col: 2 },
        refreshInterval: 300000,
      },
      lastUpdated: now,
    });

    // Trace widgets
    widgets.push({
      id: this.generateId(),
      type: "metric",
      title: "Sessions actives",
      module: "trace",
      data: {
        value: data.trace.activeUsers,
        label: "Utilisateurs en ligne",
        trend: "stable",
        secondary: `${data.trace.sessions} sessions 7j`,
      },
      config: {
        size: "small",
        position: { row: 1, col: 3 },
        refreshInterval: 60000, // 1 minute
      },
      lastUpdated: now,
    });

    widgets.push({
      id: this.generateId(),
      type: "metric",
      title: "Engagement",
      module: "trace",
      data: {
        value: Math.round(data.trace.avgSessionDuration),
        label: "Durée moyenne (sec)",
        trend: data.trace.avgSessionDuration > 60 ? "up" : "stable",
        secondary: `${data.trace.avgPagesPerSession} pages/session`,
      },
      config: {
        size: "small",
        position: { row: 1, col: 4 },
        refreshInterval: 60000,
      },
      lastUpdated: now,
    });

    // Yield widgets
    if (data.yield && data.yield.enabled) {
      widgets.push({
        id: this.generateId(),
        type: "metric",
        title: "Revenus",
        module: "yield",
        data: {
          value: data.yield.revenue30dCdf,
          label: "30 derniers jours (CDF)",
          trend: "up",
          secondary: `eCPM: ${data.yield.ecpmCdf}`,
        },
        config: {
          size: "small",
          position: { row: 2, col: 1 },
          refreshInterval: 3600000, // 1 hour
        },
        lastUpdated: now,
      });

      widgets.push({
        id: this.generateId(),
        type: "metric",
        title: "Performance pub",
        module: "yield",
        data: {
          value: data.yield.ctr30d,
          label: "CTR publicité (%)",
          trend: data.yield.ctr30d > 1 ? "up" : "stable",
          secondary: `${data.yield.impressions30d} impressions`,
        },
        config: {
          size: "small",
          position: { row: 2, col: 2 },
          refreshInterval: 3600000,
        },
        lastUpdated: now,
      });
    }

    // Velocity widgets
    if (data.velocity.latestScore) {
      widgets.push({
        id: this.generateId(),
        type: "metric",
        title: "Performance",
        module: "velocity",
        data: {
          value: data.velocity.latestScore,
          label: "Score global /100",
          trend: data.velocity.latestScore > 70 ? "up" : "stable",
          secondary: `TTFB: ${data.velocity.latestTtfbMs}ms`,
          color: this.getScoreColor(data.velocity.latestScore),
        },
        config: {
          size: "small",
          position: { row: 2, col: 3 },
          refreshInterval: 1800000, // 30 minutes
        },
        lastUpdated: now,
      });
    }

    // Aether widget (AI recommendations)
    widgets.push({
      id: this.generateId(),
      type: "action",
      title: "Recommandations IA",
      module: "aether",
      data: {
        headline: data.aether.headline,
        actions: data.aether.actions,
        priority: this.calculatePriority(data.aether.actions),
      },
      config: {
        size: "large",
        position: { row: 3, col: 1 },
        refreshInterval: 3600000, // 1 hour
      },
      lastUpdated: now,
    });

    // Chart widgets
    widgets.push({
      id: this.generateId(),
      type: "chart",
      title: "Trafic 7 jours",
      module: "trace",
      data: {
        chartType: "line",
        series: this.generateTrafficSeries(data.trace),
        labels: this.generateDateLabels(7),
      },
      config: {
        size: "medium",
        position: { row: 4, col: 1 },
        refreshInterval: 300000,
      },
      lastUpdated: now,
    });

    widgets.push({
      id: this.generateId(),
      type: "chart",
      title: "Performance recherche",
      module: "radar",
      data: {
        chartType: "bar",
        series: [
          {
            name: "Impressions",
            data: this.generateImpressionsSeries(data.radar),
          },
          {
            name: "Clics",
            data: this.generateClicksSeries(data.radar),
          },
        ],
        labels: this.generateDateLabels(7),
      },
      config: {
        size: "medium",
        position: { row: 4, col: 2 },
        refreshInterval: 300000,
      },
      lastUpdated: now,
    });

    // Table widgets
    widgets.push({
      id: this.generateId(),
      type: "table",
      title: "Top pages",
      module: "trace",
      data: {
        columns: ["Page", "Vues", "Sessions"],
        rows: data.trace.topPages.slice(0, 5).map((page: any) => [
          page.path,
          page.views,
          page.sessions,
        ]),
      },
      config: {
        size: "medium",
        position: { row: 5, col: 1 },
        refreshInterval: 300000,
      },
      lastUpdated: now,
    });

    widgets.push({
      id: this.generateId(),
      type: "table",
      title: "Top requêtes",
      module: "radar",
      data: {
        columns: ["Requête", "Clics", "Impressions", "Position"],
        rows: radarEnterprise.getTopQueries(data.site.id, data.site.domain, 7, 5).map((q: any) => [
          q.query,
          q.clicks,
          q.impressions,
          q.avgPosition?.toFixed(1) || "-",
        ]),
      },
      config: {
        size: "medium",
        position: { row: 5, col: 2 },
        refreshInterval: 300000,
      },
      lastUpdated: now,
    });

    return widgets;
  }

  /**
   * Generate quick actions
   */
  private generateQuickActions(site: StudioSite): Array<{
    id: string;
    label: string;
    icon: string;
    module: string;
    action: string;
    href: string;
  }> {
    return [
      {
        id: this.generateId(),
        label: "Inspecter URL",
        icon: "search",
        module: "radar",
        action: "inspect",
        href: `/studio/radar/${site.id}/inspect`,
      },
      {
        id: this.generateId(),
        label: "Soumettre sitemap",
        icon: "upload",
        module: "radar",
        action: "submit-sitemap",
        href: `/studio/radar/${site.id}/sitemaps`,
      },
      {
        id: this.generateId(),
        label: "Audit performance",
        icon: "speed",
        module: "velocity",
        action: "audit",
        href: `/studio/velocity/${site.id}/audit`,
      },
      {
        id: this.generateId(),
        label: "Activer monétisation",
        icon: "money",
        module: "yield",
        action: "enable",
        href: `/studio/yield/${site.id}/settings`,
      },
      {
        id: this.generateId(),
        label: "Voir sessions en direct",
        icon: "users",
        module: "trace",
        action: "live-sessions",
        href: `/studio/trace/${site.id}/live`,
      },
      {
        id: this.generateId(),
        label: "Gérer audience",
        icon: "target",
        module: "yield",
        action: "audience",
        href: `/studio/yield/${site.id}/audience`,
      },
    ];
  }

  /**
   * Generate alerts from all services
   */
  private generateAlerts(data: {
    site: { id: string };
    radar: any;
    trace: any;
    yield: any;
    velocity: any;
  }): Array<{
    id: string;
    severity: "critical" | "warn" | "info";
    title: string;
    message: string;
    module: string;
    action?: string;
  }> {
    const alerts: any[] = [];

    // Radar alerts
    data.radar.alerts.forEach((alert: any) => {
      alerts.push({
        id: this.generateId(),
        severity: alert.severity,
        title: alert.title,
        message: alert.detail,
        module: "radar",
        action: data.radar.nextAction.href,
      });
    });

    // Trace alerts
    if (data.trace.activeUsers === 0 && data.trace.pageviews > 0) {
      alerts.push({
        id: this.generateId(),
        severity: "warn",
        title: "Aucun utilisateur actif",
        message: "Pas d'utilisateurs en ligne actuellement",
        module: "trace",
      });
    }

    if (data.trace.avgSessionDuration < 30 && data.trace.pageviews > 50) {
      alerts.push({
        id: this.generateId(),
        severity: "info",
        title: "Engagement faible",
        message: "Durée moyenne de session inférieure à 30 secondes",
        module: "trace",
      });
    }

    // Velocity alerts
    if (data.velocity.latestScore && data.velocity.latestScore < 50) {
      alerts.push({
        id: this.generateId(),
        severity: "warn",
        title: "Performance moyenne",
        message: `Score performance: ${data.velocity.latestScore}/100`,
        module: "velocity",
        action: `/studio/velocity/${data.site.id}/audit`,
      });
    }

    // Yield alerts
    if (data.yield && !data.yield.enabled && data.trace.pageviews > 100) {
      alerts.push({
        id: this.generateId(),
        severity: "info",
        title: "Monétisation disponible",
        message: "Votre site a suffisamment de trafic pour activer la monétisation",
        module: "yield",
        action: `/studio/yield/${data.site.id}/settings`,
      });
    }

    return alerts;
  }

  /**
   * Calculate overall health score
   */
  private calculateOverallHealth(radar: any, trace: any, yieldData: any, velocity: any): {
    score: number;
    status: "excellent" | "good" | "fair" | "poor";
    factors: Array<{ name: string; score: number; weight: number }>;
  } {
    const factors = [
      { name: "Indexation", score: Math.min(radar.coveragePct, 100), weight: 0.25 },
      { name: "Trafic", score: Math.min((trace.sessions / 100) * 100, 100), weight: 0.25 },
      { name: "Engagement", score: Math.min((trace.avgSessionDuration / 120) * 100, 100), weight: 0.2 },
      { name: "Performance", score: velocity.latestScore || 50, weight: 0.2 },
      { name: "Monétisation", score: yieldData?.enabled ? Math.min((yieldData.ecpmCdf / 200) * 100, 100) : 0, weight: 0.1 },
    ];

    const weightedScore = factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0);

    let status: "excellent" | "good" | "fair" | "poor";
    if (weightedScore >= 80) status = "excellent";
    else if (weightedScore >= 60) status = "good";
    else if (weightedScore >= 40) status = "fair";
    else status = "poor";

    return {
      score: Math.round(weightedScore),
      status,
      factors,
    };
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(current: number, target: number): "up" | "down" | "stable" {
    if (current >= target * 0.9) return "up";
    if (current >= target * 0.7) return "stable";
    return "down";
  }

  /**
   * Get color based on score
   */
  private getScoreColor(score: number): string {
    if (score >= 80) return "green";
    if (score >= 60) return "yellow";
    if (score >= 40) return "orange";
    return "red";
  }

  /**
   * Calculate priority from actions
   */
  private calculatePriority(actions: any[]): "high" | "medium" | "low" {
    const highImpact = actions.filter((a) => a.impact === "high").length;
    if (highImpact >= 2) return "high";
    if (highImpact >= 1) return "medium";
    return "low";
  }

  /**
   * Generate traffic series for chart
   */
  private generateTrafficSeries(trace: any): any[] {
    // Simulated data - in production, use real historical data
    const days = 7;
    const baseValue = trace.sessions / days;
    return Array.from({ length: days }, () => {
      const variation = Math.random() * 0.3 - 0.15;
      return Math.round(baseValue * (1 + variation));
    });
  }

  /**
   * Generate impressions series
   */
  private generateImpressionsSeries(radar: any): number[] {
    const days = 7;
    const baseValue = radar.impressions7d / days;
    return Array.from({ length: days }, () => {
      const variation = Math.random() * 0.4 - 0.2;
      return Math.round(baseValue * (1 + variation));
    });
  }

  /**
   * Generate clicks series
   */
  private generateClicksSeries(radar: any): number[] {
    const days = 7;
    const baseValue = radar.clicks7d / days;
    return Array.from({ length: days }, () => {
      const variation = Math.random() * 0.5 - 0.25;
      return Math.round(baseValue * (1 + variation));
    });
  }

  /**
   * Generate date labels
   */
  private generateDateLabels(days: number): string[] {
    const labels: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      labels.push(date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }));
    }
    return labels;
  }

  /**
   * Save custom dashboard layout
   */
  saveCustomLayout(userId: string, layout: Partial<DashboardLayout>): DashboardLayout {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO dashboard_layouts (
        id, user_id, name, description, widgets, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      userId,
      layout.name || "Custom Dashboard",
      layout.description || "",
      JSON.stringify(layout.widgets || []),
      now,
      now,
    );

    return this.getLayout(id) as DashboardLayout;
  }

  /**
   * Get dashboard layout
   */
  getLayout(layoutId: string): DashboardLayout | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM dashboard_layouts WHERE id = ?")
      .get(layoutId) as (Omit<DashboardLayout, "widgets"> & { widgets: string }) | undefined;
    if (!row) return null;

    return {
      ...row,
      widgets: JSON.parse(row.widgets),
    };
  }

  /**
   * Get layouts for user
   */
  getUserLayouts(userId: string): DashboardLayout[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM dashboard_layouts WHERE user_id = ? ORDER BY updated_at DESC")
      .all(userId) as (Omit<DashboardLayout, "widgets"> & { widgets: string })[];

    return rows.map((row) => ({
      ...row,
      widgets: JSON.parse(row.widgets),
    }));
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const dashboardManager = new DashboardManager();
