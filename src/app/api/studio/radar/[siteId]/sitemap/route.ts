import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { submitSitemap, submitUrlForCrawl } from "@/lib/studio/radar";
import { updateSite } from "@/lib/studio/sites";

type Ctx = { params: Promise<{ siteId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const body = (await req.json()) as { sitemapUrl?: string; url?: string };
    if (body.url) {
      const result = submitUrlForCrawl(owned.site, body.url, 90);
      return NextResponse.json(result);
    }
    if (body.sitemapUrl) {
      updateSite(siteId, { sitemapUrl: body.sitemapUrl });
    }
    const result = await submitSitemap(
      { ...owned.site, sitemapUrl: body.sitemapUrl || owned.site.sitemapUrl },
      body.sitemapUrl,
    );
    return NextResponse.json(result);
  } catch (e) {
    return studioError(e);
  }
}
