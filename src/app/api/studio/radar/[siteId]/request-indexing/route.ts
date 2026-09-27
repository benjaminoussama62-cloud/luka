import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import {
  radarIndexRequestHistory,
  radarRequestIndexing,
} from "@/lib/studio/radar-console";

type Ctx = { params: Promise<{ siteId: string }> };

/** GET — historique des demandes d'indexation. */
export async function GET(_req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    return NextResponse.json({
      site: owned.site,
      requests: radarIndexRequestHistory(owned.site.id),
    });
  } catch (e) {
    return studioError(e);
  }
}

/** POST — demander l'indexation (file de crawl réelle). Body: { urls: string[] } */
export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const body = (await req.json().catch(() => ({}))) as { urls?: string[] };
    const urls = Array.isArray(body.urls) ? body.urls.filter((u) => typeof u === "string") : [];
    if (!urls.length) {
      return NextResponse.json({ error: "Liste urls requise" }, { status: 400 });
    }
    const result = radarRequestIndexing(owned.site, urls);
    return NextResponse.json({ site: owned.site, ...result });
  } catch (e) {
    return studioError(e);
  }
}
