/**
 * Ayeba Aether Enterprise - AI Copilot for Webmasters
 * Synthesizes data from Radar, Trace, Yield, and Velocity to provide actionable insights
 */

import { getDb } from "@/lib/storage/database";
import { radarEnterprise } from "./radar-enterprise";
import { traceEnterprise } from "./trace-enterprise";
import { yieldEnterprise } from "./yield-enterprise";
import { velocityEnterprise } from "./velocity-enterprise";
import type {
  AetherAction,
  AetherOverview,
  StudioSite,
} from "./types";

export class AetherEnterprise {
  /**
   * Generate comprehensive AI overview for site
   */
  async generateOverview(site: StudioSite): Promise<AetherOverview> {
    // Gather data from all 4 services
    const radarData = radarEnterprise.getOverview(site.id, site.domain);
    const traceData = traceEnterprise.getRealTimeAnalytics(site.id, 30);
    const yieldData = yieldEnterprise.getPublisherSites(site.userId).find(s => s.id === site.id);
    const velocityData = velocityEnterprise.getOverview(site.id);

    // Analyze and generate insights
    const headline = this.generateHeadline(radarData, traceData, yieldData, velocityData);
    const actions = this.generatePrioritizedActions(radarData, traceData, yieldData, velocityData, site);
    const signals = this.generateSignals(radarData, traceData, yieldData, velocityData);

    // Store insight for historical tracking
    await this.storeInsight(site.id, {
      radar_summary: radarData,
      trace_summary: traceData,
      yield_summary: yieldData,
      velocity_summary: velocityData,
      recommended_actions: actions,
    });

    return {
      domain: site.domain,
      headline,
      actions,
      signals,
    };
  }

  /**
   * Generate headline summary
   */
  private generateHeadline(
    radar: any,
    trace: any,
    yieldData: any,
    velocity: any,
  ): string {
    const issues: string[] = [];
    const positives: string[] = [];

    // Radar analysis
    if (radar.coveragePct < 50) {
      issues.push("indexation faible");
    } else if (radar.coveragePct > 80) {
      positives.push("excellente indexation");
    }

    if (radar.impressions7d === 0 && radar.indexedPages > 0) {
      issues.push("aucune impression");
    } else if (radar.ctr7d > 5) {
      positives.push("CTR élevé");
    }

    // Trace analysis
    if (trace.sessions < 10) {
      issues.push("trafic faible");
    } else if (trace.sessions > 100) {
      positives.push("trafic solide");
    }

    if (trace.avgSessionDuration < 30) {
      issues.push("engagement faible");
    } else if (trace.avgSessionDuration > 120) {
      positives.push("engagement fort");
    }

    // Yield analysis
    if (yieldData && yieldData.enabled) {
      if (yieldData.revenue30dCdf < 1000) {
        issues.push("revenus limités");
      } else if (yieldData.revenue30dCdf > 10000) {
        positives.push("revenus solides");
      }
    }

    // Velocity analysis
    if (velocity.latestScore && velocity.latestScore < 50) {
      issues.push("performance moyenne");
    } else if (velocity.latestScore && velocity.latestScore > 80) {
      positives.push("performance excellente");
    }

    // Generate headline
    if (issues.length === 0 && positives.length > 0) {
      return `Site performant avec ${positives.join(", ")}. Continuez ainsi !`;
    }

    if (issues.length > 0 && positives.length > 0) {
      return `Site avec ${positives.join(", ")} mais ${issues.join(" et ")} à améliorer.`;
    }

    if (issues.length > 0) {
      return `Site nécessitant des améliorations : ${issues.join(", ")}.`;
    }

    return "Site en bonne santé globale. Surveillance continue recommandée.";
  }

