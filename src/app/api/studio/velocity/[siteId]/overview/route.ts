import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { velocityOverview } from "@/lib/studio/velocity";
import { psiAuditHistory } from "@/lib/studio/velocity-psi";

type Ctx = { params: Promise<{ siteId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const overview = velocityOverview(owned.site);
    const history = psiAuditHistory(owned.site.id);
    return NextResponse.json({ overview, history, site: owned.site });
  } catch (e) {
    return studioError(e);
  }
}
