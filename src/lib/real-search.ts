import { didYouMean, searchLocalIndex } from "./ayeba-index";
import { searchSisterApps, scoreBrandDoc } from "./sister-search";
import { searchAyebiArticles, scoreArticle } from "./ayebi/index";
import { searchAyebiArticlesLive } from "./ayebi/server";
import type { AyebiArticle } from "./ayebi/types";
import { searchCrawlIndex } from "./crawler";
import { panelFromQuery } from "./knowledge-graph/graph";
import { resolveInstantAnswers } from "./instant-answers";
import { answerQuestion } from "./question-answer";
import { understandQuery } from "./query-understanding";
import { cacheGet, cacheSet } from "./cache/redis";
import { searchIndex } from "./search-index/fts";
import { rankHits } from "./search-index/ranking";
import { searchImagesNative } from "./verticals/images";
import { searchMapsNative } from "./verticals/maps";
import { searchVideosNative } from "./verticals/videos";
import { searchProducts } from "./verticals/shopping";
import { searchCommunity } from "./verticals/community";
import { getDbMode } from "./storage/database";
import { searchAyebiAsync, searchIndexAsync } from "./storage/turso-async";
import {
  ayebiPanelMinScore,
  isCongoHint,
  isRawHitRelevant,
  normalizeQueryText,
  isResultRelevant,
  isStrongAyebiMatch,
  isStrongBrandQuery,
  navigationalSiteForQuery,
  rdcRankingBoost,
  relevanceScore,
  topBrandScore,
} from "./search-relevance";
import {
  geoMismatchPenalty,
  geoSubjectsInQuery,
  knownCapitalAnswer,
  normalizeSmsFrench,
  parseSearchIntent,
  upstreamQuery,
} from "./query-intent";
import type {
  AlgorithmSliders,
  CommunityPost,
  FeaturedSnippet,
  KnowledgePanel,
  MapPlace,
  MediaResult,
  SearchResponse,
  SearchResult,
} from "./types";

function envMs(name: string, fallback: number) {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/** Hard ceiling for any single upstream — users leave engines that feel slow. */
const UPSTREAM_MS = envMs("AYEBA_UPSTREAM_MS", 1500);
const UPSTREAM_FAST_MS = envMs("AYEBA_UPSTREAM_FAST_MS", 800);
/** Whole liveSearch must finish under this — the route wraps it in a shorter deadline. */
const SEARCH_WALL_MS = envMs("AYEBA_SEARCH_WALL_MS", 3500);

/** Full SERP memory cache (always on — never block on Turso/SQLite for this). */
const serpMemory = new Map<string, { at: number; body: SearchResponse }>();
const SERP_TTL_MS = 90_000;

function ayebiRichSnippet(article: AyebiArticle, max = 360): string {
  const lead = article.sections?.[0]?.paragraphs?.[0];
  const text = lead ? `${article.summary} ${lead}` : article.summary;
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

function ayebiKnowledgePanel(article: AyebiArticle): KnowledgePanel {
  return {
    title: article.title,
    subtitle: article.subtitle,
    summary: ayebiRichSnippet(article, 520),
    facts: [
      ...article.facts.slice(0, 5),
      { label: "Lire sur Ayebi", value: `/ayebi/${article.slug}` },
    ],
    sources: ["ayebi"],
    image: article.image,
  };
}

function officialSiteForAyebi(slug: string): string | undefined {
  const map: Record<string, string> = {
    jemsa: "https://jemsa.net",
    tala: "https://to-tala.com",
    sombateka: "https://sombatekaonline.com",
    omega: "https://omega-web.org",
    devalpha: "https://devalpha1.com",
    ayeba: "https://ayeba.app",
  };
  return map[slug];
}

type FetchOpts = {
  zeroAi: boolean;
  zeroAds: boolean;
  privateMode: boolean;
  sliders: AlgorithmSliders;
  /** Local-only SERP: no upstream fetch, no remote index read. Always sub-second. */
  skipUpstream?: boolean;
  /** Filled with per-stage durations in ms — surfaced as Server-Timing by the route. */
  timings?: Record<string, number>;
};

async function timed<T>(
  timings: Record<string, number> | undefined,
  label: string,
  run: () => Promise<T>,
): Promise<T> {
  if (!timings) return run();
  const start = Date.now();
  try {
    return await run();
  } finally {
    timings[label] = Date.now() - start;
  }
}

type RawHit = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  /** Visible publisher label (never news.google.com for aggregated news). */
  publisher?: string;
  publisherUrl?: string;
};

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Decode entities then strip tags — prevents `&lt;a href=…&gt;` from flooding the SERP. */
export function cleanSnippet(raw: string, max = 280): string {
  let s = raw ?? "";
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    });
  // Prefer visible link text over raw href dumps
  s = s.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/https?:\/\/\S+/gi, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > max) s = `${s.slice(0, max - 1).trim()}…`;
  return s;
}

function favicon(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

function isRelevantToQuery(hit: RawHit, query: string): boolean {
  return isRawHitRelevant(hit, query);
}

function isRelevantResult(r: SearchResult, query: string): boolean {
  return isResultRelevant(r, query);
}

function credibilityFor(domain: string): number {
  const high = [
    "wikipedia.org",
    "who.int",
    "imf.org",
    "worldbank.org",
    "nasa.gov",
    "nature.com",
    "reuters.com",
    "bbc.com",
    "lemonde.fr",
    "gov",
    ".cd",
    "un.org",
    "edu",
  ];
  if (high.some((h) => domain.includes(h))) return 88 + Math.floor(Math.random() * 8);
  if (domain.includes("blogspot") || domain.includes("medium.com")) return 55;
  return 62 + Math.floor(Math.random() * 18);
}

function toResult(hit: RawHit, i: number, query: string): SearchResult {
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
    publishedAt: new Date().toISOString().slice(0, 10),
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
    keywords: query.toLowerCase().split(/\s+/),
    trust: {
      credibility: spammy ? 28 : credibilityFor(publisherHost || (domain.includes(".") ? domain : rawDomain)),
      clickbaitRisk: spammy ? 90 : 12,
      independentVerification: spammy ? 10 : 70,
      humanAuthoredLikelihood: spammy ? 20 : 85,
    },
    conflict: { detected: false, category: "none" },
  };
}

