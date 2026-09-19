import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { aetherInsights } from "@/lib/studio/aether-console";

type Ctx = { params: Promise<{ siteId: string }> };

/** GET — recommandations croisées calculées sur les données réelles du site. */
export async function GET(_req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    return NextResponse.json({ site: owned.site, insights: aetherInsights(owned.site) });
  } catch (e) {
    return studioError(e);
  }
}
