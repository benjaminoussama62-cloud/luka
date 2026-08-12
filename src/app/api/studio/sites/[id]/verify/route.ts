import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { getSiteById } from "@/lib/studio/sites";
import { verificationInstructions, verifySiteOwnership } from "@/lib/studio/verify";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const owned = await requireStudioSite(id);
  if (owned instanceof NextResponse) return owned;
  try {
    const result = await verifySiteOwnership(owned.site);
    const site = getSiteById(id);
    return NextResponse.json({
      ...result,
      site,
      verification: site ? verificationInstructions(site) : null,
    });
  } catch (e) {
    return studioError(e);
  }
}
