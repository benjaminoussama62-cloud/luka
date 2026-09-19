/**
 * Ayeba Ad Server Core - Enterprise Ad Serving Engine
 * Multi-platform distributed ad serving with real-time bidding
 */

import { getDb } from "@/lib/storage/database";
import type {
  AdRequest,
  AdResponse,
  Campaign,
  AdCreative,
  AuctionResult,
  AuctionBid,
  NetworkDomain,
  FraudDetection,
  PublisherSite,
  SitePlacement,
} from "./ad-network-types";

export class AdServer {
  private static instance: AdServer;
  private readonly NETWORK_DOMAINS: NetworkDomain[] = [
    "ayeba.app",
    "omega-web.org",
    "sombatekaonline.com",
    "jemsa.net",
    "tala.cd",
  ];

  private constructor() {}

  static getInstance(): AdServer {
    if (!AdServer.instance) {
      AdServer.instance = new AdServer();
    }
    return AdServer.instance;
  }

  /**
   * Process ad request - main entry point for ad serving
   */
  async processRequest(request: AdRequest): Promise<AdResponse> {
    const startTime = Date.now();

    // Validate request
    if (!this.isValidDomain(request.domain)) {
      return this.buildNoFillResponse(request, "blocked", startTime);
    }

    // Fraud detection
    const fraudCheck = this.detectFraud(request);
    if (fraudCheck.action === "block") {
      return this.buildNoFillResponse(request, "blocked", startTime);
    }

    // Get placement details
    const placement = this.getPlacement(request.placementId);
    if (!placement || placement.status !== "active") {
      return this.buildNoFillResponse(request, "no_inventory", startTime);
    }

    // Check floor price
    if (placement.settings.minCpm && placement.settings.minCpm > 0) {
      request.pricing = {
        floorPrice: placement.settings.minCpm,
        winningPrice: 0,
        currency: "CDF",
      };
    }

    // Run auction
    const auction = await this.runAuction(request, placement);

    // Build response
    if (auction.winner) {
      const response = this.buildWinningResponse(request, auction, startTime);
      await this.recordImpression(request, auction, response);
      return response;
    }

    return this.buildNoFillResponse(request, auction.winner ? undefined : "no_inventory", startTime);
  }

  /**
   * Run real-time bidding auction
   */
  private async runAuction(request: AdRequest, placement: SitePlacement): Promise<AuctionResult> {
    const auctionId = this.generateAuctionId();
    const eligibleCampaigns = this.getEligibleCampaigns(request, placement);

    if (eligibleCampaigns.length === 0) {
      return {
        auctionId,
        requestId: request.requestId,
        timestamp: new Date().toISOString(),
        bids: [],
        clearingPrice: request.pricing?.floorPrice || 0,
        latency: 0,
      };
    }

    // Generate bids
    const bids: AuctionBid[] = eligibleCampaigns.map((campaign) =>
      this.generateBid(campaign, request, placement),
    );

    // Filter bids below floor price
    const validBids = bids.filter(
      (bid) => bid.finalPrice >= (request.pricing?.floorPrice || 0),
    );

    if (validBids.length === 0) {
      return {
        auctionId,
        requestId: request.requestId,
        timestamp: new Date().toISOString(),
        bids,
        clearingPrice: request.pricing?.floorPrice || 0,
        latency: 0,
      };
    }

    // Second-price auction
    const sortedBids = validBids.sort((a, b) => b.finalPrice - a.finalPrice);
    const winner = sortedBids[0];
    const secondPrice = sortedBids.length > 1 ? sortedBids[1].finalPrice : winner.finalPrice;

    return {
      auctionId,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
      bids: sortedBids,
      winner: {
        campaignId: winner.campaignId,
        creativeId: winner.creativeId,
        price: winner.finalPrice,
        secondPrice,
      },
      clearingPrice: secondPrice,
      latency: 0,
    };
  }

  /**
   * Get eligible campaigns for this request
   */
  private getEligibleCampaigns(request: AdRequest, placement: SitePlacement): Campaign[] {
    const db = getDb();
    const now = new Date().toISOString();

    const campaigns = db
      .prepare(
        `SELECT * FROM campaigns
         WHERE status = 'active'
         AND start_date <= ?
         AND end_date >= ?
         AND budget_remaining > 0
         AND json_array_length(placements) > 0`,
      )
      .all(now, now) as Campaign[];

    return campaigns.filter((campaign) => this.isCampaignEligible(campaign, request, placement));
  }

