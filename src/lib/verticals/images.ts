import { canUseSyncDb, getDb } from "../storage/database";
import { searchIndex } from "../search-index/fts";
import type { MediaResult } from "../types";

export function indexImage(doc: {
  id: string;
  url: string;
  thumb: string;
  title: string;
  source: string;
  domain: string;
  width?: number;
  height?: number;
  tags?: string;
}) {
  if (!canUseSyncDb()) return;
  getDb()
    .prepare(
      `INSERT INTO vertical_images (id, url, thumb, title, source, domain, width, height, query_tags, indexed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET thumb=excluded.thumb, title=excluded.title, query_tags=excluded.query_tags`,
    )
    .run(
      doc.id,
      doc.url,
      doc.thumb,
      doc.title,
      doc.source,
      doc.domain,
      doc.width ?? null,
      doc.height ?? null,
      doc.tags ?? "",
      new Date().toISOString(),
    );
}

export function searchImages(query: string, limit = 24): MediaResult[] {
  if (!canUseSyncDb()) return [];
  const q = `%${query.toLowerCase()}%`;
  const rows = getDb()
    .prepare(
      `SELECT id, url, thumb, title, source FROM vertical_images
       WHERE lower(title) LIKE ? OR lower(query_tags) LIKE ?
       ORDER BY indexed_at DESC LIMIT ?`,
    )
    .all(q, q, limit) as Array<{ id: string; url: string; thumb: string; title: string; source: string }>;

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    thumb: r.thumb,
    source: r.source,
    type: "image" as const,
  }));
}

