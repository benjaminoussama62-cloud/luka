import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { radarCoverage } from "@/lib/studio/radar-console";

type Ctx = { params: Promise<{ siteId: string }> };

/** GET /api/studio/radar/[siteId]/coverage — index coverage, crawl errors, submitted URLs. */
export async function GET(_req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    return NextResponse.json({ site: owned.site, coverage: radarCoverage(owned.site) });
  } catch (e) {
    return studioError(e);
  }
}