async function fetchWikipedia(query: string, lang: "fr" | "en"): Promise<RawHit[]> {
  try {
    const open = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=8&namespace=0&format=json&origin=*`,
      { signal: AbortSignal.timeout(UPSTREAM_MS), next: { revalidate: 0 } },
    );
    if (!open.ok) return [];
    const data = (await open.json()) as [string, string[], string[], string[]];
    const titles = data[1] ?? [];
    const descs = data[2] ?? [];
    const urls = data[3] ?? [];
    return titles.map((title, i) => ({
      title: `${title} — Wikipédia`,
      url: urls[i],
      snippet: descs[i] || `Article Wikipédia (${lang}) sur ${title}.`,
      source: "wikipedia",
    }));
  } catch {
    return [];
  }
}

async function fetchWikiSummary(query: string): Promise<KnowledgePanel | undefined> {
  for (const lang of ["fr", "en"] as const) {
    try {
      const res = await fetch(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
        { signal: AbortSignal.timeout(UPSTREAM_FAST_MS), next: { revalidate: 0 } },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        title?: string;
        extract?: string;
        description?: string;
        content_urls?: { desktop?: { page?: string } };
        thumbnail?: { source?: string };
      };
      if (!data.extract) continue;
      return {
        title: data.title ?? query,
        subtitle: data.description ?? `Wikipédia (${lang})`,
        summary: data.extract,
        facts: [
          { label: "Source", value: `Wikipédia ${lang.toUpperCase()}` },
          { label: "Type", value: "Encyclopédie" },
          {
            label: "Lien",
            value: data.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org`,
          },
        ],
        sources: [`${lang}.wikipedia.org`],
        image: data.thumbnail?.source,
      };
    } catch {
      /* try next */
    }
  }
  return undefined;
}

async function fetchDuckDuckGo(query: string): Promise<RawHit[]> {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(UPSTREAM_MS), next: { revalidate: 0 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      AbstractText?: string;
      AbstractURL?: string;
      Heading?: string;
      RelatedTopics?: Array<
        | { Text?: string; FirstURL?: string }
        | { Topics?: Array<{ Text?: string; FirstURL?: string }> }
      >;
      Results?: Array<{ Text?: string; FirstURL?: string }>;
    };
    const hits: RawHit[] = [];
    if (data.AbstractText && data.AbstractURL) {
      hits.push({
        title: data.Heading || query,
        url: data.AbstractURL,
        snippet: data.AbstractText,
        source: "duckduckgo",
      });
    }
    const pushTopic = (t: { Text?: string; FirstURL?: string }) => {
      if (!t.FirstURL || !t.Text) return;
      hits.push({
        title: t.Text.split(" - ")[0] || t.Text.slice(0, 80),
        url: t.FirstURL,
        snippet: t.Text,
        source: "duckduckgo",
      });
    };
    for (const item of data.RelatedTopics ?? []) {
      if ("Topics" in item && item.Topics) item.Topics.forEach(pushTopic);
      else pushTopic(item as { Text?: string; FirstURL?: string });
    }
    for (const r of data.Results ?? []) pushTopic(r);
    return hits.slice(0, 12);
  } catch {
    return [];
  }
}

async function fetchDuckDuckGoHtml(query: string): Promise<RawHit[]> {
  try {
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "AyebaSearch/1.0",
      },
      body: `q=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(UPSTREAM_MS),
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const hits: RawHit[] = [];
    const re =
      /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && hits.length < 10) {
      const url = decodeURIComponent(
        m[1].includes("uddg=")
          ? (m[1].match(/uddg=([^&]+)/)?.[1] ?? m[1])
          : m[1],
      );
      const title = m[2].replace(/<[^>]+>/g, "").trim();
      const snippet = m[3].replace(/<[^>]+>/g, "").trim();
      if (url.startsWith("http") && title) {
        hits.push({ title, url, snippet, source: "duckduckgo-html" });
      }
    }
    // Fallback simpler pattern
    if (hits.length === 0) {
      const simple =
        /class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)</gi;
      while ((m = simple.exec(html)) && hits.length < 8) {
        let url = m[1];
        if (url.includes("uddg=")) {
          url = decodeURIComponent(url.match(/uddg=([^&]+)/)?.[1] ?? url);
        }
        hits.push({
          title: m[2].trim(),
          url,
          snippet: `Résultat web pour « ${query} »`,
          source: "duckduckgo-html",
        });
      }
    }
    return hits;
  } catch {
    return [];
  }
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const JUNK_TITLE_RE =
  /^(newsletter|subscribe|sign up|sign in|log in|login|home|accueil|menu|search|recherche|cookies?|advertisement|sponsored)$/i;

export function isJunkHit(title: string, url: string): boolean {
  const t = title.trim();
  if (!t || t.length < 4) return true;
  if (JUNK_TITLE_RE.test(t)) return true;
  if (/\.(css|js|xml|json|ico|svg|woff2?)(\?|$)/i.test(url)) return true;
  return false;
}

async function fetchBing(query: string): Promise<RawHit[]> {
  try {
    const res = await fetch(
      `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=12&setlang=fr`,
      {
        headers: {
          "User-Agent": BROWSER_UA,
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
        },
        signal: AbortSignal.timeout(UPSTREAM_MS),
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) return [];
    const html = await res.text();
    const hits: RawHit[] = [];
    const blocks = html.split(/<li class="b_algo"/i).slice(1);
    for (const block of blocks) {
      if (hits.length >= 10) break;
      const link = block.match(/<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!link) continue;
      const url = link[1];
      if (!/^https?:\/\//i.test(url) || /bing\.com|microsoft\.com\/(fr|en)\/search/i.test(url)) {
        continue;
      }
      const title = link[2].replace(/<[^>]+>/g, "").trim();
      const snipMatch =
        block.match(/<p class="b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ??
        block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      const snippet = snipMatch ? cleanSnippet(snipMatch[1].replace(/<[^>]+>/g, ""), 240) : "";
      if (title && !isJunkHit(title, url)) hits.push({ title, url, snippet, source: "bing" });
    }
    return hits;
  } catch {
    return [];
  }
}

async function fetchMojeek(query: string): Promise<RawHit[]> {
  try {
    const res = await fetch(
      `https://www.mojeek.com/search?q=${encodeURIComponent(query)}`,
      {
        headers: { "User-Agent": BROWSER_UA, "Accept-Language": "fr,en;q=0.8" },
        signal: AbortSignal.timeout(UPSTREAM_MS),
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) return [];
    const html = await res.text();
    const hits: RawHit[] = [];
    const listMatch = html.match(/<ul class="results-standard">([\s\S]*?)<\/ul>/i);
    const list = listMatch ? listMatch[1] : html;
    for (const block of list.split(/<li[ >]/i).slice(1)) {
      if (hits.length >= 10) break;
      const link = block.match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!link || /mojeek\.com/.test(link[1])) continue;
      const title = link[2].replace(/<[^>]+>/g, "").trim();
      const snipMatch = block.match(/<p class="s"[^>]*>([\s\S]*?)<\/p>/i);
      const snippet = snipMatch ? cleanSnippet(snipMatch[1].replace(/<[^>]+>/g, ""), 240) : "";
      if (title && !isJunkHit(title, link[1])) {
        hits.push({ title, url: link[1], snippet, source: "mojeek" });
      }
    }
    return hits;
  } catch {
    return [];
  }
}

