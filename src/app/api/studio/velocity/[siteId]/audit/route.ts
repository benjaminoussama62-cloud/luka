import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { runVelocityAudit, velocityOverview } from "@/lib/studio/velocity";
import {
  originCruxSummary,
  psiAuditHistory,
  runPsiAudit,
  runPsiBatchAudit,
} from "@/lib/studio/velocity-psi";

type Ctx = { params: Promise<{ siteId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      url?: string;
      strategy?: "mobile" | "desktop";
      /** Batch-audit top N crawled URLs (max 5). */
      batch?: boolean;
      limit?: number;
    };
    const strategy = body.strategy === "desktop" ? "desktop" : "mobile";

    if (body.batch) {
      const batch = await runPsiBatchAudit(owned.site, {
        limit: body.limit,
        strategy,
      });
      return NextResponse.json({
        batch: true,
        ...batch,
        history: psiAuditHistory(owned.site.id),
        overview: velocityOverview(owned.site),
        originCrux: originCruxSummary(owned.site.id),
        source: "pagespeed_insights",
        warning: batch.quotaHit
          ? "Quota PageSpeed atteint — audits restants reportés. Réessayez plus tard ou configurez PAGESPEED_API_KEY."
          : batch.requested === 0
            ? "Aucune URL crawlée pour ce domaine — soumettez un sitemap ou attendez l'indexation."
            : undefined,
      });
    }

    // Real Lighthouse audit via Google PageSpeed Insights; direct-fetch fallback.
    try {
      const audit = await runPsiAudit(owned.site, body.url, strategy);
      return NextResponse.json({
        audit,
        history: psiAuditHistory(owned.site.id),
        overview: velocityOverview(owned.site),
        originCrux: originCruxSummary(owned.site.id),
        source: "pagespeed_insights",
      });
    } catch (psiError) {
      const psiMessage =
        psiError instanceof Error ? psiError.message : "PageSpeed Insights indisponible";
      console.warn("[velocity] PSI audit failed, falling back to direct fetch", psiError);
      const audit = await runVelocityAudit(owned.site, body.url);
      return NextResponse.json({
        audit,
        overview: velocityOverview(owned.site),
        history: psiAuditHistory(owned.site.id),
        originCrux: originCruxSummary(owned.site.id),
        source: "direct_fetch",
        psiError: psiMessage,
        warning:
          "Audit Lighthouse (PageSpeed Insights) indisponible — mesures de disponibilité directe uniquement. Configurez PAGESPEED_API_KEY ou réessayez plus tard.",
      });
    }
  } catch (e) {
    return studioError(e);
  }
}
