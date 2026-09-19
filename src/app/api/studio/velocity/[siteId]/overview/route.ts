import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { velocityEnterpriseV2 } from "@/lib/studio/velocity-v2";

type Ctx = { params: Promise<{ siteId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const overview = velocityEnterpriseV2.getOverview(owned.site.id);
    return NextResponse.json({ overview, site: owned.site });
  } catch (e) {
    return studioError(e);
  }
}
