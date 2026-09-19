import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import {
  radarBreakdown, radarPerformanceSeries, radarPerformanceTotals,
  type RadarDimension,
} from "@/lib/studio/radar-console";

type Ctx = { params: Promise<{ siteId: string }> };

/** GET /api/studio/radar/[siteId]/performance?days=28&dim=query|url|country|device */
export async function GET(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const url = new URL(req.url);
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 28));
    const dim = (url.searchParams.get("dim") || "query") as RadarDimension;
    const domain = owned.site.domain;
    return NextResponse.json({
      site: owned.site,
      days,
      totals: radarPerformanceTotals(domain, days),
      series: radarPerformanceSeries(domain, days),
      breakdown: radarBreakdown(domain, ["query", "url", "country", "device"].includes(dim) ? dim : "query", days),
      dim,
    });
  } catch (e) {
    return studioError(e);
  }
}
