import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { radarInspectionHistory } from "@/lib/studio/radar-console";

type Ctx = { params: Promise<{ siteId: string }> };

/** GET /api/studio/radar/[siteId]/inspections — URL inspection history. */
export async function GET(_req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    return NextResponse.json({ site: owned.site, inspections: radarInspectionHistory(owned.site.id) });
  } catch (e) {
    return studioError(e);
  }
}
