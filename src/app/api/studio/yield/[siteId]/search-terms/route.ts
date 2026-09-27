import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import {
  campaignRoasReport,
  ensureAdvertiser,
  searchTermsReport,
} from "@/lib/studio/yield-console";

type Ctx = { params: Promise<{ siteId: string }> };

/** GET — search terms + campaign ROAS from real impression/click/conversion tables. */
export async function GET(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const adv = ensureAdvertiser(owned.user.id, owned.user.name || undefined);
    const url = new URL(req.url);
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 30));
    const view = url.searchParams.get("view") || "search-terms";
    if (view === "roas") {
      return NextResponse.json({
        site: owned.site,
        advertiser: adv,
        days,
        campaigns: campaignRoasReport(adv.id, days),
      });
    }
    return NextResponse.json({
      site: owned.site,
      advertiser: adv,
      days,
      terms: searchTermsReport(adv.id, days),
    });
  } catch (e) {
    return studioError(e);
  }
}