  /**
   * Generate prioritized actions (top 3 high-impact actions)
   */
  private generatePrioritizedActions(
    radar: any,
    trace: any,
    yieldData: any,
    velocity: any,
    site: StudioSite,
  ): AetherAction[] {
    const actions: AetherAction[] = [];
    const scores: Map<string, number> = new Map();

    // Radar actions
    if (radar.coveragePct < 60) {
      const impact = this.calculateCoverageImpact(radar.coveragePct);
      scores.set("radar-coverage", impact);
      actions.push({
        id: this.generateId(),
        module: "radar",
        impact: impact > 15 ? "high" : "medium",
        title: "Améliorer l'indexation",
        detail: `Soumettez votre sitemap et ajoutez des URLs manuellement pour atteindre 80%+ de couverture.`,
        href: `/studio/radar/${site.id}/coverage`,
      });
    }

    if (radar.impressions7d === 0 && radar.indexedPages > 0) {
      scores.set("radar-content", 20);
      actions.push({
        id: this.generateId(),
        module: "radar",
        impact: "high",
        title: "Optimiser le contenu pour la recherche",
        detail: "Vos pages sont indexées mais ne reçoivent pas d'impressions. Améliorez vos titres et descriptions.",
        href: `/studio/radar/${site.id}/content`,
      });
    }

    if (radar.ctr7d < 2 && radar.impressions7d > 100) {
      scores.set("radar-ctr", 18);
      actions.push({
        id: this.generateId(),
        module: "radar",
        impact: "high",
        title: "Améliorer le taux de clic",
        detail: `CTR actuel : ${radar.ctr7d}%. Optimisez vos meta descriptions pour attirer plus de clics.`,
        href: `/studio/radar/${site.id}/performance`,
      });
    }

    // Trace actions
    if (trace.avgSessionDuration < 45 && trace.pageviews > 50) {
      scores.set("trace-engagement", 16);
      actions.push({
        id: this.generateId(),
        module: "trace",
        impact: "high",
        title: "Améliorer l'engagement utilisateur",
        detail: `Durée moyenne : ${Math.round(trace.avgSessionDuration)}s. Ajoutez du contenu engageant et améliorez la navigation.`,
        href: `/studio/trace/${site.id}/engagement`,
      });
    }

    if (trace.bounceRate > 70) {
      scores.set("trace-bounce", 15);
      actions.push({
        id: this.generateId(),
        module: "trace",
        impact: "medium",
        title: "Réduire le taux de rebond",
        detail: `Taux de rebond : ${trace.bounceRate}%. Optimisez votre page d'accueil et le temps de chargement.`,
        href: `/studio/trace/${site.id}/behavior`,
      });
    }

    if (trace.activeUsers < 5 && trace.pageviews > 100) {
      scores.set("trace-retention", 14);
      actions.push({
        id: this.generateId(),
        module: "trace",
        impact: "medium",
        title: "Améliorer la rétention",
        detail: "Peu d'utilisateurs actifs simultanés. Implémentez des notifications ou du contenu personnelisé.",
        href: `/studio/trace/${site.id}/retention`,
      });
    }

    // Yield actions
    if (yieldData && !yieldData.enabled) {
      scores.set("yield-enable", 25);
      actions.push({
        id: this.generateId(),
        module: "yield",
        impact: "high",
        title: "Activer la monétisation",
        detail: "Activez Yield pour commencer à générer des revenus avec votre trafic.",
        href: `/studio/yield/${site.id}/settings`,
      });
    }

    if (yieldData && yieldData.enabled && yieldData.ecpmCdf < 100) {
      scores.set("yield-ecpm", 17);
      actions.push({
        id: this.generateId(),
        module: "yield",
        impact: "medium",
        title: "Optimiser les revenus par impression",
        detail: `eCPM actuel : ${yieldData.ecpmCdf} CDF. Testez différents emplacements et formats.`,
        href: `/studio/yield/${site.id}/optimization`,
      });
    }

    if (yieldData && yieldData.enabled && yieldData.ctr30d < 1) {
      scores.set("yield-ctr", 16);
      actions.push({
        id: this.generateId(),
        module: "yield",
        impact: "medium",
        title: "Améliorer le CTR publicitaire",
        detail: `CTR publicité : ${yieldData.ctr30d}%. Optimisez le placement et le format des annonces.`,
        href: `/studio/yield/${site.id}/placements`,
      });
    }

    // Velocity actions
    if (velocity.latestScore && velocity.latestScore < 50) {
      scores.set("velocity-performance", 22);
      actions.push({
        id: this.generateId(),
        module: "velocity",
        impact: "high",
        title: "Améliorer les performances web",
        detail: `Score actuel : ${velocity.latestScore}/100. Optimisez le chargement pour améliorer l'expérience utilisateur.`,
        href: `/studio/velocity/${site.id}/audit`,
      });
    }

    if (velocity.latestTtfbMs && velocity.latestTtfbMs > 500) {
      scores.set("velocity-ttfb", 19);
      actions.push({
        id: this.generateId(),
        module: "velocity",
        impact: "high",
        title: "Réduire le temps de réponse serveur",
        detail: `TTFB : ${velocity.latestTtfbMs}ms. Optimisez votre serveur ou utilisez un CDN.`,
        href: `/studio/velocity/${site.id}/server`,
      });
    }

    if (velocity.actionPlan && velocity.actionPlan.length > 0) {
      const topAction = velocity.actionPlan[0];
      scores.set("velocity-optimization", 15);
      actions.push({
        id: this.generateId(),
        module: "velocity",
        impact: "medium",
        title: topAction.title,
        detail: topAction.detail,
        href: `/studio/velocity/${site.id}/recommendations`,
      });
    }

    // Sort by impact score and return top 3
    const sortedActions = actions
      .sort((a, b) => {
        const scoreA = scores.get(`${a.module}-${a.title.toLowerCase().split(" ")[0]}`) || 0;
        const scoreB = scores.get(`${b.module}-${b.title.toLowerCase().split(" ")[0]}`) || 0;
        return scoreB - scoreA;
      })
      .slice(0, 3);

    return sortedActions;
  }