/** Tokens significatifs pour le filtre de pertinence des médias. */
function mediaTokens(query: string): string[] {
  return query
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

/**
 * Le titre doit partager les tokens significatifs avec la requête.
 * 1 token → OR (au moins ce token).
 * 2+ tokens → AND majoritaire (≥ ceil(n*0.6)), sinon « somba » matche
 * « valle dei tata somba » et « teka » matche « teka-teka-song ».
 */
export function mediaRelevant(title: string, tokens: string[]): boolean {
  if (!tokens.length) return true;
  const t = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  const compact = tokens.join("");
  if (compact.length >= 6 && t.replace(/\s+/g, "").includes(compact)) return true;
  const hits = tokens.filter((tok) => t.includes(tok)).length;
  if (tokens.length === 1) return hits >= 1;
  const need = Math.max(2, Math.ceil(tokens.length * 0.6));
  return hits >= need;
}

/** Bing Images — miniatures CDN stables (contrairement à Flickr hotlink). */
export async function fetchBingImages(query: string): Promise<MediaResult[]> {
  try {
    const res = await fetch(
      `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
        },
        signal: AbortSignal.timeout(3200),
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) return [];
    const html = await res.text();
    const tokens = mediaTokens(query);
    const out: MediaResult[] = [];
    const seen = new Set<string>();
    // Métadonnées m="..." encodées HTML sur chaque tuile.
    for (const m of html.matchAll(/\bm="(\{[^"]+\})"/g)) {
      if (out.length >= 24) break;
      try {
        const raw = m[1]
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&")
          .replace(/&#39;/g, "'");
        const meta = JSON.parse(raw) as {
          murl?: string;
          turl?: string;
          t?: string;
          purl?: string;
        };
        const thumb = meta.turl || "";
        const page = meta.purl || meta.murl || "";
        if (!thumb.startsWith("http") || !page.startsWith("http")) continue;
        if (seen.has(thumb)) continue;
        const title = (meta.t || query).replace(/<[^>]+>/g, "").trim();
        if (!mediaRelevant(title, tokens)) continue;
        seen.add(thumb);
        out.push({
          id: `bing-img-${out.length}`,
          title: title.slice(0, 120) || query,
          url: page,
          thumb,
          source: "Bing Images",
          type: "image",
        });
      } catch {
        /* tuile illisible */
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function fetchOpenverse(query: string): Promise<MediaResult[]> {
  try {
    const res = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=20`,
      {
        headers: { "User-Agent": "AyebaSearch/2.0" },
        signal: AbortSignal.timeout(2800),
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{
        id: string;
        title?: string;
        url?: string;
        thumbnail?: string;
        foreign_landing_url?: string;
        source?: string;
        provider?: string;
        width?: number;
        height?: number;
      }>;
    };
    const tokens = mediaTokens(query);
    const out: MediaResult[] = [];
    for (const img of data.results ?? []) {
      if (!mediaRelevant(img.title ?? "", tokens)) continue;
      const item: MediaResult = {
        id: img.id || `ov-${out.length}`,
        title: img.title || query,
        url: img.foreign_landing_url || img.url || "#",
        thumb: img.thumbnail || img.url || "",
        // Le vrai fournisseur (flickr, wikimedia, smk…) — pas l'agrégateur.
        source: img.source ?? img.provider ?? "Openverse",
        type: "image",
      };
      out.push(item);
      indexImage({
        id: item.id,
        url: item.url,
        thumb: item.thumb,
        title: item.title,
        source: "Openverse",
        domain: "openverse.org",
        width: img.width,
        height: img.height,
        tags: query,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function imagesFromCrawl(query: string, limit = 12): MediaResult[] {
  if (!canUseSyncDb()) return [];
  const hits = searchIndex(query, limit);
  return hits
    .filter((h) => /\.(jpg|jpeg|png|webp|gif)/i.test(h.url) || /image|photo|gallery/i.test(h.title))
    .map((h, i) => ({
      id: `crawl-img-${i}`,
      title: h.title,
      url: h.url,
      thumb: h.url,
      source: h.domain,
      type: "image" as const,
    }));
}

/** Wikimedia Commons — photos réelles d'entités (personnalités, lieux, drapeaux). */
export async function fetchCommonsImages(query: string): Promise<MediaResult[]> {
  try {
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=14&prop=imageinfo&iiprop=url|size&iiurlwidth=420&format=json&origin=*`,
      {
        headers: { "User-Agent": "AyebaSearch/2.0 (https://ayeba.app)" },
        signal: AbortSignal.timeout(3200),
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            title?: string;
            imageinfo?: { thumburl?: string; url?: string; descriptionurl?: string }[];
          }
        >;
      };
    };
    const tokens = mediaTokens(query);
    const out: MediaResult[] = [];
    for (const page of Object.values(data.query?.pages ?? {})) {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl || !info.url) continue;
      if (!mediaRelevant(page.title ?? "", tokens)) continue;
      out.push({
        id: `commons-${out.length}`,
        title: (page.title ?? query).replace(/^File:/, ""),
        url: info.descriptionurl || info.url,
        thumb: info.thumburl,
        source: "Wikimedia Commons",
        type: "image",
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function searchImagesNative(query: string): Promise<MediaResult[]> {
  const [bing, openverse, commons, indexed, crawl] = await Promise.all([
    fetchBingImages(query),
    fetchOpenverse(query),
    fetchCommonsImages(query),
    Promise.resolve(searchImages(query, 16)),
    Promise.resolve(imagesFromCrawl(query, 8)),
  ]);

  const seen = new Set<string>();
  const merged: MediaResult[] = [];
  // Bing / Commons d'abord : thumbs HTTPS fiables. Flickr Openverse souvent cassé.
  for (const item of [...bing, ...commons, ...openverse, ...indexed, ...crawl]) {
    const key = item.thumb.split("?")[0] || item.url.split("#")[0];
    if (!key || seen.has(key) || !/^https:\/\//i.test(item.thumb)) continue;
    // Hotlink Flickr / staticflickr souvent bloqué dans le navigateur.
    if (/flickr\.com|staticflickr\.com/i.test(item.thumb) && !bing.length) {
      /* garder seulement si rien d'autre */
    } else if (/flickr\.com|staticflickr\.com/i.test(item.thumb)) {
      continue;
    }
    seen.add(key);
    merged.push(item);
    if (merged.length >= 36) break;
  }
  return merged;
}
