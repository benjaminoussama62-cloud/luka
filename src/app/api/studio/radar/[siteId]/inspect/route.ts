import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { inspectUrl, submitUrlForCrawl } from "@/lib/studio/radar";

type Ctx = { params: Promise<{ siteId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const body = (await req.json()) as { url?: string; enqueue?: boolean };
    const url = String(body.url || "").trim();
    if (!url) return NextResponse.json({ error: "URL requise" }, { status: 400 });
    const inspection = inspectUrl(owned.site, url);
    let enqueued: { ok: boolean; url: string } | null = null;
    if (body.enqueue) {
      enqueued = submitUrlForCrawl(owned.site, url, 88);
    }
    return NextResponse.json({ inspection, enqueued });
  } catch (e) {
    return studioError(e);
  }
}
