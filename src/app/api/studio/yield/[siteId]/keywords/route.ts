import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import {
  addKeyword, deleteKeyword, ensureAdvertiser, keywordList, updateKeyword,
} from "@/lib/studio/yield-console";

type Ctx = { params: Promise<{ siteId: string }> };

/** GET — keywords (optionnellement filtrés par campagne via ?campaign=). */
export async function GET(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const adv = ensureAdvertiser(owned.user.id, owned.user.name || undefined);
    const campaignId = new URL(req.url).searchParams.get("campaign") || undefined;
    return NextResponse.json({ site: owned.site, keywords: keywordList(adv.id, campaignId) });
  } catch (e) {
    return studioError(e);
  }
}

/** POST — { action: "add"|"update"|"delete", ... }. */
export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const adv = ensureAdvertiser(owned.user.id, owned.user.name || undefined);
    const body = (await req.json()) as {
      action?: string; id?: string; campaignId?: string;
      keyword?: string; matchType?: string; maxCpc?: number; status?: string;
    };
    if (body.action === "add" || !body.action) {
      if (!body.campaignId || !body.keyword?.trim()) {
        return NextResponse.json({ error: "campaignId et keyword requis" }, { status: 400 });
      }
      const kw = addKeyword(adv.id, {
        campaignId: body.campaignId,
        keyword: body.keyword,
        matchType: body.matchType || "broad",
        maxCpc: body.maxCpc,
      });
      return NextResponse.json({ ok: true, keyword: kw });
    }
    if (body.action === "update") {
      if (!body.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
      updateKeyword(adv.id, body.id, { status: body.status, maxCpc: body.maxCpc });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "delete") {
      if (!body.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
      deleteKeyword(adv.id, body.id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "action invalide" }, { status: 400 });
  } catch (e) {
    return studioError(e);
  }
}
