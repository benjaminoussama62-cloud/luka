import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { saveYieldPlacements, toggleYield } from "@/lib/studio/yield";

type Ctx = { params: Promise<{ siteId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const body = (await req.json()) as {
      enabled?: boolean;
      placements?: { id: string; enabled: boolean }[];
    };
    let overview;
    if (typeof body.enabled === "boolean") {
      overview = toggleYield(owned.site, body.enabled);
    } else if (body.placements?.length) {
      overview = saveYieldPlacements(owned.site, body.placements);
    } else {
      return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
    }
    return NextResponse.json({ overview });
  } catch (e) {
    return studioError(e);
  }
}
