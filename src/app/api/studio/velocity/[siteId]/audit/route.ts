import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { runVelocityAudit, velocityOverview } from "@/lib/studio/velocity";
import { runPsiAudit, psiAuditHistory } from "@/lib/studio/velocity-psi";

type Ctx = { params: Promise<{ siteId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      url?: string;
      strategy?: "mobile" | "desktop";
    };
    const strategy = body.strategy === "desktop" ? "desktop" : "mobile";

    // Real Lighthouse audit via Google PageSpeed Insights; direct-fetch fallback.
    try {
      const audit = await runPsiAudit(owned.site, body.url, strategy);
      return NextResponse.json({ audit, history: psiAuditHistory(owned.site.id), source: "pagespeed_insights" });
    } catch (psiError) {
      console.warn("[velocity] PSI audit failed, falling back to direct fetch", psiError);
      const audit = await runVelocityAudit(owned.site, body.url);
      return NextResponse.json({ audit, overview: velocityOverview(owned.site), source: "direct_fetch" });
    }
  } catch (e) {
    return studioError(e);
  }
}
