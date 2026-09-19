import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { traceEnterpriseV2 } from "@/lib/studio/trace-v2";

type Ctx = { params: Promise<{ siteId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const overview = traceEnterpriseV2.getRealTimeAnalytics(owned.site.id, 30);
    return NextResponse.json({ overview, site: owned.site });
  } catch (e) {
    return studioError(e);
  }
}
