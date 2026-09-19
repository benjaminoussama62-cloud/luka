import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { submitUrlForCrawl } from "@/lib/studio/radar";
import { radarSitemaps, radarSubmitSitemap } from "@/lib/studio/radar-console";
import { updateSite } from "@/lib/studio/sites";

type Ctx = { params: Promise<{ siteId: string }> };

/** GET — sitemaps soumis + statut de lecture réel. */
export async function GET(_req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    return NextResponse.json({ site: owned.site, sitemaps: radarSitemaps(owned.site.id) });
  } catch (e) {
    return studioError(e);
  }
}

/** POST — { sitemapUrl } soumet un sitemap (fetch réel) | { url } soumet une URL au crawl. */
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
    const sitemapUrl = (body.sitemapUrl || owned.site.sitemapUrl || `https://${owned.site.domain}/sitemap.xml`).trim();
    if (body.sitemapUrl) {
      updateSite(siteId, { sitemapUrl: body.sitemapUrl });
    }
    const result = await radarSubmitSitemap({ ...owned.site, sitemapUrl }, sitemapUrl);
    return NextResponse.json(result);
  } catch (e) {
    return studioError(e);
  }
}
