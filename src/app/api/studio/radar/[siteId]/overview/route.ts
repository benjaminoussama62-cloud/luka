import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { radarOverview } from "@/lib/studio/radar";
import { radarAnomalyAlerts } from "@/lib/studio/radar-console";

type Ctx = { params: Promise<{ siteId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const overview = radarOverview(owned.site);
    const anomalies = radarAnomalyAlerts(owned.site.domain, 28);
    return NextResponse.json({
      overview,
      site: owned.site,
      anomalies: anomalies.alerts,
      compare: anomalies.compare,
    });
  } catch (e) {
    return studioError(e);
  }
}
