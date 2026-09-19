import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import {
  campaignList, createCampaign, ensureAdvertiser, setCampaignStatus,
  updateCampaign, yieldReport,
} from "@/lib/studio/yield-console";

type Ctx = { params: Promise<{ siteId: string }> };

const CAMPAIGN_TYPES = ["performance", "display", "video", "search", "shopping"];
const BIDDING = ["manual_cpc", "target_cpa", "maximize_clicks", "target_roas"];

/** GET — campaigns + real delivery stats + daily report. */
export async function GET(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const adv = ensureAdvertiser(owned.user.id, owned.user.name || undefined);
    const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 30));
    return NextResponse.json({
      site: owned.site,
      advertiser: adv,
      campaigns: campaignList(adv.id),
      report: yieldReport(adv.id, days),
    });
  } catch (e) {
    return studioError(e);
  }
}

/** POST — create campaign or mutate { action: "status"|"update", id, ... }. */
export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const adv = ensureAdvertiser(owned.user.id, owned.user.name || undefined);
    const body = (await req.json()) as {
      action?: string;
      id?: string;
      name?: string;
      type?: string;
      dailyBudget?: number;
      totalBudget?: number;
      startDate?: string;
      endDate?: string;
      biddingStrategy?: string;
      maxCpc?: number;
      status?: string;
    };

    if (body.action === "status") {
      if (!body.id || !body.status) return NextResponse.json({ error: "id et status requis" }, { status: 400 });
      return NextResponse.json({ ok: true, campaign: setCampaignStatus(body.id, adv.id, body.status) });
    }
    if (body.action === "update") {
      if (!body.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
      return NextResponse.json({
        ok: true,
        campaign: updateCampaign(body.id, adv.id, {
          name: body.name, dailyBudget: body.dailyBudget,
          maxCpc: body.maxCpc, biddingStrategy: body.biddingStrategy,
        }),
      });
    }

    // create
    if (!body.name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    if (!CAMPAIGN_TYPES.includes(body.type || "")) return NextResponse.json({ error: "Type invalide" }, { status: 400 });
    if (!BIDDING.includes(body.biddingStrategy || "manual_cpc")) {
      return NextResponse.json({ error: "Stratégie d'enchère invalide" }, { status: 400 });
    }
    const campaign = createCampaign(adv.id, {
      name: body.name.trim(),
      type: body.type || "performance",
      dailyBudget: Math.max(0, Number(body.dailyBudget) || 0),
      totalBudget: Math.max(0, Number(body.totalBudget) || 0),
      startDate: body.startDate || new Date().toISOString().slice(0, 10),
      endDate: body.endDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      biddingStrategy: body.biddingStrategy || "manual_cpc",
      maxCpc: body.maxCpc,
    });
    return NextResponse.json({ ok: true, campaign });
  } catch (e) {
    return studioError(e);
  }
}
