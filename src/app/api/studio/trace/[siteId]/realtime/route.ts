import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { getTraceRealtime } from "@/lib/studio/trace-realtime";

type Ctx = { params: Promise<{ siteId: string }> };

/** GET /api/studio/trace/[siteId]/realtime?minutes=30 — utilisateurs/sessions/événements réels. */
export async function GET(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const minutes = Math.min(120, Math.max(5, Number(new URL(req.url).searchParams.get("minutes")) || 30));
    const realtime = getTraceRealtime(owned.site.id, minutes);
    return NextResponse.json({ site: owned.site, realtime });
  } catch (e) {
    return studioError(e);
  }
}
