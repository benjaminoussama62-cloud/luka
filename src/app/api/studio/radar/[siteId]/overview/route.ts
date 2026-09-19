import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { radarEnterpriseV2 } from "@/lib/studio/radar-v2";

type Ctx = { params: Promise<{ siteId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const overview = radarEnterpriseV2.getOverview(owned.site.id, owned.site.domain);
    return NextResponse.json({ overview, site: owned.site });
  } catch (e) {
    return studioError(e);
  }
}
