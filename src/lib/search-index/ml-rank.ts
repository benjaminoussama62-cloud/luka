import { getDb } from "../storage/database";

export type RankFeatures = {
  fts: number;
  titleMatch: number;
  domainTrust: number;
  localRdc: number;
  clickBoost: number;
  contentLen: number;
  freshness: number;
  queryCoverage: number;
  spamPenalty: number;
  ayebiBoost: number;
  newsBoost: number;
  academicBoost: number;
  govBoost: number;
  urlDepth: number;
  hasImage: number;
  linkCount: number;
};

export type MlWeights = Record<keyof RankFeatures, number>;

const DEFAULT_WEIGHTS: MlWeights = {
  fts: 0.35,
  titleMatch: 0.22,
  domainTrust: 0.15,
  localRdc: 0.12,
  clickBoost: 0.18,
  contentLen: 0.04,
  freshness: 0.06,
  queryCoverage: 0.14,
  spamPenalty: -0.25,
  ayebiBoost: 0.2,
  newsBoost: 0.08,
  academicBoost: 0.1,
  govBoost: 0.12,
  urlDepth: -0.03,
  hasImage: 0.02,
  linkCount: 0.05,
};

export function getMlWeights(): MlWeights {
  const row = getDb()
    .prepare("SELECT weights_json FROM ml_rank_weights WHERE id = 1")
    .get() as { weights_json: string } | undefined;
  if (!row) return DEFAULT_WEIGHTS;
  return { ...DEFAULT_WEIGHTS, ...JSON.parse(row.weights_json) };
}

export function extractFeatures(
  hit: {
    rank?: number;
    title: string;
    snippet: string;
    url: string;
    domain: string;
    credibility: number;
    localRelevant: boolean;
    sourceType?: string;
    clickBoost?: number;
    bodyLen?: number;
    crawledAt?: string;
  },
  query: string,
): RankFeatures {
  const qTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  const titleLower = hit.title.toLowerCase();
  const textLower = `${hit.title} ${hit.snippet}`.toLowerCase();
  const coverage =
    qTokens.length === 0
      ? 0
      : qTokens.filter((t) => textLower.includes(t)).length / qTokens.length;

  let freshness = 0.5;
  if (hit.crawledAt) {
    const ageDays = (Date.now() - new Date(hit.crawledAt).getTime()) / 86400000;
    freshness = Math.max(0, 1 - ageDays / 365);
  }

  const urlDepth = (hit.url.match(/\//g) ?? []).length;
  const spamPenalty = /\b(click here|miracle|shocking|you won't believe)\b/i.test(
    hit.title + hit.snippet,
  )
    ? 1
    : 0;

  return {
    fts: Math.min(Math.abs(hit.rank ?? 0) / 10, 1),
    titleMatch: qTokens.some((t) => titleLower.includes(t)) ? 1 : 0,
    domainTrust: Math.min(hit.credibility, 1),
    localRdc: hit.localRelevant || hit.domain.endsWith(".cd") ? 1 : 0,
    clickBoost: Math.min((hit.clickBoost ?? 0) / 25, 1),
    contentLen: Math.min((hit.bodyLen ?? hit.snippet.length) / 4000, 1),
    freshness,
    queryCoverage: coverage,
    spamPenalty,
    ayebiBoost: hit.domain === "ayebi" || hit.sourceType === "wiki" ? 1 : 0,
    newsBoost: hit.sourceType === "news" ? 1 : 0,
    academicBoost: hit.sourceType === "academic" ? 1 : 0,
    govBoost: hit.sourceType === "gov" ? 1 : 0,
    urlDepth: Math.min(urlDepth / 12, 1),
    hasImage: /\.(jpg|jpeg|png|webp|gif)/i.test(hit.url) ? 1 : 0,
    linkCount: 0,
  };
}

export function mlScore(features: RankFeatures, weights = getMlWeights()): number {
  let score = 0;
  for (const k of Object.keys(features) as (keyof RankFeatures)[]) {
    score += features[k] * weights[k];
  }
  return score * 100;
}

/** Apprentissage en ligne (SGD) à partir d'un clic positif */
export function trainFromClick(
  features: RankFeatures,
  clickedScore: number,
  baselineScore: number,
  lr = 0.02,
) {
  const db = getDb();
  const weights = getMlWeights();
  const reward = clickedScore > baselineScore ? 1 : -0.3;

  for (const k of Object.keys(features) as (keyof RankFeatures)[]) {
    weights[k] += lr * reward * features[k] * 0.1;
  }

  db.prepare(
    "UPDATE ml_rank_weights SET weights_json = ?, samples = samples + 1, updated_at = ? WHERE id = 1",
  ).run(JSON.stringify(weights), new Date().toISOString());
}

export function mlRankHits<T extends { title: string; snippet: string; url: string; domain: string; credibility: number; localRelevant: boolean; sourceType?: string; rank?: number; score?: number }>(
  hits: T[],
  query: string,
  clickBoostFn: (url: string) => number,
): Array<T & { mlScore: number; features: RankFeatures }> {
  const weights = getMlWeights();
  return hits
    .map((h) => {
      const features = extractFeatures(
        { ...h, clickBoost: clickBoostFn(h.url) },
        query,
      );
      const mlScoreVal = mlScore(features, weights);
      return { ...h, mlScore: mlScoreVal, features, score: mlScoreVal };
    })
    .sort((a, b) => b.mlScore - a.mlScore);
}
