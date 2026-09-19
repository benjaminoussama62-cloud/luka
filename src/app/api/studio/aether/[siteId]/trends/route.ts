import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import {
  aetherDomainQueries, aetherGlobalTrends, aetherQuerySeries, aetherRisingQueries,
} from "@/lib/studio/aether-console";

type Ctx = { params: Promise<{ siteId: string }> };

/** GET /api/studio/aether/[siteId]/trends?days=30&query=... */
export async function GET(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const url = new URL(req.url);
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 30));
    const query = url.searchParams.get("query") || "";
    return NextResponse.json({
      site: owned.site,
      days,
      domainQueries: aetherDomainQueries(owned.site.domain, days),
      rising: aetherRisingQueries(owned.site.domain),
      global: aetherGlobalTrends(7),
      querySeries: query ? aetherQuerySeries(query, owned.site.domain, days) : [],
      query,
    });
  } catch (e) {
    return studioError(e);
  }
}
