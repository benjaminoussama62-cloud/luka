import { getDb } from "../storage/database";
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
        width?: number;
        height?: number;
      }>;
    };
    const out: MediaResult[] = [];
    for (const img of data.results ?? []) {
      const item: MediaResult = {
        id: img.id || `ov-${out.length}`,
        title: img.title || query,
        url: img.foreign_landing_url || img.url || "#",
        thumb: img.thumbnail || img.url || "",
        source: "Openverse",
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

export async function searchImagesNative(query: string): Promise<MediaResult[]> {
  const [openverse, indexed, crawl] = await Promise.all([
    fetchOpenverse(query),
    Promise.resolve(searchImages(query, 16)),
    Promise.resolve(imagesFromCrawl(query, 8)),
  ]);

  const seen = new Set<string>();
  const merged: MediaResult[] = [];
  for (const item of [...openverse, ...indexed, ...crawl]) {
    const key = item.url.split("#")[0];
    if (!key || seen.has(key) || !item.thumb.startsWith("http")) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= 36) break;
  }
  return merged;
}
