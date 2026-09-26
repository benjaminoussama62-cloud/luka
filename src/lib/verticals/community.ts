import type { CommunityPost } from "../types";

/**
 * Discussions réelles — chaque carte vient d'une source publique vérifiée.
 * Aucune carte « template » : si rien n'est trouvé, l'onglet est vide.
 */

const UA = { "User-Agent": "AyebaSearch/2.0 (https://ayeba.app)" };

type RedditChild = {
  data?: {
    id?: string;
    title?: string;
    selftext?: string;
    author?: string;
    permalink?: string;
    score?: number;
    num_comments?: number;
    created_utc?: number;
    subreddit?: string;
  };
};

/** Reddit — JSON public, sans clé. Vrais fils triés par pertinence. */
export async function fetchRedditThreads(query: string, limit = 8): Promise<CommunityPost[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${limit}&sort=relevance&raw_json=1`,
      { signal: AbortSignal.timeout(2400), headers: UA, next: { revalidate: 300 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: { children?: RedditChild[] } };
    const out: CommunityPost[] = [];
    for (const c of data.data?.children ?? []) {
      const d = c.data;
      if (!d?.id || !d.title) continue;
      out.push({
        id: `rd-${d.id}`,
        platform: "reddit",
        title: d.title.slice(0, 160),
        excerpt: (d.selftext ?? "").replace(/\s+/g, " ").slice(0, 220),
        author: `u/${d.author ?? "?"} · r/${d.subreddit ?? ""}`,
        url: `https://www.reddit.com${d.permalink ?? `/comments/${d.id}`}`,
        trustScore: Math.min(95, 55 + Math.round(Math.log10(1 + (d.score ?? 0)) * 15)),
        engagement: d.num_comments ?? 0,
        postedAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString().slice(0, 10) : "",
      });
    }
    return out;
  } catch {
    return [];
  }
}

type HnHit = {
  objectID?: string;
  title?: string;
  story_text?: string;
  author?: string;
  points?: number;
  num_comments?: number;
  created_at?: string;
  url?: string;
};

/** Hacker News — API Algolia publique. Pertinent surtout pour la tech. */
export async function fetchHnThreads(query: string, limit = 6): Promise<CommunityPost[]> {
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=${limit}&tags=story`,
      { signal: AbortSignal.timeout(2200), headers: UA, next: { revalidate: 600 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { hits?: HnHit[] };
    return (data.hits ?? [])
      .filter((h) => h.objectID && h.title)
      .map((h) => ({
        id: `hn-${h.objectID}`,
        platform: "forum" as const,
        title: h.title!.slice(0, 160),
        excerpt: (h.story_text ?? "").replace(/<[^>]+>|\s+/g, " ").slice(0, 220),
        author: `${h.author ?? "?"} · Hacker News`,
        url: `https://news.ycombinator.com/item?id=${h.objectID}`,
        trustScore: Math.min(95, 55 + Math.round(Math.log10(1 + (h.points ?? 0)) * 15)),
        engagement: h.num_comments ?? 0,
        postedAt: (h.created_at ?? "").slice(0, 10),
      }));
  } catch {
    return [];
  }
}

/** Communauté = union réelle Reddit + HN, triée par engagement. */
export async function searchCommunity(query: string): Promise<CommunityPost[]> {
  const [reddit, hn] = await Promise.all([fetchRedditThreads(query), fetchHnThreads(query)]);
  return [...reddit, ...hn]
    .sort((a, b) => b.engagement - a.engagement || b.trustScore - a.trustScore)
    .slice(0, 12);
}
