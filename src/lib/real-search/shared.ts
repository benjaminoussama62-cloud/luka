import { isRawHitRelevant } from "../search-relevance";
import type { AlgorithmSliders } from "../types";

export function envMs(name: string, fallback: number) {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/** Hard ceiling for any single upstream — users leave engines that feel slow. */
export const UPSTREAM_MS = envMs("AYEBA_UPSTREAM_MS", 1500);
export const UPSTREAM_FAST_MS = envMs("AYEBA_UPSTREAM_FAST_MS", 800);
/** Whole liveSearch must finish under this — the route wraps it in a shorter deadline. */
export const SEARCH_WALL_MS = envMs("AYEBA_SEARCH_WALL_MS", 3500);

export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type FetchOpts = {
  zeroAi: boolean;
  zeroAds: boolean;
  privateMode: boolean;
  sliders: AlgorithmSliders;
  /** Local-only SERP: no upstream fetch, no remote index read. Always sub-second. */
  skipUpstream?: boolean;
  /** Filled with per-stage durations in ms — surfaced as Server-Timing by the route. */
  timings?: Record<string, number>;
};

export type RawHit = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  /** Visible publisher label (never news.google.com for aggregated news). */
  publisher?: string;
  publisherUrl?: string;
  /** Real publication date (ISO) when the upstream exposes one — never fabricated. */
  publishedAt?: string;
  /** 0-based rank position inside the upstream result list (ranked indexes only). */
  position?: number;
};

export async function timed<T>(
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

export async function settled<T>(p: Promise<T>, fallback: T, ms = UPSTREAM_MS): Promise<T> {
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
    ]);
  } catch {
    return fallback;
  }
}

export function domainOf(url: string) {
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

export function favicon(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

const JUNK_TITLE_RE =
  /^(newsletter|subscribe|sign up|sign in|log in|login|home|accueil|menu|search|recherche|cookies?|advertisement|sponsored)$/i;

export function isJunkHit(title: string, url: string): boolean {
  const t = title.trim();
  if (!t || t.length < 4) return true;
  if (JUNK_TITLE_RE.test(t)) return true;
  if (/\.(css|js|xml|json|ico|svg|woff2?)(\?|$)/i.test(url)) return true;
  return false;
}

export function isRelevantToQuery(hit: RawHit, query: string): boolean {
  return isRawHitRelevant(hit, query);
}
