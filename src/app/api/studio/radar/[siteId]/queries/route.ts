import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { radarQueries } from "@/lib/studio/radar";

type Ctx = { params: Promise<{ siteId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const days = Number(new URL(req.url).searchParams.get("days") || 28);
    return NextResponse.json({ queries: radarQueries(owned.site, days) });
  } catch (e) {
    return studioError(e);
  }
}
