import { NextResponse, after } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { pushSearchHistory } from "@/lib/db";
import { synthesizeWithLlm } from "@/lib/llm";
import { rateLimit } from "@/lib/rate-limit";
import { liveSearch } from "@/lib/real-search";
import { recordImpressions } from "@/lib/search-index/fts";
import type { AlgorithmSliders } from "@/lib/types";

export const maxDuration = 10;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!rateLimit(`search:${ip}`, 180, 60_000)) {
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
    const zeroAi = Boolean(body.zeroAi);

    // liveSearch has its own wall — do not race to empty 504 (that caused "échec" SERPs).
    const result = await liveSearch(query, {
      sliders,
      zeroAi,
      zeroAds: Boolean(body.zeroAds),
      privateMode: Boolean(body.privateMode),
    });

    // Skip LLM when SERP already has strong local hits (apps sœurs / index maison).
    const strongLocal = result.results.some(
      (r) =>
        (typeof r.rankScore === "number" && r.rankScore >= 200) ||
        /\b(jemsa|tala|sombateka|omega|ayeba|devalpha)\b/i.test(`${r.title} ${r.domain}`),
    );
    if (!zeroAi && !strongLocal) {
      const llmSummary = await Promise.race([
        synthesizeWithLlm(query, result.results, result.knowledge?.summary),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
      ]);
      if (llmSummary) result.aiSummary = llmSummary;
    }

    after(async () => {
      try {
        if (!body.privateMode && query.trim() && result.results?.length) {
          recordImpressions(
            query.trim(),
            result.results.map((r, i) => ({
              url: r.url,
              domain: r.domain,
              position: i + 1,
            })),
          );
        }
      } catch (e) {
        console.warn("[search] impressions skipped", e);
      }
      try {
        if (body.privateMode || !query.trim()) return;
        const session = await getSessionFromCookies();
        if (session) await pushSearchHistory(session.id, query.trim());
      } catch (e) {
        console.warn("[search] history skipped", e);
      }
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Recherche indisponible", message: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
