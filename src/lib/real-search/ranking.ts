import {
  FIRST_PARTY_HOST,
  isCongoHint,
  isStrongAyebiMatch,
  rdcRankingBoost,
  relevanceAgainstSubjects,
  topBrandScore,
} from "../search-relevance";
import { geoMismatchPenalty } from "../query-intent";
import type { SearchResult } from "../types";
import { domainAuthority } from "./authority";
import { cleanSnippet, domainOf, favicon, type FetchOpts, type RawHit } from "./shared";

export function toResult(hit: RawHit, i: number, query: string): SearchResult {
  const rawDomain = domainOf(hit.url);
  const publisherHost = hit.publisherUrl ? domainOf(hit.publisherUrl) : "";
  const isGoogleNews =
    hit.source === "google-news" || rawDomain.includes("news.google");
  const domain =
    publisherHost && !publisherHost.includes("news.google")
      ? publisherHost
      : hit.publisher?.trim()
        ? hit.publisher.trim()
        : isGoogleNews
          ? "média"
          : rawDomain;
  const displayUrl =
    hit.publisherUrl && !hit.publisherUrl.includes("news.google")
      ? hit.publisherUrl
      : hit.url;
  const favDomain =
    publisherHost && !publisherHost.includes("news.google")
      ? publisherHost
      : domain.includes(".")
        ? domain
        : "google.com";
  const congo =
    isCongoHint(query) ||
    domain.endsWith(".cd") ||
    /\b(congo|rdc|kinshasa)\b/i.test(`${hit.title} ${hit.snippet}`);
  const spammy = /\b(incroyable|secret|cliquez|crypto.?gratis|devenir riche)\b/i.test(
    hit.title,
  );
  return {
    id: `live-${i}-${domain}`,
    title: hit.title,
    url: displayUrl,
    domain,
    snippet: cleanSnippet(hit.snippet || `Résultat pour « ${query} » — ${domain}`),
    favicon: favicon(favDomain),
    // Date réelle uniquement (RSS pubDate, Brave age) — jamais « aujourd'hui » fabriqué.
    ...(hit.publishedAt ? { publishedAt: hit.publishedAt } : {}),
    ...(hit.position !== undefined ? { upstreamPosition: hit.position } : {}),
    lang: /[àâçéèêëîïôùûü]/i.test(hit.title + hit.snippet) ? "fr" : "en",
    sourceType: isGoogleNews
      ? "news"
      : domain.includes("wikipedia")
        ? "wiki"
        : domain.includes("arxiv") || domain.includes("nature")
          ? "academic"
          : domain.includes("gov") || domain.endsWith(".cd")
            ? "gov"
            : "web",
    suspectedAiSpam: spammy,
    congoRelevant: congo,
    region: congo ? "rdc" : domain.endsWith(".cd") ? "rdc" : "global",
    keywords: [
      ...query.toLowerCase().split(/\s+/).filter(Boolean),
      ...(hit.source === "wikipedia" ||
      hit.source === "duckduckgo" ||
      hit.source === "bing" ||
      hit.source === "brave" ||
      hit.source === "mojeek" ||
      hit.source === "ddg-html"
        ? ["retrieved:upstream"]
        : []),
    ],
    trust: {
      credibility: spammy ? 28 : domainAuthority(publisherHost || (domain.includes(".") ? domain : rawDomain)),
      clickbaitRisk: spammy ? 90 : 12,
      independentVerification: spammy ? 10 : 70,
      humanAuthoredLikelihood: spammy ? 20 : 85,
    },
    conflict: { detected: false, category: "none" },
  };
}