async function fetchNewsRss(query: string): Promise<RawHit[]> {
  try {
    const res = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=fr&gl=FR&ceid=FR:fr`,
      {
        headers: { "User-Agent": "AyebaSearch/1.0" },
        signal: AbortSignal.timeout(UPSTREAM_MS),
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 8);
    return items.map((item) => {
      const block = item[1];
      let title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        ?? block.match(/<title>(.*?)<\/title>/)?.[1]
        ?? "Article";
      const link = (block.match(/<link>(.*?)<\/link>/)?.[1] ?? "#").trim();
      const sourceUrl = block.match(/<source[^>]*url="([^"]+)"/i)?.[1]?.trim();
      let publisher =
        block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1]?.trim()
        ?? "";
      // Titles often end with " - Publisher"
      const dash = title.match(/^(.*?)\s+[-–—]\s+(.+)$/);
      if (dash) {
        if (!publisher) publisher = dash[2].trim();
        title = dash[1].trim();
      }
      const rawDesc =
        block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
        ?? block.match(/<description>(.*?)<\/description>/)?.[1]
        ?? "";
      // Prefer a real publisher URL from the description, not news.google.com
      const hrefs = [...rawDesc.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
      const publisherUrl =
        sourceUrl ||
        hrefs.find((h) => /^https?:\/\//i.test(h) && !h.includes("news.google.")) ||
        undefined;
      const desc = cleanSnippet(rawDesc, 220);
      // Avoid duplicate title-as-snippet
      const snippet =
        desc && !desc.toLowerCase().startsWith(title.slice(0, 40).toLowerCase())
          ? desc
          : publisher
            ? `Article · ${publisher}`
            : `Actualité — ${cleanSnippet(title, 80)}`;

      return {
        title: cleanSnippet(title, 160),
        url: link,
        snippet,
        source: "google-news",
        publisher: publisher || undefined,
        publisherUrl,
      };
    });
  } catch {
    return [];
  }
}

function rankAndFilter(
  results: SearchResult[],
  query: string,
  opts: FetchOpts,
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
      const rel = relevanceScore(`${r.title} ${r.snippet}`, query);
      score += rel;
      if (r.title.toLowerCase().includes(q)) score += 24;
      score += rdcRankingBoost(r, query, opts.sliders.locality, rel);
      if (r.sourceType === "academic") score += opts.sliders.audience * 0.2;
      if (r.sourceType === "wiki" || r.sourceType === "gov") score += opts.sliders.authority * 0.15;
      score -= r.trust.clickbaitRisk * 0.2;
      const prior = r.rankScore ?? 0;
      if (prior > 80) score += prior;
      const brandScore = topBrandScore(query);
      if (
        brandScore >= 150 &&
        /\b(jemsa\.net|to-tala\.com|sombatekaonline|omega-web\.org|devalpha1\.com|ayeba\.app)\b/i.test(
          r.domain,
        )
      ) {
        score += 180;
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
      return { ...r, rankScore: Math.round(Math.max(0, score)) };
    })
    .sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0));
}

function relatedFrom(query: string, results: SearchResult[]): string[] {
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

/**
 * Évaluation réelle — pas de chaîne préenregistrée :
 *  - arithmétique « 2*(3+4)^2 », « 20% de 150 »
 *  - équation du 1er degré « x = 2+3*x », « 2x+4 = 10 » → solution exacte
 */
export function evalMath(expr: string): string | undefined {
  const eq = expr.match(/^([^=]+)=([^=]+)$/);
  if (eq) {
    const varName = ((eq[1] + eq[2]).match(/[a-z]/i) ?? [])[0];
    if (!varName) return undefined;
    // Décompose un membre en { coef·var + const } — termes ±N, ±Nx, ±N*x.
    const side = (s: string): { a: number; b: number } | null => {
      const t = s.replace(/\s+/g, "");
      const varRe = new RegExp(`^([+-]?)([\\d.]*)\\*?${varName}$`, "i");
      const terms = t.match(/[+-]?[^+-]+/g);
      if (!terms) return null;
      let a = 0;
      let b = 0;
      for (const term of terms) {
        const varTerm = term.match(varRe);
        if (varTerm) {
          const sign = varTerm[1] === "-" ? -1 : 1;
          const num = varTerm[2] === "" ? 1 : Number(varTerm[2]);
          if (!Number.isFinite(num)) return null;
          a += sign * num;
          continue;
        }
        const constTerm = term.match(/^([+-]?)([\d.]+)$/);
        if (!constTerm) return null;
        const num = Number(constTerm[2]);
        if (!Number.isFinite(num)) return null;
        b += (constTerm[1] === "-" ? -1 : 1) * num;
      }
      return { a, b };
    };
    const L = side(eq[1]);
    const R = side(eq[2]);
    if (!L || !R) return undefined;
    const a = L.a - R.a;
    const b = R.b - L.b;
    if (a === 0) return b === 0 ? `${varName} ∈ ℝ — infinité de solutions` : "Pas de solution";
    const x = b / a;
    return `${varName} = ${Number.isInteger(x) ? String(x) : x.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}`;
  }
  try {
    const val = Function(`"use strict"; return (${expr.replace(/\^/g, "**")})`)();
    if (typeof val !== "number" || !Number.isFinite(val)) return undefined;
    return Number.isInteger(val)
      ? String(val)
      : val.toLocaleString("fr-FR", { maximumFractionDigits: 6 });
  } catch {
    return undefined;
  }
}

function tryMathSnippet(query: string): FeaturedSnippet | undefined {
  const display = query.trim().replace(/[?!.\s]+$/, "");
  const intent = parseSearchIntent(query);
  if (intent.kind !== "math") return undefined;
  const text = evalMath(intent.expr);
  if (!text) return undefined;
  return { title: display, text, url: "#calc", domain: "ayeba" };
}

function buildSynthesis(
  query: string,
  knowledge: KnowledgePanel | undefined,
  results: SearchResult[],
  news: SearchResult[],
): string {
  if (knowledge?.summary) {
    const text = knowledge.summary.replace(/\s+/g, " ").trim();
    const cut = text.length > 420 ? `${text.slice(0, 417).replace(/\s+\S*$/, "")}…` : text;
    return cut;
  }

  const pieces = results
    .slice(0, 3)
    .map((r) => r.snippet.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 40);

  if (pieces.length >= 2) {
    return `${pieces[0]} ${pieces[1]}`;
  }
  if (pieces[0]) return pieces[0];
  if (news[0]?.snippet) return news[0].snippet.replace(/\s+/g, " ").trim();
  return `Peu de contenu fiable trouvé pour « ${query} ». Reformulez ou élargissez la requête.`;
}

function buildQuestions(
  query: string,
  knowledge: KnowledgePanel | undefined,
  results: SearchResult[],
  news: SearchResult[],
  congo: boolean,
  ayebiArticle?: AyebiArticle,
): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];

  if (ayebiArticle?.sections?.length) {
    for (const sec of ayebiArticle.sections.slice(0, 2)) {
      const para = sec.paragraphs[0];
      if (para) {
        out.push({
          q: sec.heading,
          a: para.slice(0, 340),
        });
      }
    }
  }

  if (knowledge?.summary && !out.length) {
    out.push({
      q: `Que sait-on de ${knowledge.title} ?`,
      a: knowledge.summary.slice(0, 320),
    });
  } else if (results[0] && !out.length) {
    out.push({
      q: `Que disent les sources principales ?`,
      a: results[0].snippet,
    });
  }

  if (news[0]) {
    out.push({
      q: `Quels faits récents ressortent ?`,
      a: `${news[0].title}. ${news[0].snippet}`.slice(0, 320),
    });
  } else if (results[1] && out.length < 3) {
    out.push({
      q: `Site officiel et compléments`,
      a: results[1].snippet,
    });
  }

  if (congo && out.length < 3) {
    out.push({
      q: `Quel est le lien avec la RDC ou l'Afrique centrale ?`,
      a:
        results.find((r) => r.congoRelevant)?.snippet ??
        "Les sources régionales et .cd sont relevées quand elles existent ; le web mondial reste visible.",
    });
  }

  return out.slice(0, 4);
}