  /**
   * Check if campaign is eligible for this request
   */
  private isCampaignEligible(
    campaign: Campaign,
    request: AdRequest,
    placement: SitePlacement,
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

    // Check geo targeting
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

    // Check budget
    if (campaign.budget.spent >= campaign.budget.total) {
      return false;
    }

    // Check daily budget
    if (campaign.budget.spent >= campaign.budget.daily) {
      return false;
    }

    // Check placement blocking
    if (placement.settings.competitiveExclusion) {
      // Implement competitive exclusion logic
    }

    // Check category blocking
    if (placement.settings.categoryBlocking && placement.settings.categoryBlocking.length > 0) {
      const contextual = campaign.targeting.contextual;
      if (contextual?.categories) {
        const hasBlockedCategory = contextual.categories.some((cat) =>
          placement.settings.categoryBlocking.includes(cat),
        );
        if (hasBlockedCategory) return false;
      }
    }

    return true;
  }

  /**
   * Generate bid for campaign
   */
  private generateBid(
    campaign: Campaign,
    request: AdRequest,
    placement: SitePlacement,
  ): AuctionBid {
    const creative = this.selectCreative(campaign, request);
    if (!creative) {
      throw new Error("No eligible creative");
    }

    // Base bid calculation
    let bidPrice = campaign.bidding.maxCpc || 0;

    // Quality score (0-1)
    const qualityScore = this.calculateQualityScore(campaign, creative, placement);

    // Targeting score (0-1)
    const targetingScore = this.calculateTargetingScore(campaign, request);

    // Bid adjustments
    const bidAdjustments: Record<string, number> = {};

    // Geo adjustment
    if (campaign.targeting.geo && request.targeting.geo) {
      const geoBoost = this.getGeoBoost(campaign.targeting.geo, request.targeting.geo.country);
      if (geoBoost > 1) {
        bidAdjustments.geo = geoBoost;
      }
    }

    // Device adjustment
    if (campaign.targeting.device && request.targeting.device) {
      const deviceBoost = this.getDeviceBoost(campaign.targeting.device, request.targeting.device.type);
      if (deviceBoost > 1) {
        bidAdjustments.device = deviceBoost;
      }
    }

    // Time adjustment
    const timeBoost = this.getTimeBoost(campaign.schedule);
    if (timeBoost > 1) {
      bidAdjustments.time = timeBoost;
    }

    // Apply adjustments
    let adjustedPrice = bidPrice;
    Object.values(bidAdjustments).forEach((boost) => {
      adjustedPrice *= boost;
    });

    // Final price with quality and targeting
    const finalPrice = adjustedPrice * qualityScore * targetingScore;

    return {
      campaignId: campaign.id,
      creativeId: creative.id,
      bidPrice,
      bidStrategy: campaign.bidding.strategy,
      targetingScore,
      qualityScore,
      bidAdjustments,
      finalPrice,
    };
  }

  /**
   * Select best creative for campaign
   */
  private selectCreative(campaign: Campaign, request: AdRequest): AdCreative | null {
    const eligibleCreatives = campaign.creatives.filter(
      (c) =>
        c.status === "approved" &&
        c.format === request.format &&
        (c.size === request.size || c.size === "responsive"),
    );

    if (eligibleCreatives.length === 0) return null;

    // Rotate or optimize based on campaign settings
    if (campaign.settings.rotation === "rotate_evenly") {
      return eligibleCreatives[Math.floor(Math.random() * eligibleCreatives.length)];
    }

    // Optimize - select best performing creative
    return eligibleCreatives.sort((a, b) => b.performance.ctr - a.performance.ctr)[0];
  }

  /**
   * Calculate quality score (0-1)
   */
  private calculateQualityScore(
    campaign: Campaign,
    creative: AdCreative,
    placement: SitePlacement,
  ): number {
    let score = 0.5;

    // Historical CTR
    if (creative.performance.impressions > 0) {
      score += Math.min(creative.performance.ctr / 10, 0.3);
    }

    // Campaign conversion rate
    if (campaign.delivery.conversions > 0) {
      score += Math.min(campaign.delivery.conversionRate / 5, 0.2);
    }

    // Placement quality
    score += placement.ecpm / 1000;

    return Math.min(score, 1);
  }