export function rankAndFilter(
  results: SearchResult[],
  query: string,
  opts: FetchOpts,
  subjects: readonly string[] = [],
): SearchResult[] {
  const q = query.toLowerCase();

  return results
    .filter((r) => {
      if (opts.zeroAi && r.suspectedAiSpam) return false;
      if ((opts.zeroAds || opts.privateMode) && r.isSponsored) return false;
      return true;
    })
    .map((r) => {
      let score = r.trust.credibility;
      const text = `${r.title} ${r.snippet}`;
      const rel = relevanceAgainstSubjects(text, query, subjects);
      score += rel;
      if (r.title.toLowerCase().includes(q)) score += 24;
      // Titre aligné sur l'entité comprise (phrase longue → sujet court).
      for (const s of subjects) {
        if (s.length >= 2 && r.title.toLowerCase().includes(s.toLowerCase())) {
          score += 28;
          break;
        }
      }
      // Ordre natif de l'index amont (Brave/Bing/Mojeek) : position 0 ≈ +34, décroît.
      if (r.upstreamPosition !== undefined) {
        score += Math.max(0, 34 - r.upstreamPosition * 2.4);
      }
      score += rdcRankingBoost(r, query, opts.sliders.locality, rel);
      if (r.sourceType === "academic") score += opts.sliders.audience * 0.2;
      if (r.sourceType === "wiki" || r.sourceType === "gov") score += opts.sliders.authority * 0.15;
      score -= r.trust.clickbaitRisk * 0.2;
      const prior = r.rankScore ?? 0;
      if (prior > 80) score += prior;
      const brandScore = topBrandScore(query);
      const firstParty = FIRST_PARTY_HOST.test(`${r.domain} ${r.url}`);
      if (firstParty) {
        // Boost first-party dès que le contenu matche la requête / l'entité —
        // pas seulement quand la requête est le nom de marque.
        if (brandScore >= 150) score += 180;
        else if (rel >= 12 || brandScore >= 60) score += 120;
        else if (r.domain === "ayebi" || r.url.startsWith("/ayebi/")) score += 40;
      } else if (
        (r.congoRelevant || r.domain.endsWith(".cd")) &&
        rel >= 28
      ) {
        score += 35;
      }
      if (r.domain === "ayebi" || r.url.startsWith("/ayebi/")) {
        score += isStrongAyebiMatch(rel, { slug: r.url.split("/").pop() || "", title: r.title }, query)
          ? 90
          : -40;
      }
      score -= geoMismatchPenalty(`${r.title} ${r.snippet} ${r.domain}`, query);
      // Commune Kinshasa demandée → pénaliser l'homonyme français (Lembach…).
      if (
        /\b(lemba|gombe|limete|matete|masina|ndjili|ngaliema)\b/i.test(query) &&
        /\b(alsace|bas[- ]rhin|france|strasbourg|lorraine)\b/i.test(`${r.title} ${r.snippet} ${r.domain}`)
      ) {
        score -= 220;
      }
      return { ...r, rankScore: Math.round(Math.max(0, score)) };
    })
    .sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0));
}

/**
 * Host crowding — Google n'affiche jamais 8 liens du même domaine.
 * Le domaine du meilleur résultat garde jusqu'à cap+1 liens (site dominant
 * = souvent celui cherché), les autres domaines sont plafonnés.
 */
export function diversifyResults(results: SearchResult[], cap = 2): SearchResult[] {
  if (results.length <= cap) return results;
  const counts = new Map<string, number>();
  const topDomain = results[0]?.domain;
  const out: SearchResult[] = [];
  for (const r of results) {
    const d = r.domain || domainOf(r.url);
    const n = counts.get(d) ?? 0;
    const limit = d === topDomain ? cap + 2 : cap;
    if (n >= limit) continue;
    counts.set(d, n + 1);
    out.push(r);
  }
  return out;
}

export function relatedFrom(query: string, results: SearchResult[]): string[] {
  const base = query.trim();
  if (!base) return [];
  const out = new Set<string>();
  out.add(`${base} actualité`);
  out.add(`${base} 2026`);
  if (results[0]?.domain) out.add(`site:${results[0].domain} ${base}`);
  if (results[0]?.title) {
    const words = results[0].title.split(/\s+/).slice(0, 3).join(" ");
    if (words.length > 3) out.add(words);
  }
  out.add(`${base} définition`);
  out.add(`${base} images`);
  return [...out].slice(0, 6);
}
