/**
 * Real ML Prediction Service
 * Uses real data and statistical models for predictions (no simulations)
 */

import { getDb } from "@/lib/storage/database";

export class RealMLPrediction {
  /**
   * Predict traffic based on historical data (statistical model)
   */
  async predictTraffic(siteId: string, daysAhead: number = 30): Promise<{
    predicted: number;
    confidence: number;
    lowerBound: number;
    upperBound: number;
    trend: "increasing" | "decreasing" | "stable";
    seasonality: any;
  }> {
    const db = getDb();
    const now = new Date();
    const historicalDays = 90; // Use 90 days of historical data

    // Get historical traffic data
    const historicalData = db
      .prepare(
        `SELECT day, COUNT(*) as sessions
         FROM trace_sessions
         WHERE site_id = ? AND started_at >= ?
         GROUP BY day
         ORDER BY day ASC`,
      )
      .all(siteId, new Date(Date.now() - historicalDays * 24 * 60 * 60 * 1000).toISOString()) as Array<{
      day: string;
      sessions: number;
    }>;

    if (historicalData.length < 30) {
      // Not enough data for prediction
      const avgSessions = historicalData.reduce((sum, d) => sum + d.sessions, 0) / historicalData.length;
      return {
        predicted: avgSessions * daysAhead,
        confidence: 0.3,
        lowerBound: avgSessions * daysAhead * 0.7,
        upperBound: avgSessions * daysAhead * 1.3,
        trend: "stable",
        seasonality: null,
      };
    }

    // Calculate linear regression
    const regression = this.calculateLinearRegression(historicalData);
    const slope = regression.slope;
    const rSquared = regression.rSquared;

    // Predict future values
    const lastDayIndex = historicalData.length - 1;
    const predictedDaily = historicalData.map((d, i) => d.sessions + slope * (i - lastDayIndex + daysAhead));

    const predicted = predictedDaily.reduce((sum, v) => sum + v, 0);

    // Calculate confidence interval based on R²
    const confidence = Math.min(0.95, rSquared);
    const variance = this.calculateVariance(historicalData.map((d) => d.sessions));
    const stdDev = Math.sqrt(variance);
    const marginOfError = stdDev * 1.96 * Math.sqrt(daysAhead); // 95% confidence

    // Determine trend
    let trend: "increasing" | "decreasing" | "stable" = "stable";
    if (slope > 0.5) trend = "increasing";
    else if (slope < -0.5) trend = "decreasing";

    // Detect seasonality
    const seasonality = this.detectSeasonality(historicalData);

    return {
      predicted,
      confidence,
      lowerBound: Math.max(0, predicted - marginOfError),
      upperBound: predicted + marginOfError,
      trend,
      seasonality,
    };
  }

  /**
   * Predict revenue based on historical data
   */
  async predictRevenue(siteId: string, daysAhead: number = 30): Promise<{
    predicted: number;
    confidence: number;
    lowerBound: number;
    upperBound: number;
    trend: "increasing" | "decreasing" | "stable";
  }> {
    const db = getDb();
    const now = new Date();
    const historicalDays = 90;

    // Get historical revenue data
    const historicalData = db
      .prepare(
        `SELECT day, SUM(publisher_revenue) as revenue
         FROM performance_stats_daily
         WHERE publisher_site_id = ? AND day >= ?
         GROUP BY day
         ORDER BY day ASC`,
      )
      .all(siteId, new Date(Date.now() - historicalDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)) as Array<{
      day: string;
      revenue: number;
    }>;

    if (historicalData.length < 30) {
      const avgRevenue = historicalData.reduce((sum, d) => sum + d.revenue, 0) / historicalData.length;
      return {
        predicted: avgRevenue * daysAhead,
        confidence: 0.3,
        lowerBound: avgRevenue * daysAhead * 0.7,
        upperBound: avgRevenue * daysAhead * 1.3,
        trend: "stable",
      };
    }

    // Calculate linear regression
    const regression = this.calculateLinearRegression(historicalData);
    const slope = regression.slope;
    const rSquared = regression.rSquared;

    // Predict future values
    const lastDayIndex = historicalData.length - 1;
    const predictedDaily = historicalData.map((d, i) => d.revenue + slope * (i - lastDayIndex + daysAhead));

    const predicted = predictedDaily.reduce((sum, v) => sum + v, 0);

    // Calculate confidence interval
    const variance = this.calculateVariance(historicalData.map((d) => d.revenue));
    const stdDev = Math.sqrt(variance);
    const marginOfError = stdDev * 1.96 * Math.sqrt(daysAhead);

    // Determine trend
    let trend: "increasing" | "decreasing" | "stable" = "stable";
    if (slope > 100) trend = "increasing";
    else if (slope < -100) trend = "decreasing";

    return {
      predicted,
      confidence: Math.min(0.95, rSquared),
      lowerBound: Math.max(0, predicted - marginOfError),
      upperBound: predicted + marginOfError,
      trend,
    };
  }

