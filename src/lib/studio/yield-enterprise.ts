/**
 * Ayeba Yield Enterprise - Campaign & Publisher Management
 * Multi-platform ad network management system
 */

import { getDb } from "@/lib/storage/database";
import type {
  Campaign,
  AdCreative,
  Advertiser,
  Publisher,
  PublisherSite,
  SitePlacement,
  Invoice,
  Transaction,
  PerformanceReport,
  AudienceSegment,
} from "./ad-network-types";

export class YieldEnterprise {
  /**
   * Create new advertiser account
   */
  createAdvertiser(input: {
    userId: string;
    companyName: string;
    billingCurrency?: string;
    taxId?: string;
  }): Advertiser {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO advertisers (
        id, user_id, company_name, status, verification_status,
        billing_currency, tax_id, credit_limit, current_balance,
        available_credit, policy_acceptance, created_at, updated_at
      ) VALUES (?, ?, ?, 'pending', 'pending', ?, ?, 0, 0, 0, ?, ?, ?)`,
    ).run(
      id,
      input.userId,
      input.companyName,
      input.billingCurrency || "CDF",
      input.taxId || null,
      now,
      now,
      now,
    );

    return this.getAdvertiser(id);
  }

  /**
   * Get advertiser by ID
   */
  getAdvertiser(id: string): Advertiser | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM advertisers WHERE id = ?")
      .get(id) as Advertiser | undefined;
    return row || null;
  }

  /**
   * Get advertiser by user ID
   */
  getAdvertiserByUserId(userId: string): Advertiser | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM advertisers WHERE user_id = ?")
      .get(userId) as Advertiser | undefined;
    return row || null;
  }

  /**
   * Create new campaign
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
    targeting?: any;
  }): Campaign {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO campaigns (
        id, advertiser_id, name, type, status, daily_budget, total_budget,
        budget_spent, budget_remaining, bidding_strategy, max_cpc,
        start_date, end_date, time_zone, geo_targeting, device_targeting,
        audience_segments, keywords, placements, contextual_targeting,
        frequency_cap, pacing_type, auto_optimize, rotation,
        exclude_competitors, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'draft', ?, ?, 0, ?, ?, ?, ?, ?, 'Africa/Kinshasa', '{}', '{}', '[]', '[]', '[]', '{}', '{}', 'standard', 0, 'optimize', 0, ?, ?)`,
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
      input.startDate,
      input.endDate,
      JSON.stringify(input.targeting || {}),
      now,
      now,
    );

