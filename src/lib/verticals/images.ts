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
 * Le titre doit partager un token significatif avec la requête — sinon les
 * agrégateurs renvoient leurs scans de domaine public (« Flore d'Auvergne »
 * pour « messi »). Aucun token pertinent dans la requête → pas de filtre.
 */
export function mediaRelevant(title: string, tokens: string[]): boolean {
  if (!tokens.length) return true;
  const t = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return tokens.some((tok) => t.includes(tok));
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
  const [openverse, commons, indexed, crawl] = await Promise.all([
    fetchOpenverse(query),
    fetchCommonsImages(query),
    Promise.resolve(searchImages(query, 16)),
    Promise.resolve(imagesFromCrawl(query, 8)),
  ]);

  const seen = new Set<string>();
  const merged: MediaResult[] = [];
  for (const item of [...openverse, ...commons, ...indexed, ...crawl]) {
    const key = item.url.split("#")[0];
    if (!key || seen.has(key) || !item.thumb.startsWith("http")) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= 36) break;
  }
  return merged;
}