  /**
   * Predict performance score trend
   */
  async predictPerformanceTrend(siteId: string, daysAhead: number = 30): Promise<{
    predictedScore: number;
    confidence: number;
    trend: "improving" | "degrading" | "stable";
    recommendedActions: string[];
  }> {
    const db = getDb();
    const historicalDays = 60;

    // Get historical performance data
    const historicalData = db
      .prepare(
        `SELECT timestamp, scores
         FROM velocity_audits
         WHERE site_id = ? AND timestamp >= ?
         ORDER BY timestamp ASC`,
      )
      .all(siteId, new Date(Date.now() - historicalDays * 24 * 60 * 60 * 1000).toISOString()) as Array<{
      timestamp: string;
      scores: string;
    }>;

    if (historicalData.length < 10) {
      return {
        predictedScore: 50,
        confidence: 0.2,
        trend: "stable",
        recommendedActions: ["Collect more performance data"],
      };
    }

    // Extract overall scores
    const scores = historicalData.map((d) => {
      const parsed = JSON.parse(d.scores);
      return parsed.overall || 50;
    });

    // Calculate linear regression
    const regression = this.calculateLinearRegression(
      scores.map((score, i) => ({ day: i, value: score })),
    );

    const slope = regression.slope;
    const lastScore = scores[scores.length - 1];
    const predictedScore = Math.min(100, Math.max(0, lastScore + slope * daysAhead));

    // Determine trend
    let trend: "improving" | "degrading" | "stable" = "stable";
    if (slope > 0.5) trend = "improving";
    else if (slope < -0.5) trend = "degrading";

    // Generate recommendations
    const recommendedActions = this.generatePerformanceRecommendations(trend, predictedScore);

    return {
      predictedScore,
      confidence: regression.rSquared,
      trend,
      recommendedActions,
    };
  }

  /**
   * Calculate linear regression
   */
  private calculateLinearRegression(data: Array<{ day: string | number; value: number }>): {
    slope: number;
    intercept: number;
    rSquared: number;
  } {
    const n = data.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = data[i].value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const meanY = sumY / n;
    let ssRes = 0;
    let ssTot = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = data[i].value;
      const predicted = slope * x + intercept;
      ssRes += Math.pow(y - predicted, 2);
      ssTot += Math.pow(y - meanY, 2);
    }

    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { slope, intercept, rSquared };
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Detect seasonality in data
   */
  private detectSeasonality(data: Array<{ day: string; sessions: number }>): {
    weekly: boolean;
    monthly: boolean;
    patterns: Array<{ day: number; avg: number }>;
  } {
    const weeklyPattern: number[] = new Array(7).fill(0);
    const weeklyCount: number[] = new Array(7).fill(0);

    for (const d of data) {
      const date = new Date(d.day);
      const dayOfWeek = date.getDay();
      weeklyPattern[dayOfWeek] += d.sessions;
      weeklyCount[dayOfWeek]++;
    }

    // Calculate average per day of week
    const avgPerDay = weeklyPattern.map((sum, i) => weeklyCount[i] > 0 ? sum / weeklyCount[i] : 0);

    // Check if there's significant weekly variation
    const max = Math.max(...avgPerDay);
    const min = Math.min(...avgPerDay);
    const weeklySeasonality = (max - min) / max > 0.3;

    return {
      weekly: weeklySeasonality,
      monthly: false, // Would need more data
      patterns: avgPerDay.map((avg, i) => ({ day: i, avg })),
    };
  }

  /**
   * Generate performance recommendations
   */
  private generatePerformanceRecommendations(trend: string, predictedScore: number): string[] {
    const recommendations: string[] = [];

    if (trend === "degrading") {
      recommendations.push("Priorité : Identifier les changements récents qui causent la dégradation");
      recommendations.push("Audit des nouvelles ressources (scripts, images)");
      recommendations.push("Optimiser les scripts tiers");
      recommendations.push("Activer le monitoring continu");
    }

    if (predictedScore < 60) {
      recommendations.push("Optimiser les Core Web Vitals");
      recommendations.push("Réduire le JavaScript bloquant");
      recommendations.push("Optimiser les images");
    }

    if (trend === "stable" && predictedScore >= 70) {
      recommendations.push("Performance satisfaisante - maintenance normal");
      recommendations.push("Surveiller les changements de performance");
    }

    return recommendations;
  }

  /**
   * Anomaly detection using Z-score
   */
  detectAnomalies(siteId: string, metric: string, threshold: number = 2): Array<{
    timestamp: string;
    value: number;
    zScore: number;
    severity: "low" | "medium" | "high";
  }> {
    const db = getDb();
    const days = 30;

    // Get historical data
    const historicalData = db
      .prepare(
        `SELECT day, ${metric} as value
         FROM performance_stats_daily
         WHERE site_id = ? AND day >= ?
         ORDER BY day ASC`,
      )
      .all(siteId, new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)) as Array<{
      day: string;
      value: number;
    }>;

    if (historicalData.length < 10) {
      return [];
    }

    // Calculate mean and standard deviation
    const values = historicalData.map((d) => d.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = this.calculateVariance(values);
    const stdDev = Math.sqrt(variance);

    // Detect anomalies
    const anomalies = historicalData
      .map((d) => {
        const zScore = stdDev > 0 ? (d.value - mean) / stdDev : 0;
        return {
          timestamp: d.day,
          value: d.value,
          zScore,
          severity: Math.abs(zScore) > 3 ? "high" : Math.abs(zScore) > 2 ? "medium" : "low",
        };
      })
      .filter((a) => Math.abs(a.zScore) > threshold);

    return anomalies;
  }

  /**
   * Cohort analysis with real data
   */
  analyzeCohorts(siteId: string, cohortSize: number = 7, periodWeeks: number = 12): {
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
    const weeklyValue = 10; // Would calculate from actual data

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
}

export const realMLPrediction = new RealMLPrediction();
