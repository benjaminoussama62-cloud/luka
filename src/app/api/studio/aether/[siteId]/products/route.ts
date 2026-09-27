import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import {
  aetherIngestMerchantFeed,
  aetherMerchantSampleTemplate,
  aetherProductIssueCounts,
  aetherProducts,
} from "@/lib/studio/aether-console";

type Ctx = { params: Promise<{ siteId: string }> };

/** GET — catalogue produits + diagnostics. ?template=1 télécharge un modèle TSV. */
export async function GET(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("template") === "1") {
      const tsv = aetherMerchantSampleTemplate(owned.site.domain);
      return new NextResponse(tsv, {
        status: 200,
        headers: {
          "Content-Type": "text/tab-separated-values; charset=utf-8",
          "Content-Disposition": `attachment; filename="ayeba-merchant-modele-${owned.site.domain}.tsv"`,
        },
      });
    }
    return NextResponse.json({
      site: owned.site,
      ...aetherProducts(owned.site.domain),
      issueCounts: aetherProductIssueCounts(owned.site.domain),
    });
  } catch (e) {
    return studioError(e);
  }
}

/**
 * POST — import feed Merchant (TSV/CSV Google Shopping).
 * Body: { feed: string }  (contenu texte du fichier)
 */
export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const body = (await req.json().catch(() => ({}))) as { feed?: string };
    const feed = String(body.feed || "");
    if (!feed.trim()) {
      return NextResponse.json({ error: "Feed TSV/CSV requis (champ feed)" }, { status: 400 });
    }
    if (feed.length > 2_500_000) {
      return NextResponse.json({ error: "Feed trop volumineux (max ~2,5 Mo)" }, { status: 413 });
    }
    const result = aetherIngestMerchantFeed(owned.site.domain, feed);
    const products = aetherProducts(owned.site.domain);
    return NextResponse.json({
      site: owned.site,
      ...result,
      ...products,
      issueCounts: aetherProductIssueCounts(owned.site.domain),
    });
  } catch (e) {
    return studioError(e);
  }
}
