import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import {
  radarBreakdown,
  radarPageQueryCross,
  radarPerformanceCompare,
  radarPerformanceCsv,
  radarPerformanceSeries,
  radarPerformanceTotals,
  type RadarDimension,
  type RadarPerfFilters,
} from "@/lib/studio/radar-console";

type Ctx = { params: Promise<{ siteId: string }> };

const DIMS = ["query", "url", "country", "device", "page_query"] as const;

/** GET ?days=28&dim=query|url|country|device|page_query&query=&page=&format=json|csv */
export async function GET(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const url = new URL(req.url);
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 28));
    const dim = (url.searchParams.get("dim") || "query") as RadarDimension;
    const safeDim = (DIMS as readonly string[]).includes(dim) ? dim : "query";
    const filters: RadarPerfFilters = {
      query: url.searchParams.get("query") || undefined,
      url: url.searchParams.get("page") || url.searchParams.get("url") || undefined,
    };
    const domain = owned.site.domain;
    const format = url.searchParams.get("format") || "json";

    if (format === "csv") {
      const csv = radarPerformanceCsv(domain, safeDim as RadarDimension, days, filters);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="radar-${safeDim}-${days}d.csv"`,
        },
      });
    }

    const breakdown = radarBreakdown(domain, safeDim as RadarDimension, days, 50, filters);
    const pageQuery =
      safeDim === "page_query" || filters.query || filters.url
        ? radarPageQueryCross(domain, days, 50, filters)
        : undefined;

    return NextResponse.json({
      site: owned.site,
      days,
      totals: radarPerformanceTotals(domain, days),
      compare: radarPerformanceCompare(domain, days),
      series: radarPerformanceSeries(domain, days),
      breakdown,
      pageQuery: pageQuery ?? null,
      filters,
      dim: safeDim,
    });
  } catch (e) {
    return studioError(e);
  }
}
