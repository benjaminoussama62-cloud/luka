import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { pushSearchHistory } from "@/lib/db";
import { synthesizeWithLlm } from "@/lib/llm";
import { liveSearch } from "@/lib/real-search";
import type { AlgorithmSliders } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      query?: string;
      sliders?: AlgorithmSliders;
      zeroAi?: boolean;
      zeroAds?: boolean;
      privateMode?: boolean;
    };

    const sliders: AlgorithmSliders = body.sliders ?? {
      audience: 35,
      authority: 55,
      locality: 40,
    };

    const query = body.query ?? "actualité";
    const result = await liveSearch(query, {
      sliders,
      zeroAi: Boolean(body.zeroAi),
      zeroAds: Boolean(body.zeroAds),
      privateMode: Boolean(body.privateMode),
    });

    const llmSummary = await synthesizeWithLlm(
      query,
      result.results,
      result.knowledge?.summary,
    );
    if (llmSummary) {
      result.aiSummary = llmSummary;
    }

    const session = await getSessionFromCookies();
    if (session && !body.privateMode && query.trim()) {
      await pushSearchHistory(session.id, query.trim());
    }

    const { getCrawlIndex } = await import("@/lib/db");
    const crawlDocs = await getCrawlIndex();
    if (crawlDocs.length === 0) {
      void import("@/lib/crawler").then(({ runLocalCrawl }) => runLocalCrawl(24)).catch(console.error);
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Recherche indisponible", message: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
