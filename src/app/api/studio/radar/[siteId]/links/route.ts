import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { radarLinks } from "@/lib/studio/radar-console";

type Ctx = { params: Promise<{ siteId: string }> };

/** GET /api/studio/radar/[siteId]/links — internal links, backlinks, outbound links. */
export async function GET(_req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    return NextResponse.json({ site: owned.site, links: radarLinks(owned.site.domain) });
  } catch (e) {
    return studioError(e);
  }
}
