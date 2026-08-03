import * as cheerio from "cheerio";
import type { CrawlDoc } from "./db";
import { getCrawlIndex, saveCrawlIndex } from "./db";

/** Graines .cd — institutions, presse, universités */
export const CRAWL_SEEDS = [
  "https://www.bcc.cd/",
  "https://www.snel.cd/",
  "https://mines.gouv.cd/",
  "https://www.unikin.ac.cd/",
  "https://www.radiookapi.net/",
  "https://www.primature.cd/",
  "https://www.presidence.cd/",
  "https://www.anapi.cd/",
  "https://www.arsp.cd/",
  "https://www.ons.cd/",
  "https://www.inrb.cd/",
  "https://www.ceni.cd/",
  "https://www.academia.cd/",
  "https://www.unilu.ac.cd/",
  "https://www.upn.ac.cd/",
];

const MAX_PAGES = 48;
const FETCH_TIMEOUT = 12_000;
const LOCAL_TLD = /\.(cd|cd\/)|radiookapi|unikin|bcc\.|snel\.|mines\.gouv/i;

function isLocalUrl(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith(".cd") || LOCAL_TLD.test(host);
  } catch {
    return false;
  }
}

function normalizeUrl(base: string, href: string): string | null {
  try {
    const u = new URL(href, base);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

function extractText(html: string, url: string): Omit<CrawlDoc, "id" | "crawledAt"> | null {
  const $ = cheerio.load(html);
  const title =
    $("title").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1").first().text().trim();
  if (!title || title.length < 2) return null;

  const desc =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $("p").first().text().trim().slice(0, 280);

  const domain = new URL(url).hostname.replace(/^www\./, "");
  const keywords = [
    ...title.toLowerCase().split(/\W+/),
    ...desc.toLowerCase().split(/\W+/),
    domain.split(".")[0],
  ].filter((w) => w.length > 2);

  const sourceType = domain.endsWith(".cd")
    ? domain.includes("gouv") || domain.includes("gov")
      ? "gov"
      : domain.includes("un") || domain.includes("ac.")
        ? "academic"
        : "web"
    : "news";

  return {
    url,
    domain,
    title: title.slice(0, 200),
    snippet: desc || `Page indexée sur ${domain}.`,
    keywords: [...new Set(keywords)].slice(0, 24),
    localRelevant: true,
    sourceType,
    credibility: domain.endsWith(".cd") ? 88 : 82,
  };
}

async function fetchPage(url: string): Promise<{ html: string; links: string[] } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "AyebaCrawler/1.0 (+https://ayeba.local; local-index)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const links: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const abs = normalizeUrl(url, href);
      if (abs && isLocalUrl(abs)) links.push(abs);
    });
    return { html, links: [...new Set(links)] };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function runLocalCrawl(maxPages = MAX_PAGES): Promise<CrawlDoc[]> {
  const queue = [...CRAWL_SEEDS];
  const seen = new Set<string>();
  const docs: CrawlDoc[] = [];
  const existing = await getCrawlIndex();
  const existingUrls = new Set(existing.map((d) => d.url));

  while (queue.length > 0 && docs.length < maxPages) {
    const url = queue.shift()!;
    const key = url.split("#")[0];
    if (seen.has(key)) continue;
    seen.add(key);

    const page = await fetchPage(key);
    if (!page) continue;

    const extracted = extractText(page.html, key);
    if (extracted) {
      docs.push({
        id: `crawl-${docs.length}-${extracted.domain}`,
        ...extracted,
        crawledAt: new Date().toISOString(),
      });
    }

    for (const link of page.links) {
      if (!seen.has(link.split("#")[0]) && queue.length < maxPages * 3) {
        queue.push(link);
      }
    }

    await new Promise((r) => setTimeout(r, 400));
  }

  const merged = [...docs, ...existing.filter((e) => !docs.some((d) => d.url === e.url))].slice(
    0,
    500,
  );
  await saveCrawlIndex(merged, new Date().toISOString());
  return merged;
}

export async function searchCrawlIndex(query: string): Promise<CrawlDoc[]> {
  const docs = await getCrawlIndex();
  if (!docs.length) return [];

  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  return docs
    .map((doc) => {
      const hay = `${doc.title} ${doc.snippet} ${doc.keywords.join(" ")}`.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (hay.includes(t)) score += 12;
        if (doc.title.toLowerCase().includes(t)) score += 18;
        if (doc.domain.includes(t)) score += 8;
      }
      if (doc.localRelevant) score += 6;
      return { doc, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((x) => x.doc);
}
