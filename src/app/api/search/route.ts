import { NextResponse, after } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
import { pushSearchHistory } from "@/lib/db";
import { synthesizeWithLlm } from "@/lib/llm";
import { rateLimit } from "@/lib/rate-limit";
import { liveSearch } from "@/lib/real-search";
import { recordImpressions } from "@/lib/search-index/fts";
import { getDbMode } from "@/lib/storage/database";
import {
  pushSearchHistoryAsync,
  recordImpressionsAsync,
} from "@/lib/storage/turso-async";
import type { AlgorithmSliders, SearchResponse } from "@/lib/types";

export const maxDuration = 60;

/** Past this, answer with a local-only SERP instead of risking a platform 504. */
const DEADLINE_MS = Number(process.env.AYEBA_SEARCH_DEADLINE_MS) || 4500;

function serverTiming(timings: Record<string, number>, degraded: boolean) {
  const parts = Object.entries(timings).map(([k, v]) => `${k};dur=${v}`);
  parts.push(`mode;desc="${degraded ? "degraded" : "full"}"`);
  return parts.join(", ");
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const timings: Record<string, number> = {};

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!rateLimit(`search:${ip}`, 180, 60_000)) {
      return NextResponse.json(
        { error: "Trop de requêtes — réessayez dans une minute." },
        { status: 429 },
      );
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
    const opts = {
      sliders,
      zeroAi,
      zeroAds: Boolean(body.zeroAds),
      privateMode: Boolean(body.privateMode),
      timings,
    };

    // liveSearch has its own wall, but a stuck upstream or a slow region must never
    // burn the whole invocation: fall back to a local-only SERP instead of a 504.
    let degraded = false;
    let result = await Promise.race([
      liveSearch(query, opts),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), DEADLINE_MS),
      ),
    ]);
    if (!result) {
      degraded = true;
      result = await liveSearch(query, { ...opts, skipUpstream: true });
    }
    const serp: SearchResponse = result;

    // Skip LLM when SERP already has strong local hits (apps sœurs / index maison).
    const strongLocal = serp.results.some(
      (r) =>
        (typeof r.rankScore === "number" && r.rankScore >= 200) ||
        /\b(jemsa|tala|sombateka|omega|ayeba|devalpha)\b/i.test(
          `${r.title} ${r.domain}`,
        ),
    );
    const llmBudget = Math.min(
      800,
      DEADLINE_MS + 1500 - (Date.now() - startedAt),
    );
    if (!zeroAi && !degraded && !strongLocal && llmBudget > 200) {
      const llmSummary = await Promise.race([
        synthesizeWithLlm(query, serp.results, serp.knowledge?.summary),
        new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), llmBudget),
        ),
      ]);
      if (llmSummary) serp.aiSummary = llmSummary;
    }

    timings.route = Date.now() - startedAt;

    after(async () => {
      const turso = getDbMode() === "turso";
      try {
        if (!body.privateMode && query.trim() && serp.results?.length) {
          const impressions = serp.results.slice(0, 20).map((r, i) => ({
            url: r.url,
            domain: r.domain,
            position: i + 1,
          }));
          // The sync libsql driver blocks the event loop per statement — never use it
          // on a Turso deployment, one SERP would cost a dozen blocking round trips.
          if (turso) await recordImpressionsAsync(query.trim(), impressions);
          else recordImpressions(query.trim(), impressions);
        }
      } catch (e) {
        console.warn("[search] impressions skipped", e);
      }
      try {
        if (body.privateMode || !query.trim()) return;
        const userId = await getSessionUserId();
        if (!userId) return;
        if (turso) await pushSearchHistoryAsync(userId, query.trim());
        else await pushSearchHistory(userId, query.trim());
      } catch (e) {
        console.warn("[search] history skipped", e);
      }
    });

    return NextResponse.json(serp, {
      headers: { "Server-Timing": serverTiming(timings, degraded) },
    });
  } catch (e) {
    console.error("[search]", e, timings);
    return NextResponse.json(
      {
        error: "Recherche indisponible",
        message: e instanceof Error ? e.message : "error",
      },
      {
        status: 500,
        headers: { "Server-Timing": serverTiming(timings, true) },
      },
    );
  }
}
