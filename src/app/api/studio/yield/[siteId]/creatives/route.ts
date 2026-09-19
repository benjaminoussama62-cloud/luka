import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { addCreative, creativeList, ensureAdvertiser } from "@/lib/studio/yield-console";

type Ctx = { params: Promise<{ siteId: string }> };

/** GET — all creatives across the advertiser's campaigns. */
export async function GET(_req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const adv = ensureAdvertiser(owned.user.id, owned.user.name || undefined);
    return NextResponse.json({ site: owned.site, creatives: creativeList(adv.id) });
  } catch (e) {
    return studioError(e);
  }
}

/** POST — add a creative to a campaign. */
export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const adv = ensureAdvertiser(owned.user.id, owned.user.name || undefined);
    const body = (await req.json()) as {
      campaignId?: string; format?: string; size?: string; title?: string;
      description?: string; imageUrl?: string; landingUrl?: string; displayUrl?: string;
    };
    if (!body.campaignId || !body.title?.trim() || !body.landingUrl?.trim()) {
      return NextResponse.json({ error: "campaignId, title et landingUrl requis" }, { status: 400 });
    }
    const creative = addCreative(adv.id, {
      campaignId: body.campaignId,
      format: body.format || "display",
      size: body.size || "responsive",
      title: body.title.trim(),
      description: body.description?.trim() || "",
      imageUrl: body.imageUrl,
      landingUrl: body.landingUrl.trim(),
      displayUrl: body.displayUrl?.trim() || body.landingUrl.trim(),
    });
    return NextResponse.json({ ok: true, creative });
  } catch (e) {
    return studioError(e);
  }
}
