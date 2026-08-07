import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { pushSearchHistory } from "@/lib/db";
import { synthesizeWithLlm } from "@/lib/llm";
import { rateLimit } from "@/lib/rate-limit";
import { liveSearch } from "@/lib/real-search";
import { indexStats } from "@/lib/search-index/fts";
import type { AlgorithmSliders } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!rateLimit(`search:${ip}`, 90, 60_000)) {
      return NextResponse.json({ error: "Trop de requêtes — réessayez dans une minute." }, { status: 429 });
    }

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

    // Side-effects must never fail the search response (serverless FS / DB edges).
    try {
      const session = await getSessionFromCookies();
      if (session && !body.privateMode && query.trim()) {
        await pushSearchHistory(session.id, query.trim());
      }
    } catch (e) {
      console.warn("[search] history skipped", e);
    }

    try {
      const idx = indexStats();
      if (idx.documents < 8000 || idx.queuePending < 20000) {
        void import("@/lib/crawler/global-crawler")
          .then(({ runCrawlBatch, seedQueue }) => {
            seedQueue();
            return runCrawlBatch(12, { timeBudgetMs: 12_000 });
          })
          .catch(console.error);
      }
    } catch (e) {
      console.warn("[search] crawl kick skipped", e);
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