  /**
   * Calculate targeting score (0-1)
   */
  private calculateTargetingScore(campaign: Campaign, request: AdRequest): number {
    let score = 0.5;

    // Keyword match
    if (campaign.targeting.keywords && request.context.keywords) {
      const matches = campaign.targeting.keywords.filter((kw) =>
        request.context.keywords.some((rk) => rk.toLowerCase().includes(kw.toLowerCase())),
      );
      score += (matches.length / campaign.targeting.keywords.length) * 0.3;
    }

    // Audience segment match
    if (campaign.targeting.audienceSegments && request.targeting.audience) {
      const matches = campaign.targeting.audienceSegments.filter((seg) =>
        request.targeting.audience.includes(seg),
      );
      score += (matches.length / campaign.targeting.audienceSegments.length) * 0.2;
    }

    return Math.min(score, 1);
  }

  /**
   * Get geo boost multiplier
   */
  private getGeoBoost(geo: any, userCountry: string): number {
    if (!geo || !userCountry) return 1;
    // Implement geo-specific boost logic
    return 1;
  }

  /**
   * Get device boost multiplier
   */
  private getDeviceBoost(device: any, userDevice: string): number {
    if (!device || !userDevice) return 1;
    // Implement device-specific boost logic
    return 1;
  }

  /**
   * Get time boost multiplier
   */
  private getTimeBoost(schedule: any): number {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Check if current time is in schedule
    if (schedule.hoursOfDay && schedule.hoursOfDay.length > 0) {
      if (!schedule.hoursOfDay.includes(hour)) return 0.5;
    }

    if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
      if (!schedule.daysOfWeek.includes(day)) return 0.5;
    }

