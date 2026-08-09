import { NextResponse, after } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { pushSearchHistory } from "@/lib/db";
import { synthesizeWithLlm } from "@/lib/llm";
import { rateLimit } from "@/lib/rate-limit";
import { liveSearch } from "@/lib/real-search";
import type { AlgorithmSliders } from "@/lib/types";

export const maxDuration = 12;

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
    const zeroAi = Boolean(body.zeroAi);

    const result = await Promise.race([
      liveSearch(query, {
        sliders,
        zeroAi,
        zeroAds: Boolean(body.zeroAds),
        privateMode: Boolean(body.privateMode),
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 7000)),
    ]);

    if (!result) {
      return NextResponse.json(
        { error: "Recherche trop longue — réessayez", message: "deadline" },
        { status: 504 },
      );
    }

    // Never block SERP on LLM — race hard; fallback keeps buildSynthesis.
    if (!zeroAi) {
      const llmSummary = await Promise.race([
        synthesizeWithLlm(query, result.results, result.knowledge?.summary),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
      ]);
      if (llmSummary) result.aiSummary = llmSummary;
    }

    // History off the critical path (Next.js after).
    after(async () => {
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