// TODO: Integrate these functions when needed
/*
async function fetchOpenverseImages(query: string): Promise<MediaResult[]> {
  try {
    const res = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=12`,
      {
        headers: { "User-Agent": "AyebaSearch/1.0" },
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{ id: string; title?: string; url?: string; thumbnail?: string; foreign_landing_url?: string }>;
    };
    return (data.results ?? []).map((img, i) => ({
      id: img.id || `ov-${i}`,
      title: img.title || query,
      url: img.foreign_landing_url || img.url || "#",
      thumb: img.thumbnail || img.url || "",
      source: "Openverse",
      type: "image" as const,
    }));
  } catch {
    return [];
  }
}

async function fetchNominatim(query: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&addressdetails=1`,
      {
        headers: { "User-Agent": "AyebaSearch/1.0 (congolaise search engine)" },
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      type?: string;
      class?: string;
    }>;
    return data.map((p) => ({
      id: String(p.place_id),
      name: p.display_name.split(",")[0] || p.display_name,
      category: p.type || p.class || "lieu",
      lat: Number(p.lat),
      lon: Number(p.lon),
      address: p.display_name,
      url: `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=14/${p.lat}/${p.lon}`,
    }));
  } catch {
    return [];
  }
}

function buildShopping(query: string): any[] {
  const q = encodeURIComponent(query);
  const thumb = (domain: string) =>
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  return [
    {
      id: "shop-1",
      title: `${query} — Jumia RDC`,
      price: "comparer",
      currency: "CDF",
      store: "Jumia",
      url: `https://www.jumia.cd/catalog/?q=${q}`,
      thumb: thumb("jumia.cd"),
      rating: 4.2,
    },
    {
      id: "shop-2",
      title: `${query} — Amazon`,
      price: "comparer",
      currency: "USD",
      store: "Amazon",
      url: `https://www.amazon.com/s?k=${q}`,
      thumb: thumb("amazon.com"),
      rating: 4.4,
    },
    {
      id: "shop-3",
      title: `${query} — Alibaba B2B`,
      price: "devis",
      currency: "USD",
      store: "Alibaba",
      url: `https://www.alibaba.com/trade/search?SearchText=${q}`,
      thumb: thumb("alibaba.com"),
      rating: 4.0,
    },
    {
      id: "shop-4",
      title: `${query} — eBay`,
      price: "encheres",
      currency: "USD",
      store: "eBay",
      url: `https://www.ebay.com/sch/i.html?_nkw=${q}`,
      thumb: thumb("ebay.com"),
      rating: 4.1,
    },
    {
      id: "shop-5",
      title: `${query} — marchés Kinshasa`,
      price: "négociable",
      currency: "CDF",
      store: "Ayeba Local",
      url: `https://www.openstreetmap.org/search?query=${encodeURIComponent(query + " marché Kinshasa")}`,
      thumb: thumb("openstreetmap.org"),
      rating: 3.9,
    },
    {
      id: "shop-6",
      title: `${query} — Google Shopping`,
      price: "multi",
      currency: "USD",
      store: "Shopping",
      url: `https://www.google.com/search?tbm=shop&q=${q}`,
      thumb: thumb("google.com"),
      rating: 4.3,
    },
  ];
}
*/

async function settled<T>(p: Promise<T>, fallback: T, ms = UPSTREAM_MS): Promise<T> {
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
    ]);
  } catch {
    return fallback;
  }
}

export async function liveSearch(query: string, opts: FetchOpts): Promise<SearchResponse> {
  const startedAt = Date.now();
  const rawQuery = query.trim() || "actualité mondiale";
  // Suggestion « vouliez-vous dire » : d'abord le correcteur local, sinon la forme
  // SMS normalisée (« dans kel commune c trouve… » → « dans quelle commune se trouve… »).
  const smsFixed = normalizeSmsFrench(rawQuery);
  // La suggestion n'est affichée que si la normalisation a réellement corrigé
  // un MOT — pas juste reformaté la ponctuation (« chaussure c'est quoi »
  // ne doit pas suggérer « chaussure se'est quoi »).
  const suggested =
    didYouMean(rawQuery) ??
    (smsFixed && smsFixed !== rawQuery.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[?.!]+/g, " ").replace(/\s+/g, " ").trim()
      ? smsFixed
      : undefined);
  const q = rawQuery;
  const serpKey = `fullserp:${q.toLowerCase()}:${opts.sliders.locality}:${opts.sliders.authority}:${opts.zeroAi ? 1 : 0}`;
  const cached = serpMemory.get(serpKey);
  if (cached && Date.now() - cached.at < SERP_TTL_MS) {
    if (opts.timings) opts.timings.cache = Date.now() - startedAt;
    return { ...cached.body, query: rawQuery };
  }

  const built = await liveSearchCore(rawQuery, suggested, q, opts);
  if (opts.timings) opts.timings.total = Date.now() - startedAt;
  // A degraded SERP must never poison the cache for the next full search.
  if (opts.skipUpstream) return built;
  serpMemory.set(serpKey, { at: Date.now(), body: built });
  if (serpMemory.size > 800) {
    const oldest = [...serpMemory.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 200);
    for (const [k] of oldest) serpMemory.delete(k);
  }
  return built;
}

