import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { audienceList, createAudience, ensureAdvertiser } from "@/lib/studio/yield-console";

type Ctx = { params: Promise<{ siteId: string }> };

const AUDIENCE_TYPES = ["remarketing", "affinity", "in_market", "custom", "similar"];

/** GET — audience segments. */
export async function GET(_req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const adv = ensureAdvertiser(owned.user.id, owned.user.name || undefined);
    return NextResponse.json({ site: owned.site, audiences: audienceList(adv.id) });
  } catch (e) {
    return studioError(e);
  }
}

/** POST — create an audience segment. */
export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const adv = ensureAdvertiser(owned.user.id, owned.user.name || undefined);
    const body = (await req.json()) as {
      name?: string; type?: string; criteria?: Record<string, unknown>;
    };
    if (!body.name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    if (!AUDIENCE_TYPES.includes(body.type || "")) {
      return NextResponse.json({ error: "Type d'audience invalide" }, { status: 400 });
    }
    const segment = createAudience(adv.id, {
      name: body.name.trim(),
      type: body.type!,
      criteria: body.criteria || {},
    });
    return NextResponse.json({ ok: true, segment });
  } catch (e) {
    return studioError(e);
  }
}