  /**
   * Generate key signals/metrics
   */
  private generateSignals(radar: any, trace: any, yieldData: any, velocity: any): {
    label: string;
    value: string;
  }[] {
    const signals: { label: string; value: string }[] = [];

    // Radar signals
    signals.push({
      label: "Pages indexées",
      value: `${radar.indexedPages} (${radar.coveragePct}%)`,
    });

    signals.push({
      label: "Impressions 7j",
      value: radar.impressions7d.toLocaleString(),
    });

    signals.push({
      label: "CTR 7j",
      value: `${radar.ctr7d}%`,
    });

    // Trace signals
    signals.push({
      label: "Sessions 7j",
      value: trace.sessions.toLocaleString(),
    });

    signals.push({
      label: "Pages/session",
      value: trace.avgPagesPerSession.toFixed(1),
    });

    signals.push({
      label: "Durée moyenne",
      value: `${Math.round(trace.avgSessionDuration)}s`,
    });

    // Yield signals
    if (yieldData && yieldData.enabled) {
      signals.push({
        label: "Revenus 30j",
        value: `${yieldData.revenue30dCdf.toLocaleString()} CDF`,
      });

      signals.push({
        label: "eCPM",
        value: `${yieldData.ecpmCdf} CDF`,
      });
    }

    // Velocity signals
    if (velocity.latestScore) {
      signals.push({
        label: "Score performance",
        value: `${velocity.latestScore}/100`,
      });
    }

    if (velocity.latestTtfbMs) {
      signals.push({
        label: "TTFB",
        value: `${velocity.latestTtfbMs}ms`,
      });
    }

    return signals;
  }

  /**
   * Calculate impact score for coverage improvement
   */
  private calculateCoverageImpact(currentCoverage: number): number {
    if (currentCoverage < 30) return 25;
    if (currentCoverage < 50) return 20;
    if (currentCoverage < 70) return 15;
    return 10;
  }

  /**
   * Store insight for historical tracking
   */
  private async storeInsight(siteId: string, data: {
    radar_summary: any;
    trace_summary: any;
    yield_summary: any;
    velocity_summary: any;
    recommended_actions: AetherAction[];
  }): Promise<void> {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();
    const day7ago = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Calculate priority score based on actions
    const priorityScore = data.recommended_actions.reduce((sum, action) => {
      return sum + (action.impact === "high" ? 10 : 5);
    }, 0);

    // Estimate impact
    const estimatedImpact = this.estimateImpact(data);

    db.prepare(
      `INSERT INTO aether_insights (
        id, site_id, generated_at, data_period_start, data_period_end,
        radar_summary, trace_summary, yield_summary, velocity_summary,
        recommended_actions, priority_score, estimated_impact, confidence_score, model_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.85, '1.0')`,
    ).run(
      id,
      siteId,
      now,
      day7ago,
      now,
      JSON.stringify(data.radar_summary),
      JSON.stringify(data.trace_summary),
      JSON.stringify(data.yield_summary),
      JSON.stringify(data.velocity_summary),
      JSON.stringify(data.recommended_actions),
      priorityScore,
      JSON.stringify(estimatedImpact),
    );
  }

