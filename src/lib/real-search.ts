import { didYouMean, searchLocalIndex } from "./ayeba-index";
import { searchAyebiLive, searchAyebiArticlesLive } from "./ayebi/server";
import { searchCrawlIndex } from "./crawler";
import { panelFromQuery } from "./knowledge-graph/graph";
import { resolveInstantAnswers } from "./instant-answers";
import { cacheGet, cacheSet } from "./cache/redis";
import { indexStats, searchIndex, clickBoost } from "./search-index/fts";
import { rankHits } from "./search-index/ranking";
import { searchImagesNative } from "./verticals/images";
import { searchMapsNative } from "./verticals/maps";
import { buildNativeShopping } from "./verticals/shopping";
import { getDbMode } from "./storage/database";
import { searchAyebiAsync, searchIndexAsync } from "./storage/turso-async";
import type {
  AlgorithmSliders,
  FeaturedSnippet,
  KnowledgePanel,
  MapPlace,
  MediaResult,
  SearchResponse,
  SearchResult,
  ShopItem,
} from "./types";

/** Hard ceiling for any single upstream — users leave engines that feel slow. */
const UPSTREAM_MS = 2500;
const UPSTREAM_FAST_MS = 1800;
/** Whole liveSearch must finish under this or the product is unusable as a default engine. */
const SEARCH_WALL_MS = 5500;

type FetchOpts = {
  zeroAi: boolean;
  zeroAds: boolean;
  privateMode: boolean;
  sliders: AlgorithmSliders;
};

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

function queryTokens(query: string) {
  return query
    .toLowerCase()
    .split(/[\s\-_/]+/)
    .filter((t) => t.length >= 2);
}

function isCongoHint(q: string) {
  return /\b(rdc|congo|kinshasa|lubumbashi|katanga|goma|lingala|cobalt|coltan|bcc|unikin)\b/i.test(
    q,
  );
}

function relevanceScore(text: string, query: string): number {
  const hay = text.toLowerCase();
  const tokens = queryTokens(query);
  if (!tokens.length) return 0;
  let score = 0;
  for (const t of tokens) {
    if (hay.includes(t)) score += 12;
  }
  if (hay.includes(query.toLowerCase())) score += 25;
  return score;
}

function isRelevantToQuery(hit: RawHit, query: string): boolean {
  return relevanceScore(`${hit.title} ${hit.snippet} ${hit.url}`, query) > 0;
}

function isRelevantResult(r: SearchResult, query: string): boolean {
  return relevanceScore(`${r.title} ${r.snippet} ${r.domain} ${r.url}`, query) > 0;
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
  const boostRdc = (100 - opts.sliders.locality) / 100;

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
      if (r.title.toLowerCase().includes(q)) score += 20;
      if (r.congoRelevant && isCongoHint(query)) score += 22 * boostRdc;
      if (r.sourceType === "academic") score += opts.sliders.audience * 0.2;
      if (r.sourceType === "wiki" || r.sourceType === "gov") score += opts.sliders.authority * 0.15;
      score -= r.trust.clickbaitRisk * 0.2;
      return { ...r, rankScore: Math.round(score) };
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

function tryMathSnippet(query: string): FeaturedSnippet | undefined {
  const q = query.trim().replace(/,/g, ".");
  if (!/^[\d\s+\-*/().^%]+$/.test(q) || q.length > 40) return undefined;
  try {
    const expr = q.replace(/\^/g, "**");
    // eslint-disable-next-line no-new-func
    const val = Function(`"use strict"; return (${expr})`)();
    if (typeof val !== "number" || !Number.isFinite(val)) return undefined;
    return {
      title: q,
      text: String(val),
      url: "#calc",
      domain: "ayeba",
    };
  } catch {
    return undefined;
  }
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
): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];

  if (knowledge?.summary) {
    out.push({
      q: `Que sait-on de ${knowledge.title} ?`,
      a: knowledge.summary.slice(0, 320),
    });
  } else if (results[0]) {
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
  } else if (results[1]) {
    out.push({
      q: `Y a-t-il un complément utile ?`,
      a: results[1].snippet,
    });
  }

  if (congo) {
    out.push({
      q: `Quel est le lien avec la RDC ou l'Afrique centrale ?`,
      a: results.find((r) => r.congoRelevant)?.snippet
        ?? "Les sources régionales et .cd sont relevées quand elles existent ; le web mondial reste visible.",
    });
  }

  return out.slice(0, 3);
}

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

