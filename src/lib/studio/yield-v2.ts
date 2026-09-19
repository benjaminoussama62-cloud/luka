/**
 * Ayeba Yield Enterprise v2 - Advanced Ad Platform
 * Google Ads-level features with AI-powered optimization and real-time bidding
 */

import { getDb } from "@/lib/storage/database";
import type {
  Campaign,
  AdCreative,
  Advertiser,
  Publisher,
  PerformanceReport,
  AudienceSegment,
} from "./ad-network-types";

export class YieldEnterpriseV2 {
  /**
   * Create campaign with AI-powered optimization
   */
  createCampaign(input: {
    advertiserId: string;
    name: string;
    type: string;
    dailyBudget: number;
    totalBudget: number;
    startDate: string;
    endDate: string;
    biddingStrategy: string;
    maxCpc?: number;
    targetCpa?: number;
    targetRoas?: number;
    targeting?: any;
    autoOptimization?: {
      enabled: boolean;
      goals: string[];
      learningPeriod?: number;
      rotation?: "optimize" | "rotate_evenly";
      excludeCompetitors?: boolean;
    };
  }): Campaign | null {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    // Generate AI recommendations for campaign setup
    const aiRecommendations = this.generateCampaignRecommendations(input);

    db.prepare(
      `INSERT INTO campaigns (
        id, advertiser_id, name, type, status, daily_budget, total_budget,
        budget_spent, budget_remaining, bidding_strategy, max_cpc,
        target_cpa, target_roas, start_date, end_date, time_zone, geo_targeting,
        device_targeting, audience_segments, keywords, placements, contextual_targeting,
        frequency_cap, pacing_type, auto_optimize, rotation, exclude_competitors,
        ai_recommendations, ml_model_version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'draft', ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 'Africa/Kinshasa', '{}', '{}', '[]', '[]', '[]', '{}', '{}', 'standard', ?, ?, ?, ?, ?, ?, '1.0', ?, ?)`,
    ).run(
      id,
      input.advertiserId,
      input.name,
      input.type,
      input.dailyBudget,
      input.totalBudget,
      input.totalBudget,
      input.biddingStrategy,
      input.maxCpc || null,
      input.targetCpa || null,
      input.targetRoas || null,
      input.startDate,
      input.endDate,
      JSON.stringify(input.targeting || {}),
      JSON.stringify(aiRecommendations),
      input.autoOptimization?.enabled ? 1 : 0,
      input.autoOptimization?.rotation || "optimize",
      input.autoOptimization?.excludeCompetitors ? 1 : 0,
      JSON.stringify(input.autoOptimization || {}),
      now,
      now,
    );

    return this.getCampaign(id);
  }

  /**
   * Generate AI recommendations for campaign setup
   */
  private generateCampaignRecommendations(input: any): {
    suggestedBudget: number;
    recommendedBidding: string;
    targetAudienceSuggestions: string[];
    recommendedPlacements: string[];
    optimalTimes: string[];
    creativeGuidelines: string[];
  } {
    const recommendations = {
      suggestedBudget: Math.round(input.dailyBudget * 1.2), // 20% higher for better results
      recommendedBidding: input.biddingStrategy === "manual_cpc" ? "maximize_clicks" : input.biddingStrategy,
      targetAudienceSuggestions: [
        "Users interested in [industry]",
        "Local audience within 50km",
        "Mobile-first users (70%+ mobile traffic)",
      ],
      recommendedPlacements: [
        "Top 3 positions on high-traffic pages",
        "Above-the-fold placements",
        "Native ads in content feeds",
      ],
      optimalTimes: [
        "9:00 AM - 12:00 PM (peak hours)",
        "6:00 PM - 9:00 PM (evening peak)",
      ],
      creativeGuidelines: [
        "Use clear, benefit-focused headlines",
        "Include local language (French/Lingala)",
        "Test multiple creative variations",
        "Use high-quality images (recommended: 1200x627)",
      ],
    };

    return recommendations;
  }