  /**
   * Estimate impact of recommended actions
   */
  private estimateImpact(data: any): string {
    const actions = data.recommended_actions;
    if (!actions || actions.length === 0) return "Impact limité";

    const highImpactActions = actions.filter((a: AetherAction) => a.impact === "high").length;

    if (highImpactActions >= 2) {
      return "Impact très élevé - Amélioration significative attendue sur trafic et revenus";
    }

    if (highImpactActions === 1) {
      return "Impact élevé - Amélioration notable attendue";
    }

    return "Impact modéré - Améliorations progressives";
  }

  /**
   * Get historical insights for site
   */
  getHistoricalInsights(siteId: string, limit: number = 10): Array<{
    id: string;
    generatedAt: string;
    recommendedActions: AetherAction[];
    priorityScore: number;
    estimatedImpact: string;
  }> {
    const db = getDb();

    const rows = db
      .prepare(
        `SELECT id, generated_at, recommended_actions, priority_score, estimated_impact
         FROM aether_insights
         WHERE site_id = ?
         ORDER BY generated_at DESC
         LIMIT ?`,
      )
      .all(siteId, limit) as Array<{
      id: string;
      generated_at: string;
      recommended_actions: string;
      priority_score: number;
      estimated_impact: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      generatedAt: row.generated_at,
      recommendedActions: JSON.parse(row.recommended_actions),
      priorityScore: row.priority_score,
      estimatedImpact: row.estimated_impact,
    }));
  }

  /**
   * Track action implementation
   */
  trackActionImplementation(input: {
    siteId: string;
    insightId: string;
    actionType: string;
    actionDescription: string;
    module: string;
  }): string {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO aether_action_history (
        id, site_id, insight_id, action_type, action_description,
        module, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    ).run(
      id,
      input.siteId,
      input.insightId,
      input.actionType,
      input.actionDescription,
      input.module,
      now,
    );

    return id;
  }

  /**
   * Mark action as implemented
   */
  markActionImplemented(actionId: string, result: string): void {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE aether_action_history
       SET status = 'completed', implemented_at = ?, result = ?
       WHERE id = ?`,
    ).run(now, result, actionId);
  }

  /**
   * Get action history for site
   */
  getActionHistory(siteId: string): Array<{
    id: string;
    actionType: string;
    actionDescription: string;
    module: string;
    status: string;
    implementedAt: string | null;
    result: string | null;
    createdAt: string;
  }> {
    const db = getDb();

    const rows = db
      .prepare(
        `SELECT * FROM aether_action_history
         WHERE site_id = ?
         ORDER BY created_at DESC
         LIMIT 50`,
      )
      .all(siteId) as Array<any>;

    return rows.map((row) => ({
      id: row.id,
      actionType: row.action_type,
      actionDescription: row.action_description,
      module: row.module,
      status: row.status,
      implementedAt: row.implemented_at,
      result: row.result,
      createdAt: row.created_at,
    }));
  }

  /**
   * Compare current performance with previous insights
   */
  compareWithPrevious(siteId: string): {
    improved: string[];
    declined: string[];
    stable: string[];
  } {
    const insights = this.getHistoricalInsights(siteId, 2);
    if (insights.length < 2) {
      return { improved: [], declined: [], stable: [] };
    }

    const current = insights[0];
    const previous = insights[1];

    // Compare priority scores
    const scoreDiff = current.priorityScore - previous.priorityScore;

    // Compare action types
    const currentActions = new Set(current.recommendedActions.map((a) => a.module));
    const previousActions = new Set(previous.recommendedActions.map((a) => a.module));

    const improved: string[] = [];
    const declined: string[] = [];
    const stable: string[] = [];

    if (scoreDiff < -5) {
      improved.push("Priorité des problèmes réduite");
    } else if (scoreDiff > 5) {
      declined.push("Nouveaux problèmes prioritaires");
    } else {
      stable.push("Priorité stable");
    }

    // Check for resolved issues
    previousActions.forEach((module) => {
      if (!currentActions.has(module)) {
        improved.push(`Problèmes ${module} résolus`);
      }
    });

    // Check for new issues
    currentActions.forEach((module) => {
      if (!previousActions.has(module)) {
        declined.push(`Nouveaux problèmes ${module}`);
      }
    });

    return { improved, declined, stable };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const aetherEnterprise = new AetherEnterprise();