async function fetchNominatim(query: string): Promise<MapPlace[]> {
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

function buildShopping(query: string): ShopItem[] {
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
  const rawQuery = query.trim() || "actualité mondiale";
  const suggested = didYouMean(rawQuery);
  const q = rawQuery;

  // Local index first — never wait on crawl. Users switch engines for speed + relevance.
  const wall = Date.now() + SEARCH_WALL_MS;
  const msLeft = () => Math.max(400, wall - Date.now());
  const turso = getDbMode() === "turso";

  const cacheKey = `serp:${q}:${opts.sliders.locality}:${opts.sliders.authority}`;
  let rankedFts: Awaited<ReturnType<typeof rankHits>> = [];
  try {
    // Memory cache only on Turso — sync SQLite store blocks the event loop.
    if (!turso) {
      rankedFts = (await cacheGet<Awaited<ReturnType<typeof rankHits>>>(cacheKey)) ?? [];
    }
    if (!rankedFts.length) {
      const hits = turso
        ? await searchIndexAsync(q, 40)
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

  let ayebiPanel: KnowledgePanel | undefined;
  let ayebiHits: Awaited<ReturnType<typeof searchAyebiArticlesLive>> = [];
  let crawlHits: Awaited<ReturnType<typeof searchCrawlIndex>> = [];

  if (turso) {
    const asyncAyebi = await searchAyebiAsync(q, 5);
    ayebiHits = asyncAyebi.map((a) => ({
      slug: a.slug,
      title: a.title,
      subtitle: "",
      category: "lieu" as const,
      summary: a.summary,
      body: [],
      facts: [],
      tags: a.tags,
    }));
    if (asyncAyebi[0]) {
      ayebiPanel = {
        title: asyncAyebi[0].title,
        subtitle: "Ayebi",
        summary: asyncAyebi[0].summary,
        facts: [{ label: "Ayebi", value: `/ayebi/${asyncAyebi[0].slug}` }],
        sources: ["ayebi"],
      };
    }
    // Skip sync crawl_index scan on Turso — FTS already covers indexed docs.
    crawlHits = [];
  } else {
    [ayebiPanel, ayebiHits, crawlHits] = await Promise.all([
      Promise.resolve().then(() => searchAyebiLive(q)),
      Promise.resolve().then(() => searchAyebiArticlesLive(q, 5)),
      Promise.resolve().then(() => {
        try {
          return searchCrawlIndex(q);
        } catch {
          return [] as Awaited<ReturnType<typeof searchCrawlIndex>>;
        }
      }),
    ]);
  }

  const ftsDocs = rankedFts.map((h) => ({
    id: h.docId,
    title: h.title,
    url: h.url,
    snippet: h.snippet,
    domain: h.domain,
    keywords: [] as string[],
    congoRelevant: h.localRelevant,
    sourceType: (h.sourceType as "web" | "gov" | "news" | "wiki" | "academic") ?? "web",
    credibility: Math.round(h.credibility * 100),
    rankScore: h.score,
  }));

  const localCount = ftsDocs.length + ayebiHits.length + crawlHits.length;
  const richLocal = localCount >= 6;
  const upstreamMs = Math.min(richLocal ? UPSTREAM_FAST_MS : UPSTREAM_MS, msLeft());

  const [
    wikiFr,
    wikiEn,
    ddg,
    ddgHtml,
    news,
    knowledge,
    nativeImages,
    nativeVideos,
    nativeMaps,
    instantAnswers,
  ] = await Promise.all([
    settled(fetchWikipedia(q, "fr"), [], upstreamMs),
    settled(fetchWikipedia(q, "en"), [], upstreamMs),
    settled(fetchDuckDuckGo(q), [], upstreamMs),
    // HTML scrape is slow/flaky — skip when native index already feeds the SERP.
    richLocal || msLeft() < 1200
      ? Promise.resolve([] as RawHit[])
      : settled(fetchDuckDuckGoHtml(q), [], upstreamMs),
    settled(fetchNewsRss(q), [], upstreamMs),
    settled(fetchWikiSummary(q), undefined, Math.min(UPSTREAM_FAST_MS, msLeft())),
    settled(searchImagesNative(q), [], upstreamMs),
    // Piped is unreliable — never on the critical path for default-engine UX.
    Promise.resolve([] as MediaResult[]),
    msLeft() < 900
      ? Promise.resolve([] as MapPlace[])
      : settled(
          searchMapsNative(isCongoHint(q) ? `${q} République démocratique du Congo` : q),
          [],
          Math.min(UPSTREAM_FAST_MS, msLeft()),
        ),
    settled(resolveInstantAnswers(q), [], Math.min(UPSTREAM_FAST_MS, msLeft())),
  ]);

  // silence unused when videos always empty — keep for SERP shape
  void nativeVideos;

  let projectedScale = 0;
  if (!turso) {
    try {
      projectedScale = indexStats().projectedBillionsScale;
    } catch {
      /* optional */
    }
  } else {
    projectedScale = Math.max(ftsDocs.length * 1000, 50_000);
  }

  const localDocs = [
    ...ayebiHits.map((a) => ({
      id: `ayebi-${a.slug}`,
      title: `${a.title} — Ayebi`,
      url: `/ayebi/${a.slug}`,
      snippet: a.summary,
      domain: "ayebi",
      keywords: a.tags,
      congoRelevant: true,
      sourceType: "wiki" as const,
      credibility: 98,
    })),
    ...ftsDocs,
    ...searchLocalIndex(q),
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
    })),
  ];
  const localAsRaw = localDocs.map((d) => ({
    title: d.title,
    url: d.url,
    snippet: d.snippet,
    source: "ayeba-index",
  }));

  // Native / Ayebi first — switching engines requires local hits to feel owned, not scraped.
  const raw = [...localAsRaw, ...ddgHtml, ...ddg, ...wikiFr, ...wikiEn, ...news];
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
          rankScore: (base.rankScore ?? 0) + 15 + ("rankScore" in local ? Number(local.rankScore ?? 0) : 0),
        };
      }
      return base;
    }),
    q,
    opts,
  )
    .filter((r) => isRelevantResult(r, q) || r.sourceType === "news")
    .sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0));

  if (results.length < 3) {
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

  const images: MediaResult[] = nativeImages.length
    ? nativeImages
    : results.slice(0, 9).map((r, i) => ({
        id: `img-${i}`,
        title: r.title,
        url: r.url,
        thumb: r.favicon || "",
        source: r.domain,
        type: "image" as const,
      }));

  const videos: MediaResult[] = nativeVideos.length
    ? nativeVideos
    : [
        {
          id: "yt-fallback",
          title: `${q} — vidéos`,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
          thumb: "https://www.google.com/s2/favicons?domain=youtube.com&sz=128",
          source: "YouTube",
          type: "video",
        },
      ];

  const maps = nativeMaps;
  const shopping = buildNativeShopping(q);

  const panel =
    ayebiPanel ??
    (() => {
      const kg = panelFromQuery(q);
      if (kg) {
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
    })() ??
    (knowledge && relevanceScore(`${knowledge.title} ${knowledge.summary}`, q) > 0
      ? knowledge
      : undefined);

  const featuredSnippet: FeaturedSnippet | undefined =
    tryMathSnippet(q) ??
    (panel
      ? {
          title: panel.title,
          text: panel.summary.slice(0, 360),
          url: panel.facts.find((f) => f.label === "Lien")?.value || results[0]?.url || "#",
          domain: panel.sources[0] || "wikipedia.org",
        }
      : results[0] && isRelevantResult(results[0], q)
        ? {
            title: results[0].title,
            text: results[0].snippet,
            url: results[0].url,
            domain: results[0].domain,
          }
        : undefined);

  const aiSummary = buildSynthesis(q, panel, results, newsResults);
  const peopleAlsoAsk = buildQuestions(
    q,
    panel,
    results,
    newsResults,
    isCongoHint(q),
  );

  const isSensitiveTopic =
    /\b(élection|election|politique|président|parti|opposition)\b/i.test(q);

  return {
    query: rawQuery,
    correctedQuery:
      suggested && suggested.toLowerCase() !== rawQuery.toLowerCase() ? suggested : undefined,
    approxResults: Math.max(
      projectedScale,
      unique.length * 285_000,
      results.length * 18_000,
    ),
    results,
    images,
    videos,
    news: newsResults.length ? newsResults : results.filter((r) => r.sourceType === "news"),
    maps,
    shopping,
    community: [
      {
        id: "cm-reddit",
        platform: "reddit",
        title: `Fils Reddit autour de « ${q} »`,
        excerpt:
          "Discussions publiques : retours d'expérience, débats et sources partagées par la communauté.",
        author: "reddit",
        url: `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`,
        trustScore: 70,
        engagement: 0,
        postedAt: new Date().toISOString().slice(0, 10),
      },
      {
        id: "cm-yt",
        platform: "youtube",
        title: `Vidéos et témoignages — ${q}`,
        excerpt:
          "Reportages, conférences et interventions publiques indexés sur YouTube.",
        author: "youtube",
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
        trustScore: 72,
        engagement: 0,
        postedAt: new Date().toISOString().slice(0, 10),
      },
      {
        id: "cm-x",
        platform: "x",
        title: `Conversation publique — ${q}`,
        excerpt:
          "Posts récents sur X : signaux faibles, réactions et annonces en temps réel.",
        author: "x",
        url: `https://x.com/search?q=${encodeURIComponent(q)}`,
        trustScore: 60,
        engagement: 0,
        postedAt: new Date().toISOString().slice(0, 10),
      },
    ],
    related: relatedFrom(q, results),
    peopleAlsoAsk,
    knowledge: panel,
    featuredSnippet,
    instantAnswer: instantAnswers[0],
    instantAnswers: instantAnswers.length ? instantAnswers : undefined,
    aiSummary,
    isSensitiveTopic,
    opposingViews: isSensitiveTopic
      ? [
          {
            title: `Point de vue A — ${q}`,
            url: `https://duckduckgo.com/?q=${encodeURIComponent(q + " pour")}`,
            stance: "Position A",
            snippet: "Articles et tribunes favorables — à croiser.",
          },
          {
            title: `Point de vue B — ${q}`,
            url: `https://duckduckgo.com/?q=${encodeURIComponent(q + " contre")}`,
            stance: "Position B",
            snippet: "Articles et analyses critiques — pour sortir de la bulle.",
          },
        ]
      : undefined,
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
    code: /\b(calcul|math|fibonacci|code|javascript)\b/i.test(q)
      ? {
          language: "javascript",
          code: `function fibonacci(n){\n  const o=[]; let a=0,b=1;\n  for(let i=0;i<n;i++){ o.push(a); [a,b]=[b,a+b]; }\n  return o;\n}\nconsole.log(fibonacci(12).join(", "));`,
          output: "0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89",
          verified: true,
        }
      : undefined,
    podcast: [
      {
        speaker: "A",
        text: aiSummary.slice(0, 220) || `Recherche sur « ${q} ».`,
      },
      {
        speaker: "B",
        text: results[0]
          ? `Pour approfondir, commencez par ${results[0].domain} — puis croisez avec les autres sources listées.`
          : `Peu de sources solides pour l'instant. Reformulez la requête.`,
      },
    ],
  };
}
