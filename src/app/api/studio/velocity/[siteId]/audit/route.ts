import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { runVelocityAudit, velocityOverview } from "@/lib/studio/velocity";

type Ctx = { params: Promise<{ siteId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const body = (await req.json().catch(() => ({}))) as { url?: string };
    const audit = await runVelocityAudit(owned.site, body.url);
    return NextResponse.json({ audit, overview: velocityOverview(owned.site) });
  } catch (e) {
    return studioError(e);
  }
}
