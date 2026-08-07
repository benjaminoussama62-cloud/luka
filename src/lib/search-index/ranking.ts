import type { FtsHit } from "./fts";
import { clickBoost } from "./fts";
import { extractFeatures, getMlWeights, mlScore } from "./ml-rank";

export type RankedHit = FtsHit & { score: number; signals: string[] };

const SPAM_HINTS = /\b(click here|you won't believe|shocking|miracle cure)\b/i;

export function rankHits(
  hits: FtsHit[],
  query: string,
  opts: { localityBoost?: number; authorityBoost?: number } = {},
): RankedHit[] {
  const locality = opts.localityBoost ?? 1;
  const authority = opts.authorityBoost ?? 1;
  const weights = getMlWeights();

  const scored = hits.map((h) => {
    const features = extractFeatures(
      {
        rank: h.rank,
        title: h.title,
        snippet: h.snippet,
        url: h.url,
        domain: h.domain,
        credibility: h.credibility,
        localRelevant: h.localRelevant,
        sourceType: h.sourceType,
        clickBoost: clickBoost(query, h.url),
        bodyLen: h.snippet.length * 8,
      },
      query,
    );

    features.localRdc *= locality > 0.5 ? 1.2 : 0.8;
    features.domainTrust *= authority > 0.5 ? 1.15 : 0.9;

    let score = mlScore(features, weights);
    const signals: string[] = ["ml-rank", "fts"];

    if (SPAM_HINTS.test(h.title + h.snippet)) {
      score += weights.spamPenalty * 100;
      signals.push("spam-filter");
    }

    return { ...h, score, signals };
  });

  return scored.sort((a, b) => b.score - a.score);
}
