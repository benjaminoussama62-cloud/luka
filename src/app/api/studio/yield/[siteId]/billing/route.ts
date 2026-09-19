import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { billingSummary, ensureAdvertiser } from "@/lib/studio/yield-console";

type Ctx = { params: Promise<{ siteId: string }> };

/** GET — balance, invoices, transactions (real billing rows). */
export async function GET(_req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const adv = ensureAdvertiser(owned.user.id, owned.user.name || undefined);
    return NextResponse.json({ site: owned.site, billing: billingSummary(adv.id) });
  } catch (e) {
    return studioError(e);
  }
}