    return 1;
  }

  /**
   * Build winning response
   */
  private buildWinningResponse(
    request: AdRequest,
    auction: AuctionResult,
    startTime: number,
  ): AdResponse {
    if (!auction.winner) {
      return this.buildNoFillResponse(request, "no_inventory", startTime);
    }

    const campaign = this.getCampaign(auction.winner.campaignId);
    const creative = this.getCreative(auction.winner.creativeId);

    if (!campaign || !creative) {
      return this.buildNoFillResponse(request, "no_inventory", startTime);
    }

    return {
      requestId: request.requestId,
      ad: {
        creativeId: creative.id,
        campaignId: campaign.id,
        format: creative.format,
        size: creative.size,
        creative: {
          title: creative.title,
          description: creative.description,
          imageUrl: creative.imageUrl,
          videoUrl: creative.videoUrl,
          landingUrl: creative.landingUrl,
          displayUrl: creative.displayUrl,
        },
        tracking: {
          impressionUrl: this.buildTrackingUrl("impression", request.requestId, creative.id),
          clickUrl: this.buildTrackingUrl("click", request.requestId, creative.id),
          viewThroughUrl: this.buildTrackingUrl("viewthrough", request.requestId, creative.id),
        },
        bid: {
          price: auction.winner.price,
          currency: "CDF",
          auctionId: auction.auctionId,
        },
      },
      pricing: {
        floorPrice: request.pricing?.floorPrice || 0,
        winningPrice: auction.winner.price,
        currency: "CDF",
      },
      latency: Date.now() - startTime,
    };
  }

  /**
   * Build no-fill response
   */
  private buildNoFillResponse(
    request: AdRequest,
    reason: string,
    startTime: number,
  ): AdResponse {
    return {
      requestId: request.requestId,
      noFillReason: reason as any,
      pricing: {
        floorPrice: request.pricing?.floorPrice || 0,
        winningPrice: 0,
        currency: "CDF",
      },
      latency: Date.now() - startTime,
    };
  }

  /**
   * Record impression
   */
  private async recordImpression(
    request: AdRequest,
    auction: AuctionResult,
    response: AdResponse,
  ): Promise<void> {
    const db = getDb();

    // Record ad request
    db.prepare(
      `INSERT INTO ad_requests (
        id, request_id, timestamp, domain, placement_id, format, size,
        user_agent, ip_hash, user_id, session_id, page_url, referrer,
        context, targeting, response, no_fill_reason, floor_price,
        winning_price, currency, latency_ms, auction_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      this.generateId(),
      request.requestId,
      request.timestamp,
      request.domain,
      request.placementId,
      request.format,
      request.size,
      request.userAgent,
      this.hashIp(request.ip),
      request.userId || null,
      request.sessionId || null,
      request.pageUrl,
      request.referrer || null,
      JSON.stringify(request.context),
      JSON.stringify(request.targeting),
      JSON.stringify(response),
      response.noFillReason || null,
      request.pricing?.floorPrice || 0,
      response.pricing?.winningPrice || 0,
      response.pricing?.currency || "CDF",
      response.latency,
      auction.auctionId,
    );

    // Record auction
    db.prepare(
      `INSERT INTO auctions (
        id, request_id, timestamp, bids, winner_campaign_id, winner_creative_id,
        winning_price, second_price, clearing_price, latency_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      this.generateId(),
      request.requestId,
      auction.timestamp,
      JSON.stringify(auction.bids),
      auction.winner?.campaignId || null,
      auction.winner?.creativeId || null,
      auction.winner?.price || 0,
      auction.winner?.secondPrice || 0,
      auction.clearingPrice,
      auction.latency,
    );

    // Update campaign stats
    if (auction.winner) {
      this.updateCampaignStats(auction.winner.campaignId, auction.winner.price);
    }
  }

  /**
   * Update campaign stats
   */
  private updateCampaignStats(campaignId: string, cost: number): void {
    const db = getDb();
    db.prepare(
      `UPDATE campaigns
       SET budget_spent = budget_spent + ?,
           budget_remaining = budget_remaining - ?,
           impressions = impressions + 1
       WHERE id = ?`,
    ).run(cost, cost, campaignId);
  }

  /**
   * Get placement details
   */
  private getPlacement(placementId: string): SitePlacement | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM site_placements WHERE id = ?")
      .get(placementId) as SitePlacement | undefined;
    return row || null;
  }

  /**
   * Get campaign by ID
   */
  private getCampaign(campaignId: string): Campaign | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM campaigns WHERE id = ?")
      .get(campaignId) as Campaign | undefined;
    return row || null;
  }

  /**
   * Get creative by ID
   */
  private getCreative(creativeId: string): AdCreative | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM ad_creatives WHERE id = ?")
      .get(creativeId) as AdCreative | undefined;
    return row || null;
  }

  /**
   * Fraud detection
   */
  private detectFraud(request: AdRequest): FraudDetection {
    const signals = [];
    let score = 0;

    // IP analysis
    if (this.isSuspiciousIp(request.ip)) {
      signals.push({
        type: "ip_suspicious" as const,
        severity: 8,
        description: "Suspicious IP address",
        value: request.ip,
      });
      score += 8;
    }

    // User agent analysis
    if (this.isBotUserAgent(request.userAgent)) {
      signals.push({
        type: "bot" as const,
        severity: 10,
        description: "Bot-like user agent",
        value: request.userAgent,
      });
      score += 10;
    }

    // Velocity check
    if (this.hasHighVelocity(request.userId, request.sessionId)) {
      signals.push({
        type: "velocity" as const,
        severity: 6,
        description: "High request velocity",
        value: request.userId || request.sessionId,
      });
      score += 6;
    }

    const riskLevel = score >= 10 ? "critical" : score >= 6 ? "high" : score >= 3 ? "medium" : "low";
    const action = score >= 10 ? "block" : score >= 6 ? "flag" : "allow";

    return {
      requestId: request.requestId,
      timestamp: request.timestamp,
      score,
      riskLevel,
      signals,
      action,
    };
  }

  /**
   * Check if IP is suspicious
   */
  private isSuspiciousIp(ip: string): boolean {
    // Implement IP reputation check
    return false;
  }

  /**
   * Check if user agent is bot-like
   */
  private isBotUserAgent(userAgent: string): boolean {
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
    ];
    return botPatterns.some((pattern) => pattern.test(userAgent));
  }

  /**
   * Check for high velocity requests
   */
  private hasHighVelocity(userId?: string, sessionId?: string): boolean {
    if (!userId && !sessionId) return false;

    const db = getDb();
    const identifier = userId || sessionId;
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

    const count = db
      .prepare(
        `SELECT COUNT(*) as c FROM ad_requests
         WHERE (user_id = ? OR session_id = ?)
         AND timestamp >= ?`,
      )
      .get(identifier, identifier, oneMinuteAgo) as { c: number };

    return count.c > 100; // More than 100 requests per minute
  }

  /**
   * Validate domain
   */
  private isValidDomain(domain: string): boolean {
    return this.NETWORK_DOMAINS.includes(domain as NetworkDomain);
  }

  /**
   * Build tracking URL
   */
  private buildTrackingUrl(type: string, requestId: string, creativeId: string): string {
    return `https://ayeba.app/api/ads/track?type=${type}&request=${requestId}&creative=${creativeId}`;
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

  /**
   * Hash IP for privacy
   */
  private hashIp(ip: string): string {
    // Simple hash - in production use proper cryptographic hash
    return ip.split(".").map((x) => parseInt(x, 10)).join("-");
  }
}

export const adServer = AdServer.getInstance();