async function liveSearchCore(
  rawQuery: string,
  suggested: string | undefined,
  q: string,
  opts: FetchOpts,
): Promise<SearchResponse> {
  // Local index first — never wait on crawl. Users switch engines for speed + relevance.
  const offline = Boolean(opts.skipUpstream);
  const wall = Date.now() + (offline ? 400 : SEARCH_WALL_MS);
  const msLeft = () => Math.max(200, wall - Date.now());
  const turso = getDbMode() === "turso";
  // Compréhension sémantique AVANT tout — l'équivalent de l'étape « intent »
  // de Google : le modèle corrige la requête, isole l'entité, classe
  // l'attribut en clé canonique, borne le type d'entité — dans n'importe
  // quelle langue. Les règles synchrones restent le filet quand le modèle
  // est absent (pas de clé, timeout) — jamais l'inverse.
  const understanding = offline ? null : await understandQuery(rawQuery);
  const ruleIntent = parseSearchIntent(rawQuery);
  let intent = ruleIntent;
  if (understanding) {
    if (understanding.intent === "calc" && understanding.expr && evalMath(understanding.expr)) {
      intent = { kind: "math", expr: understanding.expr, display: understanding.corrected };
    } else if (
      (understanding.intent === "question" ||
        understanding.intent === "definition" ||
        understanding.intent === "location") &&
      understanding.entity
    ) {
      intent = {
        kind: "question",
        qtype:
          understanding.intent === "definition"
            ? "what"
            : understanding.intent === "location"
              ? "where"
              : understanding.qtype,
        subject: understanding.entity,
        wikiQuery: understanding.entity,
        attr: understanding.attribute || undefined,
        attrEn: understanding.attributeEn || undefined,
        entityEn: understanding.entityEn || undefined,
        attrKey: understanding.attrKey || undefined,
        entityType: understanding.entityType || undefined,
      };
    } else if (ruleIntent.kind === "question" && understanding.entity) {
      // Règles ont reconnu une question — le modèle enrichit : sujet
      // canonique + clé d'attribut + type d'entité.
      intent = {
        ...ruleIntent,
        subject: understanding.entity,
        wikiQuery: understanding.entity,
        attrEn: understanding.attributeEn || undefined,
        entityEn: understanding.entityEn || undefined,
        attrKey: understanding.attrKey || undefined,
        entityType: understanding.entityType || undefined,
      };
    }
    // Suggestion « vouliez-vous dire » : la correction du modèle prime sur
    // Levenshtein — il comprend le sens, pas juste la distance entre mots.
    const strip = (s: string) => s.toLowerCase().replace(/[?.!…\s]+$/g, "").trim();
    if (understanding.corrected && strip(understanding.corrected) !== strip(rawQuery)) {
      suggested = understanding.corrected;
    }
  }
  const webQ = upstreamQuery(understanding?.corrected ?? q, intent);
  const administrativeQuestion =
    /\b(quartier|quartiers|commune|communes|district|districts|subdivision|subdivisions)\b/i.test(q);
  const qIntent = intent.kind === "question" ? intent : undefined;
  // Médias (images, vidéos, cartes) : le SUJET résolu, pas la phrase brute.
  // « messi a combien de buts » cherche des images de « messi », pas des
  // scans de manuscrits qui matchent les mots-outils de la question.
  const mediaQ = qIntent ? qIntent.subject : understanding?.entity || webQ;
  // Factual = on peut produire une réponse locale fiable (capitale connue, géo/admin
  // Kinshasa documentées, calcul). Un mot comme « commune » seul ne qualifie PAS —
  // sinon tout résultat web serait jeté (bug « aucun résultat direct »).
  const factualIntent =
    intent.kind === "capital" ||
    intent.kind === "city" ||
    intent.kind === "geography" ||
    intent.kind === "math" ||
    (administrativeQuestion && /\bkinshasa\b/i.test(q));
  const capitalFact = knownCapitalAnswer(intent);

  // Apps sœurs + index maison — sync, immédiat.
  const sisterHits = searchSisterApps(q);
  const houseHits = searchLocalIndex(q);
  const brandStrong = isStrongBrandQuery(q);
  const sisterFastPath = brandStrong && sisterHits.length > 0;
  const skipWebForMath = intent.kind === "math";
  const navSite = intent.kind === "navigational" ? intent.site : navigationalSiteForQuery(q);
  const navHit: RawHit[] = navSite
    ? [
        {
          title: navSite.title,
          url: navSite.url,
          snippet: navSite.snippet,
          source: "navigational",
        },
      ]
    : [];
  const curatedFactHits: RawHit[] =
    intent.kind === "geography"
      ? [
          {
            title: "Kinshasa — géographie et dimensions",
            url: "https://fr.wikipedia.org/wiki/Kinshasa#G%C3%A9ographie",
            snippet:
              "La ville-province de Kinshasa couvre 9 965 km². La zone urbanisée représente environ 860 km²; les distances varient selon les points mesurés.",
            source: "verified-fact",
          },
        ]
      : administrativeQuestion && /\bkinshasa\b/i.test(q)
        ? [
            {
              title: "Kinshasa — subdivisions administratives",
              url: "https://fr.wikipedia.org/wiki/Kinshasa#Subdivisions",
              snippet:
                "Kinshasa est divisée en quatre districts et vingt-quatre communes. Le total des quartiers dépend du découpage administratif de référence et ne doit pas être affirmé sans source officielle consolidée.",
              source: "verified-fact",
            },
          ]
        : [];

  const cacheKey = `serpfts:${q}:${opts.sliders.locality}:${opts.sliders.authority}`;
  let rankedFts: Awaited<ReturnType<typeof rankHits>> = [];
  if (!sisterFastPath && !offline) {
    await timed(opts.timings, "fts", async () => {
      try {
        if (!turso) {
          rankedFts = (await cacheGet<Awaited<ReturnType<typeof rankHits>>>(cacheKey)) ?? [];
        }
        if (!rankedFts.length) {
          const hits = turso
            ? await Promise.race([
                searchIndexAsync(q, 40),
                new Promise<Awaited<ReturnType<typeof searchIndexAsync>>>((r) =>
                  setTimeout(() => r([]), Math.min(500, msLeft())),
                ),
              ])
            : searchIndex(q, 40);
          rankedFts = rankHits(hits, q, {
            localityBoost: opts.sliders.locality,
            authorityBoost: opts.sliders.authority,
          });
          if (!turso) void cacheSet(cacheKey, rankedFts, 180).catch(() => {});
        }
      } catch {
        rankedFts = [];
      }
    });
  }

  let ayebiPanel: KnowledgePanel | undefined;
  let ayebiHits: Awaited<ReturnType<typeof searchAyebiArticlesLive>> = [];
  let crawlHits: Awaited<ReturnType<typeof searchCrawlIndex>> = [];

  const ayebiSync = factualIntent ? [] : searchAyebiArticles(q, 8);
  if (ayebiSync.length && !navSite) {
    const topScore = scoreArticle(ayebiSync[0], q);
    const minRel = ayebiPanelMinScore(q);
    ayebiHits = ayebiSync.filter((a) => {
      const s = scoreArticle(a, q);
      return s >= minRel * 0.65 && isStrongAyebiMatch(s, a, q);
    });
    if (ayebiHits[0] && isStrongAyebiMatch(topScore, ayebiHits[0], q)) {
      ayebiPanel = ayebiKnowledgePanel(ayebiHits[0]);
    }
  }

  if (offline) {
    crawlHits = [];
  } else if (turso && !sisterFastPath) {
    try {
      const asyncAyebi = await Promise.race([
        searchAyebiAsync(q, 5),
        new Promise<Awaited<ReturnType<typeof searchAyebiAsync>>>((r) =>
          setTimeout(() => r([]), Math.min(600, msLeft())),
        ),
      ]);
      const seenSlugs = new Set(ayebiHits.map((a) => a.slug));
      for (const a of asyncAyebi) {
        if (seenSlugs.has(a.slug)) continue;
        const stub = {
          slug: a.slug,
          title: a.title,
          subtitle: "",
          category: "lieu" as const,
          summary: a.summary,
          body: [],
          facts: [],
          tags: a.tags,
        };
        const s = scoreArticle(stub, q);
        if (!isStrongAyebiMatch(s, stub, q)) continue;
        seenSlugs.add(a.slug);
        ayebiHits.push(stub);
      }
    } catch {
      /* keep sync hits */
    }
    crawlHits = [];
  } else if (!sisterFastPath) {
    const [liveHits, crawl] = await Promise.all([
      searchAyebiArticlesLive(q, 5),
      Promise.resolve().then(() => {
        try {
          return searchCrawlIndex(q);
        } catch {
          return [] as Awaited<ReturnType<typeof searchCrawlIndex>>;
        }
      }),
    ]);
    const seenSlugs = new Set(ayebiHits.map((a) => a.slug));
    for (const a of liveHits) {
      if (seenSlugs.has(a.slug)) continue;
      if (!isStrongAyebiMatch(scoreArticle(a, q), a, q)) continue;
      seenSlugs.add(a.slug);
      ayebiHits.push(a);
    }
    crawlHits = crawl;
    if (!ayebiPanel && ayebiHits[0] && !navSite) {
      ayebiPanel = ayebiKnowledgePanel(ayebiHits[0]);
    }
  }

  // Un panneau n'est recevable que si son sujet (titre) est visé par la
  // requête — pour TOUTES les requêtes, pas seulement les questions. Un
  // article qui partage des mots-clés avec la requête (« premier ministre »
  // dans la bio de Matata Ponyo, « forêt » pour « amazone ») n'est PAS le
  // sujet — Google n'affiche jamais une entité voisine comme panneau.
  const nqPanel = q
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  // Expansion d'alias : « rdc » ≈ « république démocratique du congo » —
  // sinon un panneau légitime titré « République… » serait rejeté.
  const hayPanel = `${nqPanel} ${geoSubjectsInQuery(q)
    .map((s) => s.replace(/-/g, " "))
    .join(" ")}`;
  const titleMatchesQuery = (title: string) =>
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length > 2 && !/^(le|la|les|des|du|de|et|en|au|aux|sur|par|pour|avec|sans|dans|the|of|and|for)$/.test(t))
      .every((t) => hayPanel.includes(t));
  if (ayebiPanel && !titleMatchesQuery(ayebiPanel.title)) ayebiPanel = undefined;

  const ftsDocs = rankedFts.map((h) => ({
    id: h.docId,
    title: h.title,
    url: h.url,
    snippet: h.snippet,
    domain: h.domain,
    keywords: [] as string[],
    congoRelevant: h.localRelevant,
    sourceType: (h.sourceType as "web" | "gov" | "news" | "wiki" | "academic" | "tech") ?? "web",
    credibility: Math.round(h.credibility * 100),
    rankScore: h.score,
  }));

  const localCount =
    sisterHits.length + houseHits.length + ftsDocs.length + ayebiHits.length + crawlHits.length;
  void localCount;
  // Toujours interroger le web — priorité RDC = boost au classement, pas couper Internet.
  const upstreamMs = Math.min(sisterFastPath ? UPSTREAM_FAST_MS : UPSTREAM_MS, msLeft());

  const [
    wikiFr,
    wikiEn,
    ddg,
    ddgHtml,
    bing,
    mojeek,
    news,
    knowledge,
    nativeImages,
    nativeVideos,
    nativeMaps,
    communityPosts,
    instantAnswers,
    questionAnswer,
  ] = await timed(opts.timings, "upstream", () =>
    Promise.all([
      offline || sisterFastPath || skipWebForMath
        ? Promise.resolve([] as RawHit[])
        : settled(fetchWikipedia(webQ, "fr"), [], upstreamMs),
      offline || sisterFastPath || skipWebForMath
        ? Promise.resolve([] as RawHit[])
        : settled(fetchWikipedia(webQ, "en"), [], upstreamMs),
      offline || sisterFastPath || skipWebForMath
        ? Promise.resolve([] as RawHit[])
        : settled(fetchDuckDuckGo(webQ), [], upstreamMs),
      offline || sisterFastPath || skipWebForMath || msLeft() < 900
        ? Promise.resolve([] as RawHit[])
        : settled(fetchDuckDuckGoHtml(webQ), [], upstreamMs),
      offline || sisterFastPath || skipWebForMath
        ? Promise.resolve([] as RawHit[])
        : settled(fetchBing(webQ), [], upstreamMs),
      offline || sisterFastPath || skipWebForMath || msLeft() < 700
        ? Promise.resolve([] as RawHit[])
        : settled(fetchMojeek(webQ), [], upstreamMs),
      offline || sisterFastPath
        ? Promise.resolve([] as RawHit[])
        : settled(fetchNewsRss(webQ), [], upstreamMs),
      offline || sisterFastPath || navSite || factualIntent
        ? Promise.resolve(undefined)
        : settled(fetchWikiSummary(webQ), undefined, Math.min(UPSTREAM_FAST_MS, msLeft())),
      offline
        ? Promise.resolve([] as MediaResult[])
        : settled(searchImagesNative(mediaQ), [], Math.min(2400, msLeft())),
      offline
        ? Promise.resolve([] as MediaResult[])
        : settled(searchVideosNative(mediaQ), [], Math.min(2600, msLeft())),
      offline
        ? Promise.resolve([] as MapPlace[])
        : settled(
            searchMapsNative(isCongoHint(q) ? `${mediaQ} République démocratique du Congo` : mediaQ),
            [],
            Math.min(UPSTREAM_FAST_MS, msLeft()),
          ),
      offline || sisterFastPath
        ? Promise.resolve([] as CommunityPost[])
        : settled(searchCommunity(webQ), [], Math.min(2000, msLeft())),
      sisterFastPath
        ? Promise.resolve([])
        : settled(resolveInstantAnswers(q), [], offline ? 150 : upstreamMs),
      // Réponse de question — Knowledge Graph : entité Wikidata + revendication
      // structurée (« président » → valeur réelle) + extrait Wikipedia en contexte.
      offline || sisterFastPath || !qIntent
        ? Promise.resolve(undefined)
        : settled(
            answerQuestion(qIntent),
            undefined,
            // La réponse directe EST le produit pour une question — vrai budget,
            // sinon elle timeout toujours (wiki+entité+claims ≈ 2-3s en série).
            Math.min(3100, msLeft()),
          ),
    ]),
  );



  // Réponse directe à la question — en tête des réponses instantanées.
  if (questionAnswer && qIntent) {
    instantAnswers.unshift(questionAnswer.instant);
  }
  // Calcul : résultat réel en tête, comme le calculateur de Google.
  if (intent.kind === "math") {
    const mathResult = evalMath(intent.expr);
    if (mathResult) {
      instantAnswers.unshift({
        kind: "calc",
        title: intent.display,
        lines: [{ label: "Résultat", value: mathResult }],
        footnote: "Calcul local — évaluation directe, aucune donnée simulée",
      });
    }
  }

  const localDocs = [
    ...ayebiHits.map((a, i) => {
      const rel = scoreArticle(a, q);
      return {
        id: `ayebi-${a.slug}`,
        title: `${a.title} — Ayebi`,
        url: `/ayebi/${a.slug}`,
        snippet: ayebiRichSnippet(a),
        domain: "ayebi",
        keywords: a.tags,
        congoRelevant: isCongoHint(q) || a.category === "lieu",
        sourceType: "local" as const,
        credibility: 99,
        rankScore: Math.min(420, 180 + rel * 2) - i * 8,
        sitelinks: [
          { title: "Lire la fiche", url: `/ayebi/${a.slug}` },
          ...(officialSiteForAyebi(a.slug)
            ? [{ title: "Site officiel", url: officialSiteForAyebi(a.slug)! }]
            : []),
        ],
      };
    }),
    ...sisterHits.map((d) => ({
      ...d,
      rankScore: Math.min(560, scoreBrandDoc(d, q) + 80),
    })),
    ...houseHits.map((d, i) => ({
      ...d,
      rankScore: Math.max(0, relevanceScore(`${d.title} ${d.snippet}`, q) + 40 - i * 3),
    })),
    ...ftsDocs,
    ...crawlHits.map((c) => ({
      id: c.id,
      title: c.title,
      url: c.url,
      snippet: c.snippet,
      domain: c.domain,
      keywords: c.keywords,
      congoRelevant: c.localRelevant,
      sourceType: c.sourceType,
      credibility: c.credibility,
      rankScore: relevanceScore(`${c.title} ${c.snippet}`, q) + 20,
    })),
  ];
  const localAsRaw = localDocs.map((d) => ({
    title: d.title,
    url: d.url,
    snippet: d.snippet,
    source: "ayeba-index",
  }));

  // Web d’abord dans le pool, puis index local — le ranking décide (RDC = boost, pas filtre).
  const raw = [
    ...navHit,
    ...curatedFactHits,
    ...bing,
    ...ddgHtml,
    ...mojeek,
    ...ddg,
    ...wikiFr,
    ...wikiEn,
    ...news,
    ...localAsRaw,
  ];
  const seen = new Set<string>();
  const unique = raw.filter((h) => {
    const key = h.url.split("#")[0];
    if (!key || seen.has(key)) return false;
    seen.add(key);
    if (h.source === "ayeba-index" && !isRelevantToQuery(h, q)) return false;
    return true;
  });

  let results = rankAndFilter(
    unique.map((h, i) => {
      const base = toResult(h, i, q);
      const local = localDocs.find((d) => d.url === h.url);
      if (local) {
        const sisterBoost =
          sisterHits.some((s) => s.url === h.url) && brandStrong ? 320 : 0;
        return {
          ...base,
          trust: {
            ...base.trust,
            credibility: local.credibility,
            humanAuthoredLikelihood: 96,
          },
          sourceType: local.sourceType,
          congoRelevant: local.congoRelevant,
          sitelinks: "sitelinks" in local ? local.sitelinks : undefined,
          rankScore:
            (base.rankScore ?? 0) +
            sisterBoost +
            ("rankScore" in local ? Number(local.rankScore ?? 0) : 0),
        };
      }
      if (h.source === "navigational") {
        return { ...base, rankScore: (base.rankScore ?? 0) + 500 };
      }
      return base;
    }),
    q,
    opts,
  )
    .filter(
      (r) =>
        isRelevantResult(r, q) ||
        (factualIntent && /fr\.wikipedia\.org\/wiki\/Kinshasa(?:#|$)/.test(r.url)) ||
        (!factualIntent && (r.sourceType === "news" || r.url.includes("duckduckgo.com"))),
    )
    .filter((r) => !factualIntent || r.domain.includes("wikipedia.org"))
    .sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0));

  const bestAyebi = results.find((r) => r.domain === "ayebi" || r.url.startsWith("/ayebi/"));
  const bestWiki = results.find((r) => r.domain.includes("wikipedia.org"));
  if (bestAyebi || bestWiki) {
    const rest = results.filter((r) => r !== bestAyebi && r !== bestWiki);
    results = [...(bestAyebi ? [bestAyebi] : []), ...(bestWiki ? [bestWiki] : []), ...rest];
  }

  if (results.length < 3 && !factualIntent && !ayebiPanel && ayebiHits.length === 0 && sisterHits.length === 0) {
    results = rankAndFilter(
      [
        ...results,
        toResult(
          {
            title: `${q} — Recherche ouverte`,
            url: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
            snippet: `Explorer davantage de résultats web pour « ${q} ».`,
            source: "fallback",
          },
          999,
          q,
        ),
      ],
      q,
      opts,
    );
  }

  if (offline && results.length < 2) {
    // Degraded mode still owes the user somewhere to go, never a blank or single-link SERP.
    const seenUrls = new Set(results.map((r) => r.url));
    const repli = [
      {
        title: `${q} — Wikipédia`,
        url: `https://fr.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`,
        snippet: `Article encyclopédique sur « ${q} ».`,
        source: "fallback",
      },
      {
        title: `${q} — Recherche web`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
        snippet: `Résultats web complets pour « ${q} ».`,
        source: "fallback",
      },
    ];
    results = [
      ...results,
      ...repli
        .filter((h) => !seenUrls.has(h.url))
        .map((h, i) => toResult(h, results.length + i + 1, q)),
    ];
  }

  // Sitelinks synthétiques pour domaines majeurs
  results = results.map((r) => {
    if (r.sitelinks?.length) return r;
    if (r.sourceType === "wiki" || r.domain.includes("wikipedia")) {
      return {
        ...r,
        sitelinks: [
          { title: "Sommaire", url: r.url },
          { title: "Discussion", url: r.url.replace("/wiki/", "/wiki/Talk:") },
          { title: "Historique", url: `${r.url}?action=history` },
        ],
      };
    }
    if (r.domain.includes("bcc.cd") || r.domain.endsWith(".cd") || r.sourceType === "gov") {
      return {
        ...r,
        sitelinks: [
          { title: "Accueil", url: `https://${r.domain}/` },
          { title: "Contact", url: `https://${r.domain}/` },
        ],
      };
    }
    return r;
  });

  const newsResults = rankAndFilter(
    news.map((h, i) => toResult(h, 1000 + i, q)).map((r) => ({ ...r, sourceType: "news" as const })),
    q,
    opts,
  );

  // Images réelles uniquement — jamais de favicons déguisés en images.
  // La photo de l'entité (Wikipédia) passe en tête quand la question a une réponse.
  const entityImage = questionAnswer?.panel.image;
  const images: MediaResult[] = [
    ...(entityImage
      ? [
          {
            id: "entity-img",
            title: questionAnswer!.panel.title,
            url: questionAnswer!.snippet.url,
            thumb: entityImage,
            source: "Wikipédia",
            type: "image" as const,
          },
        ]
      : []),
    ...nativeImages,
  ];

  // Vidéos : uniquement des résultats réels (Dailymotion/Piped/index).
  // Jamais de carte générique — un lien « recherche YouTube » déguisé en vidéo
  // est de la fausse donnée.
  const videos: MediaResult[] = [...nativeVideos];

  const maps = nativeMaps;
  // Shopping = produits RÉELS indexés par le crawler uniquement — jamais de
  // carte « négociable CDF ★ 4.3 » fabriquée depuis le texte de la requête.
  const shopping = searchProducts(q, 20);

  const panel =
    (!navSite && !factualIntent ? ayebiPanel : undefined) ??
    (sisterFastPath || navSite || factualIntent || qIntent
      ? undefined
      : (() => {
          const kg = panelFromQuery(q);
          if (
            kg &&
            titleMatchesQuery(kg.entity.label) &&
            relevanceScore(`${kg.entity.label} ${kg.entity.summary}`, q) >= 45
          ) {
            return {
              title: kg.entity.label,
              subtitle: kg.entity.kind,
              summary: kg.entity.summary,
              facts: [
                ...(kg.entity.ayebiSlug
                  ? [{ label: "Ayebi", value: `/ayebi/${kg.entity.ayebiSlug}` }]
                  : []),
                ...kg.related.slice(0, 4).map((r) => ({
                  label: r.relation === "in_category" ? "Catégorie" : "Lié",
                  value: r.ayebiSlug ? `/ayebi/${r.ayebiSlug}` : r.label,
                })),
              ],
              sources: ["ayebi-graph"],
              image: undefined,
            } satisfies KnowledgePanel;
          }
          return undefined;
        })()) ??
    (knowledge && !factualIntent && relevanceScore(`${knowledge.title} ${knowledge.summary}`, q) >= 35
      ? knowledge
      : undefined);

  let knowledgePanel = panel;
  let wikipediaKnowledge: KnowledgePanel | undefined;
  if (
    ayebiPanel &&
    knowledge &&
    !factualIntent &&
    relevanceScore(`${knowledge.title} ${knowledge.summary}`, q) >= 35
  ) {
    // Ayebi et Wikipedia restent deux encyclopédies distinctes — pas un seul panneau mixte.
    knowledgePanel = ayebiPanel;
    wikipediaKnowledge = knowledge;
  } else if (
    !ayebiPanel &&
    knowledge &&
    !factualIntent &&
    knowledge.sources.some((s) => s.includes("wikipedia"))
  ) {
    knowledgePanel = undefined;
    wikipediaKnowledge = knowledge;
  }

  // Question → le panneau PRINCIPAL est l'entité résolue (Wikidata/Wikipedia)
  // — comme le Knowledge Panel de Google (« Saddam Hussein » pour la question
  // « qui est sadam hussein »). Le graphe Ayebi peut dériver vers un sujet
  // voisin et ne doit jamais le détrôner ; il passe en panneau secondaire.
  if (questionAnswer) {
    if (knowledgePanel && knowledgePanel.title !== questionAnswer.panel.title) {
      wikipediaKnowledge ??= knowledgePanel;
    }
    knowledgePanel = questionAnswer.panel;
  }

  const topWeb = results.find(
    (r) =>
      r.domain !== "ayebi" &&
      !r.url.startsWith("/ayebi/") &&
      isRelevantResult(r, q) &&
      relevanceScore(`${r.title} ${r.snippet}`, q) >= 28,
  );

  const questionSnippet: FeaturedSnippet | undefined =
    qIntent && questionAnswer ? questionAnswer.snippet : undefined;

  const featuredSnippet: FeaturedSnippet | undefined =
    questionSnippet ??
    tryMathSnippet(q) ??
    (capitalFact
      ? {
          title: `${capitalFact.capital} — capitale ${capitalFact.country}`,
          text: capitalFact.summary,
          url: capitalFact.wiki,
          domain: "wikipedia.org",
        }
      : undefined) ??
    (intent.kind === "geography" && instantAnswers[0]
      ? {
          title: instantAnswers[0].title,
          text: instantAnswers[0].lines.map((line) => `${line.label} : ${line.value}`).join(" · "),
          url: "https://fr.wikipedia.org/wiki/Kinshasa#G%C3%A9ographie",
          domain: "wikipedia.org",
        }
      : undefined) ??
    (intent.kind === "city" && topWeb
      ? {
          title: topWeb.title,
          text: topWeb.snippet,
          url: topWeb.url,
          domain: topWeb.domain,
        }
      : undefined) ??
    (navSite
      ? {
          title: navSite.title,
          text: navSite.snippet,
          url: navSite.url,
          domain: navSite.domain,
        }
      : knowledgePanel && relevanceScore(`${knowledgePanel.title} ${knowledgePanel.summary}`, q) >= ayebiPanelMinScore(q)
        ? {
            title: knowledgePanel.title,
            text: knowledgePanel.summary.slice(0, 420),
            url:
              knowledgePanel.facts.find((f) => f.label === "Lire sur Ayebi")?.value ??
              knowledgePanel.facts.find((f) => f.label === "Ayebi")?.value ??
              topWeb?.url ??
              results[0]?.url ??
              "#",
            domain: knowledgePanel.facts.some((f) => f.label === "Lire sur Ayebi") ? "ayebi" : topWeb?.domain ?? "ayeba",
          }
        : topWeb
          ? {
              title: topWeb.title,
              text: topWeb.snippet,
              url: topWeb.url,
              domain: topWeb.domain,
            }
          : results[0] && isRelevantResult(results[0], q)
            ? {
                title: results[0].title,
                text: results[0].snippet,
                url: results[0].url,
                domain: results[0].domain,
              }
            : undefined);

  const topAyebi = ayebiHits[0];
  const factualAnswer = factualIntent ? instantAnswers[0] : undefined;
  const aiSummary = factualAnswer
    ? factualAnswer.lines.map((line) => `${line.label} : ${line.value}`).join(" · ")
    : buildSynthesis(q, knowledgePanel, results, newsResults);
  const peopleAlsoAsk = buildQuestions(
    q,
    knowledgePanel,
    results,
    newsResults,
    isCongoHint(q),
    topAyebi,
  );

  const isSensitiveTopic =
    /\b(élection|election|politique|président|parti|opposition)\b/i.test(q);

  return {
    query: rawQuery,
    correctedQuery:
      suggested && suggested.toLowerCase() !== rawQuery.toLowerCase() ? suggested : undefined,
    // Compteur honnête : nombre réel de sources distinctes, pas une projection gonflée.
    approxResults: unique.length,
    results,
    images,
    videos,
    news: newsResults.length ? newsResults : results.filter((r) => r.sourceType === "news"),
    maps,
    shopping,
    // Communauté = fils RÉELS (Reddit, HN) — jamais de carte template
    // « …sur JEMSA » générée depuis le texte de la requête.
    community: communityPosts,
    related: relatedFrom(q, results),
    peopleAlsoAsk,
    knowledge: knowledgePanel,
    wikipediaKnowledge,
    featuredSnippet,
    instantAnswer: instantAnswers[0],
    instantAnswers: instantAnswers.length ? instantAnswers : undefined,
    aiSummary,
    isSensitiveTopic,
    canvas: [
      {
        id: "t1",
        title: `Comparatif — ${q}`,
        headers: ["Source", "Domaine", "Crédibilité", "Boost RDC"],
        rows: results.slice(0, 6).map((r) => [
          r.title.slice(0, 42),
          r.domain,
          String(r.trust.credibility),
          r.congoRelevant ? "Oui" : "Non",
        ]),
      },
    ],
  };
}
