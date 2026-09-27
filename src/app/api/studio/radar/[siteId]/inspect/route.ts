import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { inspectUrl, inspectUrlLive, submitUrlForCrawl } from "@/lib/studio/radar";
import { persistRadarInspection } from "@/lib/studio/radar-console";

type Ctx = { params: Promise<{ siteId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const body = (await req.json()) as { url?: string; enqueue?: boolean; live?: boolean };
    const url = String(body.url || "").trim();
    if (!url) return NextResponse.json({ error: "URL requise" }, { status: 400 });
    const inspection = inspectUrl(owned.site, url);
    let enqueued: { ok: boolean; url: string } | null = null;
    if (body.enqueue) {
      enqueued = submitUrlForCrawl(owned.site, url, 88);
    }
    let live = null;
    if (body.live) {
      live = await inspectUrlLive(owned.site, url);
    }
    persistRadarInspection(owned.site.id, inspection, live);
    return NextResponse.json({ inspection, enqueued, live });
  } catch (e) {
    return studioError(e);
  }
}
