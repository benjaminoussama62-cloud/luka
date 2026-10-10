import {
  normalizeQueryText,
  relevanceAgainstSubjects,
  tokenMatchesInHay,
} from "../search-relevance";
import type { KnowledgePanel } from "../types";
import {
  BROWSER_UA,
  cleanSnippet,
  isJunkHit,
  UPSTREAM_FAST_MS,
  UPSTREAM_MS,
  type RawHit,
} from "./shared";

/** Recherche Wikipédia full-text (ranking réel) — pas opensearch préfixe. */
async function fetchWikipedia(query: string, lang: "fr" | "en"): Promise<RawHit[]> {
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=8&srprop=snippet&format=json&origin=*`,
      { signal: AbortSignal.timeout(UPSTREAM_MS), next: { revalidate: 0 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      query?: { search?: Array<{ title: string; snippet?: string; pageid?: number }> };
    };
    const pages = data.query?.search ?? [];
    if (!pages.length) return [];
    return pages.map((p) => ({
      title: `${p.title} — Wikipédia`,
      url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`,
      snippet: cleanSnippet(p.snippet || `Article Wikipédia (${lang}) sur ${p.title}.`),
      source: "wikipedia",
    }));
  } catch {
    return [];
  }
}

/** Fusion multi-requêtes : entité comprise + variantes — toute longueur. */
export async function fetchWikipediaMulti(
  queries: string[],
  lang: "fr" | "en",
): Promise<RawHit[]> {
  const uniq = [...new Set(queries.map((q) => q.trim()).filter((q) => q.length >= 1))].slice(0, 3);
  if (!uniq.length) return [];
  if (uniq.length === 1) return fetchWikipedia(uniq[0], lang);
  const lists = await Promise.all(uniq.map((q) => fetchWikipedia(q, lang)));
  const seen = new Set<string>();
  const out: RawHit[] = [];
  for (const list of lists) {
    for (const hit of list) {
      const key = hit.url.split("#")[0];
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(hit);
      if (out.length >= 10) return out;
    }
  }
  return out;
}

type WikiRestSummary = {
  type?: string;
  title?: string;
  extract?: string;
  description?: string;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source?: string };
};

function isDisambiguationSummary(data: WikiRestSummary): boolean {
  if (data.type === "disambiguation") return true;
  const desc = `${data.description ?? ""} ${data.extract ?? ""}`;
  return /homonymie|disambiguation|topics referred to by the same|peut désigner|may refer to/i.test(desc);
}

async function wikiRestSummary(lang: "fr" | "en", title: string): Promise<WikiRestSummary | null> {
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      { signal: AbortSignal.timeout(UPSTREAM_FAST_MS), next: { revalidate: 0 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as WikiRestSummary;
  } catch {
    return null;
  }
}

/**
 * Knowledge panel Wikipédia : résolution générique.
 * Homonymie → on score tous les candidats du search full-text et on
 * prend le meilleur (pas le 1er de la liste) — même logique pour toute
 * requête, courte ou longue.
 */
export async function fetchWikiSummary(queries: string | string[]): Promise<KnowledgePanel | undefined> {
  const list = (Array.isArray(queries) ? queries : [queries])
    .map((q) => q.trim())
    .filter((q) => q.length >= 1);
  const tried = new Set<string>();
  for (const lang of ["fr", "en"] as const) {
    for (const query of list) {
      const key = `${lang}:${normalizeQueryText(query)}`;
      if (tried.has(key)) continue;
      tried.add(key);
      try {
        let data = await wikiRestSummary(lang, query);
        if (!data?.extract || isDisambiguationSummary(data)) {
          const ranked = await fetchWikipedia(query, lang);
          let best: { data: WikiRestSummary; score: number } | null = null;
          for (const hit of ranked.slice(0, 8)) {
            const title = hit.title.replace(/\s—\sWikipédia$/i, "").trim();
            if (!title) continue;
            const cand = await wikiRestSummary(lang, title);
            if (!cand?.extract || isDisambiguationSummary(cand)) continue;
            let score = relevanceAgainstSubjects(
              `${cand.title} ${cand.description ?? ""} ${cand.extract}`,
              query,
              list,
            );
            // Bonus : l'extrait ouvre sur le terme recherché (« Ye is an… »).
            const head = normalizeQueryText(cand.extract).slice(0, 48);
            if (tokenMatchesInHay(normalizeQueryText(query), head)) score += 40;
            if (!best || score > best.score) best = { data: cand, score };
          }
          data = best && best.score >= 8 ? best.data : null;
        }
        if (!data?.extract || isDisambiguationSummary(data)) continue;
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
  }
  return undefined;
}

export async function fetchDuckDuckGo(query: string): Promise<RawHit[]> {
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

export async function fetchDuckDuckGoHtml(query: string): Promise<RawHit[]> {
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
        hits.push({ title, url, snippet, source: "duckduckgo-html", position: hits.length });
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

export async function fetchBing(query: string): Promise<RawHit[]> {
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
      if (title && !isJunkHit(title, url)) {
        hits.push({ title, url, snippet, source: "bing", position: hits.length });
      }
    }
    return hits;
  } catch {
    return [];
  }
}

export async function fetchMojeek(query: string): Promise<RawHit[]> {
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
        hits.push({ title, url: link[1], snippet, source: "mojeek", position: hits.length });
      }
    }
    return hits;
  } catch {
    return [];
  }
}

/**
 * Brave Search API — vrai index indépendant (pas un scrape), ranked, avec
 * dates réelles. Activé uniquement quand BRAVE_SEARCH_API_KEY est défini ;
 * c'est le levier le plus direct vers une qualité « Google » sans attendre
 * que notre propre index atteigne l'échelle mondiale.
 */
export async function fetchBrave(query: string): Promise<RawHit[]> {
  const key = (process.env.BRAVE_SEARCH_API_KEY ?? "").trim();
  if (!key) return [];
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=15&safesearch=moderate&text_decorations=false`,
      {
        headers: {
          "X-Subscription-Token": key,
          Accept: "application/json",
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
        },
        signal: AbortSignal.timeout(UPSTREAM_MS),
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      web?: {
        results?: Array<{
          title?: string;
          url?: string;
          description?: string;
          age?: string;
        }>;
      };
    };
    const hits: RawHit[] = [];
    let position = 0;
    for (const r of data.web?.results ?? []) {
      if (!r.url || !r.title) continue;
      const publishedAt = r.age ? new Date(r.age) : null;
      hits.push({
        title: cleanSnippet(r.title, 160),
        url: r.url,
        snippet: cleanSnippet(r.description ?? "", 260),
        source: "brave",
        position: position++,
        publishedAt:
          publishedAt && !Number.isNaN(publishedAt.getTime())
            ? publishedAt.toISOString().slice(0, 10)
            : undefined,
      });
      if (hits.length >= 15) break;
    }
    return hits;
  } catch {
    return [];
  }
}

export async function fetchNewsRss(query: string): Promise<RawHit[]> {
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
      const pubDateRaw = block.match(/<pubDate>(.*?)<\/pubDate>/i)?.[1]?.trim();
      const pubDate = pubDateRaw ? new Date(pubDateRaw) : null;
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
        publishedAt:
          pubDate && !Number.isNaN(pubDate.getTime())
            ? pubDate.toISOString().slice(0, 10)
            : undefined,
      };
    });
  } catch {
    return [];
  }
}