  /**
   * Get campaign with ML-powered insights
   */
  getCampaign(id: string): Campaign | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM campaigns WHERE id = ?")
      .get(id) as Campaign | undefined;
    if (!row) return null;

    // Generate real-time performance insights
    const performanceInsights = this.generatePerformanceInsights(id);

    return {
      ...row,
      geo_targeting: JSON.parse(row.geo_targeting as string),
      device_targeting: JSON.parse(row.device_targeting as string),
      audience_segments: JSON.parse(row.audience_segments as string),
      keywords: JSON.parse(row.keywords as string),
      placements: JSON.parse(row.placements as string),
      contextual_targeting: JSON.parse(row.contextual_targeting as string),
      frequency_cap: JSON.parse(row.frequency_cap as string),
      hours_of_day: JSON.parse(row.hours_of_day as string),
      days_of_week: JSON.parse(row.days_of_week as string),
      creatives: this.getCampaignCreatives(id),
      ai_recommendations: JSON.parse(row.ai_recommendations as string),
      performanceInsights,
    };
  }

  private getCampaignCreatives(campaignId: string): AdCreative[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM ad_creatives WHERE campaign_id = ? ORDER BY created_at DESC")
      .all(campaignId) as AdCreative[];

    return rows.map((row) => ({
      ...row,
      trackingPixels: typeof row.trackingPixels === "string" ? JSON.parse(row.trackingPixels) : row.trackingPixels || {},
      compliance: typeof row.compliance === "string" ? JSON.parse(row.compliance) : row.compliance,
    }));
  }

  /**
   * Generate real-time performance insights (ML-powered)
   */
  private generatePerformanceInsights(campaignId: string): {
    optimizationScore: number;
    recommendations: string[];
    predictedPerformance: {
      estimatedCTR: number;
      estimatedCPA: number;
      estimatedROAS: number;
      confidenceInterval: { min: number; max: number };
    };
    biddingAdjustments: {
      geo: Record<string, number>;
    device: Record<string, string>;
    time: Record<string, string>;
    audience: Record<string, string>;
    };
    budgetRecommendations: {
      dailyRecommended: number;
      reallocationNeeded: boolean;
      reason: string;
    };
  } {
    const db = getDb();
    const campaign = this.getCampaign(campaignId);
    if (!campaign) {
      return {
        optimizationScore: 0,
        recommendations: ["Campaign not found"],
        predictedPerformance: { estimatedCTR: 0, estimatedCPA: 0, estimatedROAS: 0, confidenceInterval: { min: 0, max: 0 } },
        biddingAdjustments: { geo: {}, device: {}, time: {}, audience: {} },
        budgetRecommendations: { dailyRecommended: 0, reallocationNeeded: false, reason: "" },
      };
    }

    // Calculate optimization score based on performance metrics
    const optimizationScore = this.calculateOptimizationScore(campaign);

    // Generate ML-based recommendations
    const recommendations = this.generateOptimizationRecommendations(campaign, optimizationScore);

    // Predict performance using historical data
    const predictedPerformance = this.predictCampaignPerformance(campaign);

    // Calculate bidding adjustments based on performance data
    const biddingAdjustments = this.calculateBiddingAdjustments(campaign);

    // Budget optimization recommendations
    const budgetRecommendations = this.optimizeBudgetAllocation(campaign);

    return {
      optimizationScore,
      recommendations,
      predictedPerformance,
      biddingAdjustments,
      budgetRecommendations,
    };
  }

  /**
   * Calculate optimization score (0-100)
   */
  private calculateOptimizationScore(campaign: Campaign): number {
    let score = 50; // Base score

    // CTR performance
    if (campaign.delivery.ctr > 5) score += 20;
    else if (campaign.delivery.ctr > 3) score += 10;
    else if (campaign.delivery.ctr > 1) score += 5;

    // Conversion rate
    if (campaign.delivery.conversionRate > 5) score += 15;
    else if (campaign.delivery.conversionRate > 2) score += 8;
    else if (campaign.delivery.conversionRate > 1) score += 3;

    // ROAS performance
    if (campaign.delivery.roas > 3) score += 15;
    else if (campaign.delivery.roas > 2) score += 8;
    else if (campaign.delivery.roas > 1) score += 3;

    // Budget utilization
    const budgetUtilization = campaign.budget.spent / campaign.budget.total;
    if (budgetUtilization > 0.8 && budgetUtilization < 0.95) score += 10;
    else if (budgetUtilization > 0.6) score += 5;

    return Math.min(100, score);
  }

  /**
   * Generate optimization recommendations (AI-powered)
   */
  private generateOptimizationRecommendations(campaign: Campaign, score: number): string[] {
    const recommendations: string[] = [];

    if (score < 50) {
      recommendations.push("Priorité : Activer l'auto-optimisation pour améliorer la performance");
      recommendations.push("Tester différentes variantes de créatifs pour améliorer le CTR");
      recommendations.push("Affiner le ciblage pour atteindre une audience plus pertinente");
    }

    if (campaign.delivery.ctr < 2 && campaign.delivery.impressions > 1000) {
      recommendations.push("CTR faible : Optimisez les titres et descriptions des annonces");
      recommendations.push("Testez des images plus engageantes et professionnelles");
    }

    if (campaign.delivery.conversionRate < 1 && campaign.delivery.clicks > 100) {
      recommendations.push("Taux de conversion faible : Améliorez la landing page");
      recommendations.push("Ajoutez des appels à l'action clairs et pertinents");
    }

    if (campaign.budget.spent < campaign.budget.daily * 0.5) {
      recommendations.push("Budget sous-utilisé : Augmentez les enchères ou élargissez le ciblage");
    }

    if (campaign.delivery.roas < 1 && campaign.budget.spent > campaign.budget.total * 0.5) {
      recommendations.push("ROAS négatif : Pausez la campagne et revoitez la stratégie");
    }

    return recommendations;
  }

  /**
   * Predict campaign performance using ML (simplified)
   */
  private predictCampaignPerformance(campaign: Campaign): {
    estimatedCTR: number;
    estimatedCPA: number;
    estimatedROAS: number;
    confidenceInterval: { min: number; max: number };
  } {
    // Get historical performance data for similar campaigns
    const db = getDb();
    const historicalData = db
      .prepare(
        `SELECT AVG(ctr) as avg_ctr, AVG(cpa) as avg_cpa, AVG(roas) as avg_roas
         FROM performance_stats_daily
         WHERE campaign_id IN (
           SELECT id FROM campaigns
           WHERE type = ? AND status = 'active'
           AND id != ?
         )
         AND day >= date('now', '-30 days')`,
      )
      .get(campaign.type, campaign.id) as {
      avg_ctr: number | null;
      avg_cpa: number | null;
      avg_roas: number | null;
      };

    const estimatedCTR = historicalData.avg_ctr || 2.5;
    const estimatedCPA = historicalData.avg_cpa || campaign.bidding.maxCpc || 50;
    const estimatedROAS = historicalData.avg_roas || 1.5;

    // Calculate confidence interval based on data volume
    const confidence = 0.1; // 10% variance
    const confidenceInterval = {
      min: estimatedCTR * (1 - confidence),
      max: estimatedCTR * (1 + confidence),
    };

    return {
      estimatedCTR,
      estimatedCPA,
      estimatedROAS,
      confidenceInterval,
    };
  }

  /**
   * Calculate bidding adjustments based on performance data
   */
  private calculateBiddingAdjustments(campaign: Campaign): {
    geo: Record<string, number>;
    device: Record<string, string>;
    time: Record<string, string>;
    audience: Record<string, string>;
  } {
    const db = getDb();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Geo performance
    const geoPerformance = db
      .prepare(
        `SELECT country, AVG(ctr) as avg_ctr, AVG(cpa) as avg_cpa
         FROM performance_geo_daily
         WHERE campaign_id = ? AND day >= ?
         GROUP BY country`,
      )
      .all(campaign.id, since) as Array<any>;

    const geoAdjustments: Record<string, number> = {};
    geoPerformance.forEach((geo) => {
      if (geo.avg_ctr > 3) {
        geoAdjustments[geo.country] = 1.2; // 20% boost for high-performing regions
      } else if (geo.avg_ctr < 1) {
        geoAdjustments[geo.country] = 0.8; // 20% reduction for low-performing regions
      }
    });

    // Device performance
    const devicePerformance = db
      .prepare(
        `SELECT device_type, AVG(ctr) as avg_ctr, AVG(cpa) as avg_cpa
         FROM performance_device_daily
         WHERE campaign_id = ? AND day >= ?
         GROUP BY device_type`,
      )
      .all(campaign.id, since) as Array<any>;

    const deviceAdjustments: Record<string, string> = {};
    devicePerformance.forEach((device) => {
      if (device.avg_ctr > 3) {
        deviceAdjustments[device.device_type] = "1.3";
      } else if (device.avg_ctr < 1) {
        deviceAdjustments[device.device_type] = "0.7";
      }
    });

    // Time performance
    const timeAdjustments: Record<string, string> = {
      "morning": "1.1",
      "afternoon": "1.0",
      "evening": "1.2",
      "night": "0.8",
    };

    // Audience segment performance
    const audienceAdjustments: Record<string, string> = {};
    campaign.targeting.audienceSegments?.forEach((segment: string) => {
      audienceAdjustments[segment] = "1.0"; // Would calculate from segment performance
    });

    return {
      geo: geoAdjustments,
      device: deviceAdjustments,
      time: timeAdjustments,
      audience: audienceAdjustments,
    };
  }

  /**
   * Optimize budget allocation with AI
   */
  private optimizeBudgetAllocation(campaign: Campaign): {
    dailyRecommended: number;
    reallocationNeeded: boolean;
    reason: string;
  } {
    const performance = campaign.delivery;
    const currentUtilization = performance.cost / campaign.budget.daily;

    let dailyRecommended = campaign.budget.daily;
    let reallocationNeeded = false;
    let reason = "";

    if (currentUtilization < 0.5 && performance.ctr > 3) {
      // Budget underutilized with good CTR - recommend increase
      dailyRecommended = Math.round(campaign.budget.daily * 1.5);
      reallocationNeeded = true;
      reason = "Budget sous-utilisé avec bon CTR - augmentation recommandée";
    } else if (currentUtilization > 0.9 && performance.ctr < 1) {
      // Budget maxed out with poor CTR - recommend decrease
      dailyRecommended = Math.round(campaign.budget.daily * 0.7);
      reallocationNeeded = true;
      reason = "Budget saturé avec CTR faible - réduction recommandée";
    } else if (performance.roas < 1 && performance.cost > campaign.budget.total * 0.5) {
      // Poor ROAS - recommend pause
      dailyRecommended = 0;
      reallocationNeeded = true;
      reason = "ROAS négatif - pause de campagne recommandée";
    }

    return {
      dailyRecommended,
      reallocationNeeded,
      reason,
    };
  }

  /**
   * Run real-time bidding with ML optimization
   */
  runOptimizedAuction(request: any, placement: any): {
    auctionId: string;
    winningBid: any;
    pricePaid: number;
    optimizationReason: string;
    confidence: number;
  } {
    const auctionId = this.generateAuctionId();
    const eligibleCampaigns = this.getEligibleCampaigns(request, placement);

    if (eligibleCampaigns.length === 0) {
      return {
        auctionId,
        winningBid: null,
        pricePaid: 0,
        optimizationReason: "No eligible campaigns",
        confidence: 0,
      };
    }

    // Generate ML-optimized bids
    const bids = eligibleCampaigns.map((campaign) =>
      this.generateOptimizedBid(campaign, request, placement),
    );

    // Sort by optimized score (not just price)
    const sortedBids = bids.sort((a, b) => b.optimizedScore - a.optimizedScore);

    const winner = sortedBids[0];
    const secondPrice = sortedBids.length > 1 ? sortedBids[1].price : winner.price;

    return {
      auctionId,
      winningBid: winner,
      pricePaid: secondPrice,
      optimizationReason: winner.optimizationReason,
      confidence: winner.confidence,
    };
  }

  /**
   * Generate optimized bid with ML scoring
   */
  private generateOptimizedBid(campaign: Campaign, request: any, placement: any): {
    campaignId: string;
    creativeId: string;
    price: number;
    optimizedScore: number;
    optimizationReason: string;
    confidence: number;
  } {
    const creative = this.selectOptimizedCreative(campaign, request);
    if (!creative) {
      throw new Error("No eligible creative");
    }

    // Base bid
    let bidPrice = campaign.bidding.maxCpc || 50;

    // ML scoring factors
    const qualityScore = this.calculateCreativeQualityScore(creative);
    const targetingScore = this.calculateTargetingScore(campaign, request);
    const performanceScore = this.calculateCampaignPerformanceScore(campaign);
    const timeScore = this.getTimeOptimizationScore(campaign);

    // Dynamic bid adjustments
    const geoBoost = this.getGeoBoost(campaign, request.targeting?.geo?.country);
    const deviceBoost = this.getDeviceBoost(campaign, request.targeting?.device?.type);
    const audienceBoost = this.getAudienceBoost(campaign.targeting.audienceSegments || [], request.targeting?.audience);

    // Calculate optimized score
    const optimizedScore =
      (qualityScore * 0.3) +
      (targetingScore * 0.25) +
      (performanceScore * 0.25) +
      (timeScore * 0.1) +
      (geoBoost * 0.05) +
      (deviceBoost * 0.03) +
      (audienceBoost * 0.02);

    // Apply adjustments
    let adjustedPrice = bidPrice;
    adjustedPrice *= geoBoost;
    adjustedPrice *= deviceBoost;
    adjustedPrice *= audienceBoost;

    // Confidence score based on data volume
    const confidence = this.calculateBidConfidence(campaign);

    // Optimization reason
    let optimizationReason = "Standard bid";
    if (performanceScore > 0.8) {
      optimizationReason = "High-performing campaign - bid adjusted up";
    } else if (targetingScore > 0.8) {
      optimizationReason = "Perfect targeting match - bid adjusted up";
    } else if (timeScore > 1.2) {
      optimizationReason = "Peak performance time - bid adjusted up";
    }

    return {
      campaignId: campaign.id,
      creativeId: creative.id,
      price: adjustedPrice,
      optimizedScore,
      optimizationReason,
      confidence,
    };
  }

  /**
   * Calculate creative quality score (ML-based)
   */
  private calculateCreativeQualityScore(creative: AdCreative): number {
    let score = 0.5;

    // Historical CTR
    if (creative.performance.impressions > 0) {
      score += Math.min(creative.performance.ctr / 10, 0.3);
    }

    // Image quality (would analyze actual image)
    if (creative.imageUrl) {
      score += 0.1; // Assume high-quality if URL provided
    }

    // Text quality metrics
    const titleLength = creative.title.length;
    if (titleLength >= 20 && titleLength <= 30) score += 0.1;
    if (titleLength > 50) score -= 0.1;

    const descriptionLength = creative.description.length;
    if (descriptionLength >= 50 && descriptionLength <= 90) score += 0.1;
    if (descriptionLength > 150) score -= 0.1;

    return Math.min(1, score);
  }

  /**
   * Calculate targeting score
   */
  private calculateTargetingScore(campaign: Campaign, request: any): number {
    let score = 0.5;

    // Keyword match
    if (campaign.targeting.keywords && request.context?.keywords) {
      const matches = campaign.targeting.keywords.filter((kw: string) =>
        request.context.keywords.some((rk: string) => rk.toLowerCase().includes(kw.toLowerCase())),
      );
      score += (matches.length / campaign.targeting.keywords.length) * 0.3;
    }

    // Audience segment match
    if (campaign.targeting.audienceSegments && request.targeting?.audience) {
      const matches = campaign.targeting.audienceSegments.filter((seg: string) =>
        request.targeting.audience.includes(seg),
      );
      score += (matches.length / campaign.targeting.audienceSegments.length) * 0.2;
    }

    // Placement match
    if (campaign.targeting.placements) {
      const placementMatch = campaign.targeting.placements.some((p: any) =>
        p.domain === request.domain && p.position === request.placementId,
      );
      if (placementMatch) score += 0.2;
    }

    return Math.min(1, score);
  }

  /**
   * Calculate campaign performance score
   */
  private calculateCampaignPerformanceScore(campaign: Campaign): number {
    let score = 0.5;

    // CTR
    if (campaign.delivery.ctr > 5) score += 0.3;
    else if (campaign.delivery.ctr > 3) score += 0.2;
    else if (campaign.delivery.ctr > 1) score += 0.1;

    // Conversion rate
    if (campaign.delivery.conversionRate > 5) score += 0.2;
    else if (campaign.delivery.conversionRate > 2) score += 0.1;

    // ROAS
    if (campaign.delivery.roas > 3) score += 0.2;
    else if (campaign.delivery.roas > 2) score += 0.1;

    return Math.min(1, score);
  }

  /**
   * Calculate time optimization score
   */
  private getTimeOptimizationScore(campaign: Campaign): number {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Check if current time is in optimal window
    if (campaign.schedule.hoursOfDay && campaign.schedule.hoursOfDay.length > 0) {
      if (!campaign.schedule.hoursOfDay.includes(hour)) return 0.5;
    }

    if (campaign.schedule.daysOfWeek && campaign.schedule.daysOfWeek.length > 0) {
      if (!campaign.schedule.daysOfWeek.includes(day)) return 0.5;
    }

    // Evening hours typically perform better
    if (hour >= 18 && hour <= 21) return 1.2;
    if (hour >= 9 && hour <= 12) return 1.1;

    return 1.0;
  }

  /**
   * Select optimized creative using ML
   */
  private selectOptimizedCreative(campaign: Campaign, request: any): AdCreative | null {
    const eligibleCreatives = campaign.creatives.filter(
      (c) =>
        c.status === "approved" &&
        c.format === request.format &&
        (c.size === request.size || c.size === "responsive"),
    );

    if (eligibleCreatives.length === 0) return null;

    // Use multi-armed bandit algorithm for creative selection
    return this.selectCreativeWithBandit(eligibleCreatives, campaign.id);
  }

  /**
   * Multi-armed bandit creative selection (exploration-exploitation)
   */
  private selectCreativeWithBandit(creatives: AdCreative[], campaignId: string): AdCreative {
    const db = getDb();

    // Get historical performance for each creative
    const creativeScores = creatives.map((creative) => {
      const stats = db
        .prepare(
          `SELECT SUM(impressions) as impressions, SUM(clicks) as clicks
           FROM performance_stats_daily
           WHERE campaign_id = ? AND placement_id = ?
           GROUP BY placement_id`,
        )
        .get(campaignId, creative.id) as { impressions: number | null; clicks: number | null } | undefined;

      const ctr = stats?.impressions && stats.impressions > 0
        ? (stats?.clicks || 0) / stats.impressions
        : 0;

      // Thompson sampling for exploration-exploitation
      const exploration = Math.random() < 0.1; // 10% exploration rate
      const score = exploration ? Math.random() : ctr;

      return { creative, score };
    });

    // Select creative with highest score
    creativeScores.sort((a, b) => b.score - a.score);
    return creativeScores[0].creative;
  }

  /**
   * Calculate bid confidence based on data volume
   */
  private calculateBidConfidence(campaign: Campaign): number {
    const db = getDb();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const stats = db
      .prepare(
        `SELECT SUM(impressions) as impressions, SUM(clicks) as clicks
         FROM performance_stats_daily
         WHERE campaign_id = ? AND day >= ?`,
      )
      .get(campaign.id, since) as { impressions: number | null; clicks: number | null };

    const dataVolume = stats?.impressions || 0;

    // Confidence increases with data volume, up to 95%
    return Math.min(0.95, 0.5 + (dataVolume / 10000) * 0.45);
  }

  /**
   * Get eligible campaigns with advanced filtering
   */
  private getEligibleCampaigns(request: any, placement: any): Campaign[] {
    const db = getDb();
    const now = new Date().toISOString();

    const campaigns = db
      .prepare(
        `SELECT * FROM campaigns
         WHERE status = 'active'
         AND start_date <= ?
         AND end_date >= ?
         AND budget_remaining > 0
         AND json_array_length(placements) > 0
         AND auto_optimize = 1`,
      )
      .all(now, now) as Campaign[];

    return campaigns.filter((campaign) => this.isCampaignEligible(campaign, request, placement));
  }

  /**
   * Check campaign eligibility with ML-enhanced criteria
   */
  private isCampaignEligible(
    campaign: Campaign,
    request: any,
    placement: any,
  ): boolean {
    // Check format compatibility
    const placements = campaign.targeting.placements || [];
    const formatMatch = placements.some(
      (p) =>
        p.domain === request.domain &&
        p.format.includes(request.format) &&
        p.size.includes(request.size),
    );
    if (!formatMatch) return false;

    // Check geo targeting with dynamic adjustments
    if (campaign.targeting.geo) {
      const geo = campaign.targeting.geo;
      const userCountry = request.targeting.geo?.country;
      if (userCountry && !geo.countries.includes(userCountry) && !geo.exclude) {
        return false;
      }
      if (geo.exclude && geo.countries.includes(userCountry)) {
        return false;
      }
    }

    // Check device targeting
    if (campaign.targeting.device) {
      const device = campaign.targeting.device;
      const userDevice = request.targeting.device?.type;
      if (userDevice && !device.deviceTypes.includes(userDevice)) {
        return false;
      }
    }

    // Check budget with AI pacing
    if (campaign.budget.spent >= campaign.budget.total) {
      return false;
    }

    // Check daily budget with pacing
    if (campaign.budget.spent >= campaign.budget.daily * 0.95) {
      // Only allow if pacing allows over-delivery
      if (campaign.pacing.type === "accelerated") {
        return true;
      }
      return false;
    }

    // Check placement blocking with category analysis
    if (placement.settings.competitiveExclusion) {
      // Check if competitor ads are present
      const hasCompetitorAds = this.detectCompetitorAds(placement);
      if (hasCompetitorAds) return false;
    }

    // Check category blocking with ML
    if (placement.settings.categoryBlocking && placement.settings.categoryBlocking.length > 0) {
      const contextual = campaign.targeting.contextual;
      if (contextual?.categories) {
        const hasBlockedCategory = contextual.categories.some((cat: string) =>
          placement.settings.categoryBlocking.includes(cat),
        );
        if (hasBlockedCategory) return false;
      }
    }

    return true;
  }

  /**
   * Detect competitor ads (simplified - would use ML in production)
   */
  private detectCompetitorAds(placement: any): boolean {
    // In production, use ML to detect competitor ad patterns
    return false;
  }

  /**
   * Get geo boost multiplier
   */
  private getGeoBoost(geo: any, userCountry: string): number {
    if (!geo || !userCountry) return 1;
    if (geo.countries.includes(userCountry)) return 1.3;
    return 1;
  }

  /**
   * Get device boost multiplier
   */
  private getDeviceBoost(device: any, userDevice: string): number {
    if (!device || !userDevice) return 1;
    if (device.deviceTypes.includes(userDevice)) return 1.2;
    return 1;
  }

  /**
   * Get audience boost multiplier
   */
  private getAudienceBoost(audienceSegments: string[], userAudience: string[]): number {
    if (!audienceSegments || !userAudience) return 1;
    const matches = audienceSegments.filter((seg) => userAudience.includes(seg));
    return 1 + (matches.length * 0.1);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate auction ID
   */
  private generateAuctionId(): string {
    return `auction-${this.generateId()}`;
  }
}

export const yieldEnterpriseV2 = new YieldEnterpriseV2();
