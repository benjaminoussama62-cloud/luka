import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { aetherProducts } from "@/lib/studio/aether-console";

type Ctx = { params: Promise<{ siteId: string }> };

/** GET — catalogue produits indexé pour le domaine. */
export async function GET(_req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    return NextResponse.json({ site: owned.site, ...aetherProducts(owned.site.domain) });
  } catch (e) {
    return studioError(e);
  }
}
