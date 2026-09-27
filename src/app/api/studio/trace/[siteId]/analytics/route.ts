import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import {
  traceAcquisition, traceAudience, traceBehavior, traceConversions,
  traceDailySeries, traceTotals,
} from "@/lib/studio/trace-analytics";
import { getTraceRealtime } from "@/lib/studio/trace-realtime";
import { traceEnterpriseV2 } from "@/lib/studio/trace-v2";

type Ctx = { params: Promise<{ siteId: string }> };

/** GET /api/studio/trace/[siteId]/analytics?section=overview|audience|acquisition|behavior|conversions&days=28 */
export async function GET(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const url = new URL(req.url);
    const section = url.searchParams.get("section") || "overview";
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 28));
    const id = owned.site.id;

    switch (section) {
      case "audience":
        return NextResponse.json({ site: owned.site, days, audience: traceAudience(id, days) });
      case "acquisition":
        return NextResponse.json({ site: owned.site, days, acquisition: traceAcquisition(id, days) });
      case "behavior":
        return NextResponse.json({ site: owned.site, days, behavior: traceBehavior(id, days) });
      case "conversions":
        return NextResponse.json({ site: owned.site, days, conversions: traceConversions(id, days) });
      case "realtime":
        return NextResponse.json({
          site: owned.site,
          realtime: getTraceRealtime(id, 30),
        });
      case "attribution":
        return NextResponse.json({
          site: owned.site,
          days,
          attribution: traceEnterpriseV2.getAttributionReport(id, days),
        });
      case "cohorts":
        return NextResponse.json({
          site: owned.site,
          cohorts: traceEnterpriseV2.getCohortAnalysis(id),
        });
      default: {
        // Overview keeps rich v2 panel + accurate active-user counts from events.
        const v2 = traceEnterpriseV2.getRealTimeAnalytics(id, 30);
        const snap = getTraceRealtime(id, 30);
        return NextResponse.json({
          site: owned.site,
          days,
          totals: traceTotals(id, days),
          daily: traceDailySeries(id, days),
          realtime: {
            ...v2,
            activeUsers: snap.activeUsers,
            sessions: snap.sessions,
            pageviews: snap.pageviews,
            events: snap.events,
          },
        });
      }
    }
  } catch (e) {
    return studioError(e);
  }
}
