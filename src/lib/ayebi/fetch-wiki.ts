import type { AyebiSection } from "./types";

type WikiSummary = {
  title?: string;
  description?: string;
  extract?: string;
  thumbnail?: { source?: string };
};

type WikiMobileSection = {
  line?: string;
  text?: string;
};

type WikiMobileSections = {
  lead?: { sections?: WikiMobileSection[] };
  remaining?: { sections?: WikiMobileSection[] };
};

const WIKI_API = "https://fr.wikipedia.org/api/rest_v1";
const WIKI_ACTION = "https://fr.wikipedia.org/w/api.php";
const FETCH_MS = 8000;
const WIKI_HEADERS = {
  Accept: "application/json",
  "User-Agent": "AyebiEncyclopedia/1.0 (RDC; +https://github.com/devalpha/ayeba)",
};

function stripWikiHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToParagraphs(html: string): string[] {
  const chunks = html.split(/<\/p>|<br\s*\/?>/i);
  const out: string[] = [];
  for (const chunk of chunks) {
    const text = stripWikiHtml(chunk);
    if (text.length >= 50) out.push(text);
  }
  return out.slice(0, 5);
}

async function wikiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${WIKI_API}${path}`, {
      signal: AbortSignal.timeout(FETCH_MS),
      next: { revalidate: 86_400 },
      headers: WIKI_HEADERS,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function resolveWikiTitle(query: string): Promise<string | null> {
  try {
    const url = `${WIKI_ACTION}?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json&origin=*`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_MS), headers: WIKI_HEADERS });
    if (!res.ok) return null;
    const data = (await res.json()) as [string, string[]];
    return data[1]?.[0] ?? null;
  } catch {
    return null;
  }
}

export type WikiCorpus = {
  summary: string;
  sections: AyebiSection[];
  image?: string;
  description?: string;
};

export async function fetchWikiCorpus(wikiTitle: string, fallbackQuery?: string): Promise<WikiCorpus | null> {
  let title = wikiTitle.replace(/ /g, "_");
  let encoded = encodeURIComponent(title);

  let [summary, mobile] = await Promise.all([
    wikiGet<WikiSummary>(`/page/summary/${encoded}`),
    wikiGet<WikiMobileSections>(`/page/mobile-sections/${encoded}`),
  ]);

  if (!summary?.extract && !mobile?.remaining?.sections?.length && fallbackQuery) {
    const resolved = await resolveWikiTitle(fallbackQuery);
    if (resolved) {
      title = resolved.replace(/ /g, "_");
      encoded = encodeURIComponent(title);
      [summary, mobile] = await Promise.all([
        wikiGet<WikiSummary>(`/page/summary/${encoded}`),
        wikiGet<WikiMobileSections>(`/page/mobile-sections/${encoded}`),
      ]);
    }
  }

  if (!summary?.extract && !mobile?.remaining?.sections?.length) return null;

  const sections: AyebiSection[] = [];
  const skipHeadings = /^(voir aussi|notes|références|bibliographie|liens externes|annexes)/i;

  for (const sec of mobile?.remaining?.sections ?? []) {
    const heading = sec.line?.trim();
    if (!heading || skipHeadings.test(heading)) continue;
    const paragraphs = sec.text ? htmlToParagraphs(sec.text) : [];
    if (paragraphs.length) sections.push({ heading, paragraphs });
    if (sections.length >= 8) break;
  }

  if (!sections.length && summary?.extract) {
    const lead = summary.extract
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 40);
    if (lead.length) {
      sections.push({ heading: "Article", paragraphs: lead.slice(0, 6) });
    }
  }

  const summaryText =
    summary?.extract?.split(/\n/)[0]?.trim() ||
    summary?.description?.trim() ||
    sections[0]?.paragraphs[0] ||
    "";

  if (!summaryText && !sections.length) return null;

  return {
    summary: summaryText,
    sections,
    image: summary?.thumbnail?.source,
    description: summary?.description,
  };
}