    return this.getCampaign(id);
  }

  /**
   * Get campaign by ID
   */
  getCampaign(id: string): Campaign | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM campaigns WHERE id = ?")
      .get(id) as Campaign | undefined;
    if (!row) return null;

    // Parse JSON fields
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
    };
  }

  /**
   * Get campaigns for advertiser
   */
  getAdvertiserCampaigns(advertiserId: string): Campaign[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM campaigns WHERE advertiser_id = ? ORDER BY created_at DESC")
      .all(advertiserId) as Campaign[];

    return rows.map((row) => this.getCampaign(row.id)).filter((c): c is Campaign => c !== null);
  }

  /**
   * Update campaign status
   */
  updateCampaignStatus(campaignId: string, status: string): Campaign | null {
    const db = getDb();
    const now = new Date().toISOString();

    const updates: Record<string, any> = { status, updated_at: now };

    if (status === "active" && !this.getCampaign(campaignId)?.startedAt) {
      updates.started_at = now;
    }

    if (status === "completed" || status === "paused") {
      updates.ended_at = now;
    }

    const setClause = Object.keys(updates)
      .map((k) => `${k} = ?`)
      .join(", ");
    const values = Object.values(updates);

    db.prepare(`UPDATE campaigns SET ${setClause} WHERE id = ?`).run(...values, campaignId);

    return this.getCampaign(campaignId);
  }

  /**
   * Add creative to campaign
   */
  addCreative(input: {
    campaignId: string;
    format: string;
    size: string;
    title: string;
    description: string;
    imageUrl?: string;
    videoUrl?: string;
    landingUrl: string;
    displayUrl: string;
  }): AdCreative {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO ad_creatives (
        id, campaign_id, format, size, title, description, image_url,
        video_url, landing_url, display_url, status, is_valid,
        auto_approved, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, 0, ?, ?)`,
    ).run(
      id,
      input.campaignId,
      input.format,
      input.size,
      input.title,
      input.description,
      input.imageUrl || null,
      input.videoUrl || null,
      input.landingUrl,
      input.displayUrl,
      now,
      now,
    );

    return this.getCreative(id);
  }

  /**
   * Get creative by ID
   */
  getCreative(id: string): AdCreative | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM ad_creatives WHERE id = ?")
      .get(id) as AdCreative | undefined;
    if (!row) return null;

    return {
      ...row,
      tracking_pixels: JSON.parse(row.tracking_pixels as string),
    };
  }

  /**
   * Get creatives for campaign
   */
  getCampaignCreatives(campaignId: string): AdCreative[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM ad_creatives WHERE campaign_id = ?")
      .all(campaignId) as AdCreative[];

    return rows.map((row) => ({
      ...row,
      tracking_pixels: JSON.parse(row.tracking_pixels as string),
    }));
  }

  /**
   * Approve creative
   */
  approveCreative(creativeId: string, reviewedBy: string): AdCreative | null {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE ad_creatives
       SET status = 'approved', is_valid = 1, reviewed_at = ?, reviewed_by = ?, updated_at = ?
       WHERE id = ?`,
    ).run(now, reviewedBy, now, creativeId);

    return this.getCreative(creativeId);
  }

  /**
   * Reject creative
   */
  rejectCreative(creativeId: string, reason: string, reviewedBy: string): AdCreative | null {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE ad_creatives
       SET status = 'rejected', is_valid = 0, rejected_reason = ?, reviewed_at = ?, reviewed_by = ?, updated_at = ?
       WHERE id = ?`,
    ).run(reason, now, reviewedBy, now, creativeId);

    return this.getCreative(creativeId);
  }

  /**
   * Create publisher account
   */
  createPublisher(input: {
    userId: string;
    companyName: string;
    payoutCurrency?: string;
    taxId?: string;
  }): Publisher {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO publishers (
        id, user_id, company_name, status, verification_status,
        payout_currency, tax_id, minimum_payout, balance,
        pending_balance, lifetime_earnings, policy_acceptance,
        created_at, updated_at
      ) VALUES (?, ?, ?, 'pending', 'pending', ?, ?, 50000, 0, 0, 0, ?, ?, ?)`,
    ).run(
      id,
      input.userId,
      input.companyName,
      input.payoutCurrency || "CDF",
      input.taxId || null,
      now,
      now,
      now,
    );

    return this.getPublisher(id);
  }

  /**
   * Get publisher by ID
   */
  getPublisher(id: string): Publisher | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM publishers WHERE id = ?")
      .get(id) as Publisher | undefined;
    if (!row) return null;

    return {
      ...row,
      payment_methods: JSON.parse(row.payment_methods as string),
      payout_details: JSON.parse(row.payout_details as string),
    };
  }

  /**
   * Get publisher by user ID
   */
  getPublisherByUserId(userId: string): Publisher | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM publishers WHERE user_id = ?")
      .get(userId) as Publisher | undefined;
    return row || null;
  }

  /**
   * Add publisher site
   */
  addPublisherSite(input: {
    publisherId: string;
    domain: string;
    categories?: string[];
  }): PublisherSite {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO publisher_sites (
        id, publisher_id, domain, status, verification_status,
        categories, revenue_share_rate, revenue_tier,
        ad_policy_compliant, content_quality, created_at, updated_at
      ) VALUES (?, ?, ?, 'pending', 'pending', ?, 0.7, 'standard', 1, 'medium', ?, ?)`,
    ).run(
      id,
      input.publisherId,
      input.domain,
      JSON.stringify(input.categories || []),
      now,
      now,
    );

    return this.getPublisherSite(id);
  }

  /**
   * Get publisher site by ID
   */
  getPublisherSite(id: string): PublisherSite | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM publisher_sites WHERE id = ?")
      .get(id) as PublisherSite | undefined;
    if (!row) return null;

    return {
      ...row,
      categories: JSON.parse(row.categories as string),
      placements: this.getSitePlacements(id),
    };
  }

  /**
   * Get sites for publisher
   */
  getPublisherSites(publisherId: string): PublisherSite[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM publisher_sites WHERE publisher_id = ?")
      .all(publisherId) as PublisherSite[];

    return rows.map((row) => this.getPublisherSite(row.id)).filter((s): s is PublisherSite => s !== null);
  }

  /**
   * Add placement to site
   */
  addPlacement(input: {
    siteId: string;
    name: string;
    slot: string;
    format: string;
    size: string;
    position: string;
  }): SitePlacement {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO site_placements (
        id, site_id, name, slot, format, size, position, status,
        competitive_exclusion, category_blocking, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 0, '[]', ?, ?)`,
    ).run(id, input.siteId, input.name, input.slot, input.format, input.size, input.position, now, now);

    return this.getPlacement(id);
  }

  /**
   * Get placement by ID
   */
  getPlacement(id: string): SitePlacement | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM site_placements WHERE id = ?")
      .get(id) as SitePlacement | undefined;
    if (!row) return null;

    return {
      ...row,
      category_blocking: JSON.parse(row.category_blocking as string),
    };
  }

  /**
   * Get placements for site
   */
  getSitePlacements(siteId: string): SitePlacement[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM site_placements WHERE site_id = ?")
      .all(siteId) as SitePlacement[];

    return rows.map((row) => ({
      ...row,
      category_blocking: JSON.parse(row.category_blocking as string),
    }));
  }

  /**
   * Create audience segment
   */
  createAudienceSegment(input: {
    advertiserId: string;
    name: string;
    description: string;
    rules: any[];
  }): AudienceSegment {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO audience_segments (
        id, advertiser_id, name, description, rules, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, input.advertiserId, input.name, input.description, JSON.stringify(input.rules), now);

    return this.getAudienceSegment(id);
  }

  /**
   * Get audience segment by ID
   */
  getAudienceSegment(id: string): AudienceSegment | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM audience_segments WHERE id = ?")
      .get(id) as AudienceSegment | undefined;
    if (!row) return null;

    return {
      ...row,
      rules: JSON.parse(row.rules as string),
    };
  }

  /**
   * Get segments for advertiser
   */
  getAdvertiserSegments(advertiserId: string): AudienceSegment[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM audience_segments WHERE advertiser_id = ?")
      .all(advertiserId) as AudienceSegment[];

    return rows.map((row) => ({
      ...row,
      rules: JSON.parse(row.rules as string),
    }));
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(input: {
    periodStart: string;
    periodEnd: string;
    campaignId?: string;
    publisherId?: string;
  }): PerformanceReport {
    const db = getDb();

    const whereClause = [];
    const params = [];

    if (input.campaignId) {
      whereClause.push("campaign_id = ?");
      params.push(input.campaignId);
    }

    if (input.publisherId) {
      whereClause.push("publisher_site_id = ?");
      params.push(input.publisherId);
    }

    whereClause.push("day >= ? AND day <= ?");
    params.push(input.periodStart.slice(0, 10), input.periodEnd.slice(0, 10));

    const where = whereClause.join(" AND ");

    const metrics = db
      .prepare(
        `SELECT
           SUM(impressions) as impressions,
           SUM(clicks) as clicks,
           SUM(conversions) as conversions,
           SUM(cost) as cost,
           SUM(revenue) as revenue
         FROM performance_stats_daily
         WHERE ${where}`,
      )
      .get(...params) as {
      impressions: number;
      clicks: number;
      conversions: number;
      cost: number;
      revenue: number;
    };

    const impressions = metrics.impressions || 0;
    const clicks = metrics.clicks || 0;
    const conversions = metrics.conversions || 0;
    const cost = metrics.cost || 0;
    const revenue = metrics.revenue || 0;

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const profit = revenue - cost;
    const roi = cost > 0 ? (profit / cost) * 100 : 0;
    const avgCpc = clicks > 0 ? cost / clicks : 0;
    const avgCpm = impressions > 0 ? (cost / impressions) * 1000 : 0;
    const avgCpa = conversions > 0 ? cost / conversions : 0;

    return {
      period: {
        start: input.periodStart,
        end: input.periodEnd,
      },
      campaignId: input.campaignId,
      publisherId: input.publisherId,
      metrics: {
        impressions,
        clicks,
        ctr,
        conversions,
        conversionRate,
        cost,
        revenue,
        profit,
        roi,
        avgCpc,
        avgCpm,
        avgCpa,
      },
      breakdown: {
        byDay: this.getDailyMetrics(whereClause, params),
        byGeo: this.getGeoMetrics(whereClause, params),
        byDevice: this.getDeviceMetrics(whereClause, params),
        byCreative: this.getCreativeMetrics(whereClause, params),
      },
    };
  }

  /**
   * Get daily metrics breakdown
   */
  private getDailyMetrics(whereClause: string[], params: any[]): any[] {
    const db = getDb();
    const where = whereClause.join(" AND ");

    const rows = db
      .prepare(
        `SELECT day, SUM(impressions) as impressions, SUM(clicks) as clicks,
                SUM(cost) as cost, SUM(revenue) as revenue
         FROM performance_stats_daily
         WHERE ${where}
         GROUP BY day
         ORDER BY day DESC`,
      )
      .all(...params) as any[];

    return rows.map((row) => ({
      date: row.day,
      impressions: row.impressions,
      clicks: row.clicks,
      cost: row.cost,
      revenue: row.revenue,
    }));
  }

  /**
   * Get geo metrics breakdown
   */
  private getGeoMetrics(whereClause: string[], params: any[]): any[] {
    const db = getDb();
    const baseWhere = whereClause.filter((w) => !w.includes("publisher_site_id")).join(" AND ");
    const baseParams = params.filter((p, i) => !whereClause[i].includes("publisher_site_id"));

    const rows = db
      .prepare(
        `SELECT country, SUM(impressions) as impressions, SUM(clicks) as clicks,
                SUM(cost) as cost, SUM(revenue) as revenue
         FROM performance_geo_daily
         WHERE ${baseWhere}
         GROUP BY country
         ORDER BY impressions DESC
         LIMIT 20`,
      )
      .all(...baseParams) as any[];

    return rows.map((row) => ({
      country: row.country,
      impressions: row.impressions,
      clicks: row.clicks,
      cost: row.cost,
      revenue: row.revenue,
    }));
  }

  /**
   * Get device metrics breakdown
   */
  private getDeviceMetrics(whereClause: string[], params: any[]): any[] {
    const db = getDb();
    const baseWhere = whereClause.filter((w) => !w.includes("publisher_site_id")).join(" AND ");
    const baseParams = params.filter((p, i) => !whereClause[i].includes("publisher_site_id"));

    const rows = db
      .prepare(
        `SELECT device_type as device, SUM(impressions) as impressions, SUM(clicks) as clicks,
                SUM(cost) as cost, SUM(revenue) as revenue
         FROM performance_device_daily
         WHERE ${baseWhere}
         GROUP BY device_type
         ORDER BY impressions DESC`,
      )
      .all(...baseParams) as any[];

    return rows.map((row) => ({
      device: row.device,
      impressions: row.impressions,
      clicks: row.clicks,
      cost: row.cost,
      revenue: row.revenue,
    }));
  }

  /**
   * Get creative metrics breakdown
   */
  private getCreativeMetrics(whereClause: string[], params: any[]): any[] {
    const db = getDb();
    const baseWhere = whereClause.filter((w) => !w.includes("publisher_site_id")).join(" AND ");
    const baseParams = params.filter((p, i) => !whereClause[i].includes("publisher_site_id"));

    const rows = db
      .prepare(
        `SELECT creative_id, c.title as creative_name,
                SUM(impressions) as impressions, SUM(clicks) as clicks,
                SUM(conversions) as conversions, SUM(cost) as cost
         FROM performance_stats_daily p
         JOIN ad_creatives c ON p.campaign_id = c.campaign_id
         WHERE ${baseWhere}
         GROUP BY creative_id, c.title
         ORDER BY impressions DESC
         LIMIT 20`,
      )
      .all(...baseParams) as any[];

    return rows.map((row) => ({
      creativeId: row.creative_id,
      creativeName: row.creative_name,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0,
      conversions: row.conversions,
      cost: row.cost,
    }));
  }

  /**
   * Create invoice
   */
  createInvoice(input: {
    type: "advertiser" | "publisher";
    userId: string;
    entityId: string;
    periodStart: string;
    periodEnd: string;
    items: any[];
  }): Invoice {
    const db = getDb();
    const id = this.generateId();
    const invoiceNumber = this.generateInvoiceNumber(input.type);
    const now = new Date().toISOString();
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const subtotal = input.items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.16; // 16% tax
    const total = subtotal + tax;

    db.prepare(
      `INSERT INTO invoices (
        id, invoice_number, type, user_id, entity_id, period_start, period_end,
        items, subtotal, tax, total, currency, status, due_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CDF', 'draft', ?, ?, ?)`,
    ).run(
      id,
      invoiceNumber,
      input.type,
      input.userId,
      input.entityId,
      input.periodStart,
      input.periodEnd,
      JSON.stringify(input.items),
      subtotal,
      tax,
      total,
      dueDate,
      now,
      now,
    );

    return this.getInvoice(id);
  }

  /**
   * Get invoice by ID
   */
  getInvoice(id: string): Invoice | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM invoices WHERE id = ?")
      .get(id) as Invoice | undefined;
    if (!row) return null;

    return {
      ...row,
      items: JSON.parse(row.items as string),
    };
  }

  /**
   * Generate invoice number
   */
  private generateInvoiceNumber(type: string): string {
    const prefix = type === "advertiser" ? "INV-ADV" : "INV-PUB";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Create transaction
   */
  createTransaction(input: {
    type: "payment" | "payout" | "refund" | "adjustment";
    userId: string;
    amount: number;
    currency?: string;
    method: string;
    reference?: string;
    description: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
  }): Transaction {
    const db = getDb();
    const id = this.generateId();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO transactions (
        id, type, user_id, amount, currency, status, method, reference,
        description, related_entity_id, related_entity_type, created_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.type,
      input.userId,
      input.amount,
      input.currency || "CDF",
      input.method,
      input.reference || null,
      input.description,
      input.relatedEntityId || null,
      input.relatedEntityType || null,
      now,
    );

    return this.getTransaction(id);
  }

  /**
   * Get transaction by ID
   */
  getTransaction(id: string): Transaction | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM transactions WHERE id = ?")
      .get(id) as Transaction | undefined;
    return row || null;
  }

  /**
   * Update transaction status
   */
  updateTransactionStatus(transactionId: string, status: string, processedAt?: string): Transaction | null {
    const db = getDb();
    const now = processedAt || new Date().toISOString();

    db.prepare(
      `UPDATE transactions SET status = ?, processed_at = ? WHERE id = ?`,
    ).run(status, now, transactionId);

    return this.getTransaction(transactionId);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const yieldEnterprise = new YieldEnterprise();
