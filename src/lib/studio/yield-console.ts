/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Yield — couche données Google Ads.
 * Enroule yieldEnterprise (CRUD réel) + métriques de diffusion réelles
 * (impressions/clicks/conversions enregistrées par le serveur d'annonces).
 */
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/storage/database";
import { yieldEnterprise } from "./yield-enterprise";

const n = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const sinceDays = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

/** Advertiser account for the user — created on first access. */
export function ensureAdvertiser(userId: string, companyName?: string) {
  const existing = yieldEnterprise.getAdvertiserByUserId(userId);
  if (existing) return existing;
  return yieldEnterprise.createAdvertiser({
    userId,
    companyName: companyName || "Mon compte",
    billingCurrency: "CDF",
  });
}

/* ---------------- Campagnes ---------------- */

export function campaignList(advertiserId: string) {
  const campaigns = yieldEnterprise.getAdvertiserCampaigns(advertiserId);
  const db = getDb();
  // Real delivery metrics from the ad server (impressions/clicks/conversions)
  return campaigns.map((c: any) => {
    const perf = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM impressions i JOIN ad_creatives cr ON i.creative_id = cr.id WHERE cr.campaign_id = ?) as imps,
           (SELECT COUNT(*) FROM clicks k JOIN ad_creatives cr ON k.creative_id = cr.id WHERE cr.campaign_id = ?) as clks,
           (SELECT COUNT(*) FROM conversions cv JOIN ad_creatives cr ON cv.creative_id = cr.id WHERE cr.campaign_id = ?) as convs`,
      )
      .get(c.id, c.id, c.id) as any;
    const imps = n(perf?.imps) || n(c.impressions);
    const clks = n(perf?.clks) || n(c.clicks);
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      status: c.status,
      dailyBudget: n(c.daily_budget),
      totalBudget: n(c.total_budget),
      budgetSpent: n(c.budget_spent),
      biddingStrategy: c.bidding_strategy,
      maxCpc: c.max_cpc != null ? n(c.max_cpc) : null,
      startDate: c.start_date,
      endDate: c.end_date,
      impressions: imps,
      clicks: clks,
      ctr: imps > 0 ? Math.round((clks / imps) * 1000) / 10 : 0,
      conversions: n(perf?.convs) || n(c.conversions),
      cost: n(c.cost),
      creativesCount: Array.isArray(c.creatives) ? c.creatives.length : 0,
      createdAt: c.created_at,
    };
  });
}

export function createCampaign(
  advertiserId: string,
  input: {
    name: string;
    type: string;
    dailyBudget: number;
    totalBudget: number;
    startDate: string;
    endDate: string;
    biddingStrategy: string;
    maxCpc?: number;
    targeting?: Record<string, unknown>;
  },
) {
  return yieldEnterprise.createCampaign({ advertiserId, ...input });
}

export function setCampaignStatus(campaignId: string, advertiserId: string, status: string) {
  const c = yieldEnterprise.getCampaign(campaignId) as any;
  if (!c || c.advertiser_id !== advertiserId) {
    throw Object.assign(new Error("Campagne introuvable"), { status: 404 });
  }
  if (!["draft", "active", "paused", "completed"].includes(status)) {
    throw Object.assign(new Error("Statut invalide"), { status: 400 });
  }
  return yieldEnterprise.updateCampaignStatus(campaignId, status);
}

export function updateCampaign(
  campaignId: string,
  advertiserId: string,
  patch: { name?: string; dailyBudget?: number; maxCpc?: number; biddingStrategy?: string },
) {
  const c = yieldEnterprise.getCampaign(campaignId) as any;
  if (!c || c.advertiser_id !== advertiserId) {
    throw Object.assign(new Error("Campagne introuvable"), { status: 404 });
  }
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.name !== undefined) { sets.push("name = ?"); vals.push(patch.name.trim()); }
  if (patch.dailyBudget !== undefined) { sets.push("daily_budget = ?"); vals.push(Math.max(0, patch.dailyBudget)); }
  if (patch.maxCpc !== undefined) { sets.push("max_cpc = ?"); vals.push(patch.maxCpc); }
  if (patch.biddingStrategy !== undefined) {
    if (!["manual_cpc", "target_cpa", "maximize_clicks", "target_roas"].includes(patch.biddingStrategy)) {
      throw Object.assign(new Error("Stratégie d'enchère invalide"), { status: 400 });
    }
    sets.push("bidding_strategy = ?"); vals.push(patch.biddingStrategy);
  }
  if (!sets.length) throw Object.assign(new Error("Rien à modifier"), { status: 400 });
  sets.push("updated_at = ?");
  vals.push(new Date().toISOString(), campaignId);
  getDb().prepare(`UPDATE campaigns SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  return yieldEnterprise.getCampaign(campaignId);
}

/* ---------------- Annonces ---------------- */

export function creativeList(advertiserId: string) {
  const campaigns = yieldEnterprise.getAdvertiserCampaigns(advertiserId) as any[];
  const out: any[] = [];
  for (const c of campaigns) {
    for (const cr of yieldEnterprise.getCampaignCreatives(c.id) as any[]) {
      out.push({
        id: cr.id,
        campaignId: c.id,
        campaignName: c.name,
        format: cr.format,
        size: cr.size,
        title: cr.title,
        description: cr.description,
        imageUrl: cr.image_url,
        landingUrl: cr.landing_url,
        displayUrl: cr.display_url,
        status: cr.status,
        rejectedReason: cr.rejected_reason,
        impressions: n(cr.impressions),
        clicks: n(cr.clicks),
        ctr: n(cr.impressions) > 0 ? Math.round((n(cr.clicks) / n(cr.impressions)) * 1000) / 10 : 0,
        createdAt: cr.created_at,
      });
    }
  }
  return out;
}

export function addCreative(
  advertiserId: string,
  input: {
    campaignId: string; format: string; size: string; title: string;
    description: string; imageUrl?: string; landingUrl: string; displayUrl: string;
  },
) {
  const c = yieldEnterprise.getCampaign(input.campaignId) as any;
  if (!c || c.advertiser_id !== advertiserId) {
    throw Object.assign(new Error("Campagne introuvable"), { status: 404 });
  }
  return yieldEnterprise.addCreative(input);
}

/* ---------------- Mots-clés ---------------- */

const MATCH_TYPES = ["broad", "phrase", "exact"] as const;

export function keywordList(advertiserId: string, campaignId?: string) {
  const campaigns = yieldEnterprise.getAdvertiserCampaigns(advertiserId) as any[];
  const ids = new Set(campaigns.map((c) => c.id));
  const db = getDb();
  const rows = (
    campaignId
      ? db.prepare("SELECT * FROM campaign_keywords WHERE campaign_id = ? ORDER BY clicks DESC").all(campaignId)
      : db
          .prepare(
            `SELECT k.*, c.name as campaign_name FROM campaign_keywords k
             JOIN campaigns c ON c.id = k.campaign_id
             WHERE c.advertiser_id = ? ORDER BY k.clicks DESC`,
          )
          .all(advertiserId)
  ) as any[];
  return rows.filter((r) => ids.has(r.campaign_id)).map((r) => ({
    id: r.id,
    campaignId: r.campaign_id,
    campaignName: r.campaign_name || campaigns.find((c) => c.id === r.campaign_id)?.name || "",
    keyword: r.keyword,
    matchType: r.match_type,
    maxCpc: r.max_cpc != null ? n(r.max_cpc) : null,
    status: r.status,
    impressions: n(r.impressions),
    clicks: n(r.clicks),
    cost: n(r.cost),
    ctr: n(r.impressions) > 0 ? Math.round((n(r.clicks) / n(r.impressions)) * 1000) / 10 : 0,
  }));
}

export function addKeyword(
  advertiserId: string,
  input: { campaignId: string; keyword: string; matchType: string; maxCpc?: number },
) {
  const c = yieldEnterprise.getCampaign(input.campaignId) as any;
  if (!c || c.advertiser_id !== advertiserId) {
    throw Object.assign(new Error("Campagne introuvable"), { status: 404 });
  }
  const kw = input.keyword.trim().toLowerCase();
  if (!kw || kw.length > 120) throw Object.assign(new Error("Mot-clé invalide"), { status: 400 });
  if (!MATCH_TYPES.includes(input.matchType as never)) {
    throw Object.assign(new Error("Type de correspondance invalide"), { status: 400 });
  }
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO campaign_keywords (id, campaign_id, keyword, match_type, max_cpc, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'enabled', ?, ?)
     ON CONFLICT(campaign_id, keyword, match_type) DO UPDATE SET status='enabled', updated_at=excluded.updated_at`,
  ).run(id, input.campaignId, kw, input.matchType, input.maxCpc ?? null, now, now);
  return db.prepare("SELECT * FROM campaign_keywords WHERE campaign_id = ? AND keyword = ? AND match_type = ?")
    .get(input.campaignId, kw, input.matchType);
}

export function updateKeyword(
  advertiserId: string,
  id: string,
  patch: { status?: string; maxCpc?: number },
) {
  const row = getDb().prepare(
    `SELECT k.id FROM campaign_keywords k JOIN campaigns c ON c.id = k.campaign_id
     WHERE k.id = ? AND c.advertiser_id = ?`,
  ).get(id, advertiserId);
  if (!row) throw Object.assign(new Error("Mot-clé introuvable"), { status: 404 });
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.status !== undefined) {
    if (!["enabled", "paused"].includes(patch.status)) {
      throw Object.assign(new Error("Statut invalide"), { status: 400 });
    }
    sets.push("status = ?"); vals.push(patch.status);
  }
  if (patch.maxCpc !== undefined) { sets.push("max_cpc = ?"); vals.push(patch.maxCpc); }
  if (!sets.length) throw Object.assign(new Error("Rien à modifier"), { status: 400 });
  sets.push("updated_at = ?"); vals.push(new Date().toISOString(), id);
  getDb().prepare(`UPDATE campaign_keywords SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

export function deleteKeyword(advertiserId: string, id: string) {
  const res = getDb().prepare(
    `DELETE FROM campaign_keywords WHERE id = ? AND campaign_id IN
       (SELECT id FROM campaigns WHERE advertiser_id = ?)`,
  ).run(id, advertiserId);
  if (!(res as any)?.changes) throw Object.assign(new Error("Mot-clé introuvable"), { status: 404 });
}

/* ---------------- Audiences ---------------- */

export function audienceList(advertiserId: string) {
  return yieldEnterprise.getAdvertiserSegments(advertiserId) as any[];
}

export function createAudience(
  advertiserId: string,
  input: { name: string; type: string; criteria: Record<string, unknown> },
) {
  // Map UI criteria onto the real AudienceRule model
  const rules: Array<{
    field: "behavior" | "interest" | "demographic" | "custom";
    operator: "equals" | "contains" | "starts_with" | "regex" | "in_list" | "not_in_list";
    value: string | string[] | number;
  }> = [];
  const c = input.criteria || {};
  if (Array.isArray(c.countries) && c.countries.length) {
    rules.push({ field: "demographic", operator: "in_list", value: c.countries as string[] });
  }
  if (Array.isArray(c.interests) && c.interests.length) {
    rules.push({ field: "interest", operator: "in_list", value: c.interests as string[] });
  }
  if (c.ageRange && typeof c.ageRange === "object") {
    const r = c.ageRange as { min?: number; max?: number };
    rules.push({ field: "demographic", operator: "equals", value: `${r.min ?? 18}-${r.max ?? 65}` });
  }
  if (!rules.length) rules.push({ field: "custom", operator: "equals", value: input.type });
  return yieldEnterprise.createAudienceSegment({
    advertiserId,
    name: input.name,
    description: `Segment ${input.type}`,
    rules,
  });
}

/* ---------------- Facturation ---------------- */

export function billingSummary(advertiserId: string) {
  const db = getDb();
  const invoices = db
    .prepare("SELECT * FROM invoices WHERE advertiser_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(advertiserId) as any[];
  const transactions = db
    .prepare("SELECT * FROM transactions WHERE advertiser_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(advertiserId) as any[];
  const advertiser = yieldEnterprise.getAdvertiser(advertiserId) as any;
  return {
    balance: n(advertiser?.current_balance),
    currency: advertiser?.billing_currency || "CDF",
    invoices: invoices.map((i) => ({
      id: i.id,
      number: i.invoice_number,
      amount: n(i.total_amount),
      currency: i.currency,
      status: i.status,
      dueDate: i.due_date,
      periodStart: i.period_start,
      periodEnd: i.period_end,
      createdAt: i.created_at,
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: n(t.amount),
      currency: t.currency,
      status: t.status,
      provider: t.provider,
      createdAt: t.created_at,
    })),
  };
}

/* ---------------- Rapports ---------------- */

export function yieldReport(advertiserId: string, days = 30) {
  const db = getDb();
  const since = sinceDays(days);
  const rows = db
    .prepare(
      `SELECT substr(i.timestamp, 1, 10) as day,
              COUNT(*) as impressions,
              (SELECT COUNT(*) FROM clicks k JOIN ad_creatives cr2 ON k.creative_id = cr2.id
               JOIN campaigns c2 ON cr2.campaign_id = c2.id
               WHERE c2.advertiser_id = ? AND substr(k.timestamp, 1, 10) = substr(i.timestamp, 1, 10)) as clicks
       FROM impressions i
       JOIN ad_creatives cr ON i.creative_id = cr.id
       JOIN campaigns c ON cr.campaign_id = c.id
       WHERE c.advertiser_id = ? AND i.timestamp >= ?
       GROUP BY day ORDER BY day`,
    )
    .all(advertiserId, advertiserId, since) as any[];
  return rows.map((r) => ({
    day: r.day,
    impressions: n(r.impressions),
    clicks: n(r.clicks),
    ctr: n(r.impressions) > 0 ? Math.round((n(r.clicks) / n(r.impressions)) * 1000) / 10 : 0,
  }));
}
