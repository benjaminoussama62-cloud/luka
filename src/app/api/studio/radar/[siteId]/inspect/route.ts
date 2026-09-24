import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { inspectUrl, inspectUrlLive, submitUrlForCrawl } from "@/lib/studio/radar";

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
    // Test en direct : fetch HTTP réel de la page (status, noindex, canonical…)
    let live = null;
    if (body.live) {
      live = await inspectUrlLive(owned.site, url);
    }
    return NextResponse.json({ inspection, enqueued, live });
  } catch (e) {
    return studioError(e);
  }
}
