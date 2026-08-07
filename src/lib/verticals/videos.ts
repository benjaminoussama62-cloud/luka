import { getDb } from "../storage/database";
import type { MediaResult } from "../types";

export function indexVideo(v: {
  id: string;
  url: string;
  thumb: string;
  title: string;
  channel: string;
  durationSec?: number;
  views?: number;
  tags?: string;
}) {
  getDb()
    .prepare(
      `INSERT INTO vertical_videos (id, url, thumb, title, channel, duration_sec, views, query_tags, indexed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET views=excluded.views, query_tags=excluded.query_tags`,
    )
    .run(
      v.id,
      v.url,
      v.thumb,
      v.title,
      v.channel,
      v.durationSec ?? null,
      v.views ?? null,
      v.tags ?? "",
      new Date().toISOString(),
    );
}

function formatDuration(sec?: number): string | undefined {
  if (!sec) return undefined;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function searchVideosIndexed(query: string, limit = 20): MediaResult[] {
  const q = `%${query.toLowerCase()}%`;
  const rows = getDb()
    .prepare(
      `SELECT id, url, thumb, title, channel, duration_sec FROM vertical_videos
       WHERE lower(title) LIKE ? OR lower(query_tags) LIKE ? OR lower(channel) LIKE ?
       ORDER BY views DESC NULLS LAST LIMIT ?`,
    )
    .all(q, q, q, limit) as Array<{
    id: string;
    url: string;
    thumb: string;
    title: string;
    channel: string;
    duration_sec: number | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    thumb: r.thumb,
    source: r.channel,
    type: "video" as const,
    duration: formatDuration(r.duration_sec ?? undefined),
  }));
}

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://api.piped.yt",
];

export async function fetchPipedVideos(query: string): Promise<MediaResult[]> {
  for (const base of PIPED_INSTANCES) {
    try {
      const res = await fetch(
        `${base}/search?q=${encodeURIComponent(query)}&filter=videos`,
        { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "AyebaSearch/2.0" } },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        items?: Array<{
          url?: string;
          title?: string;
          thumbnail?: string;
          uploaderName?: string;
          duration?: number;
          views?: number;
        }>;
      };
      const out: MediaResult[] = [];
      for (const v of data.items ?? []) {
        if (!v.url || !v.title) continue;
        const id = Buffer.from(v.url).toString("base64url").slice(0, 32);
        const item: MediaResult = {
          id,
          title: v.title,
          url: v.url.startsWith("http") ? v.url : `https://youtube.com${v.url}`,
          thumb: v.thumbnail || "",
          source: v.uploaderName || "YouTube",
          type: "video",
          duration: formatDuration(v.duration),
        };
        out.push(item);
        indexVideo({
          id,
          url: item.url,
          thumb: item.thumb,
          title: item.title,
          channel: item.source,
          durationSec: v.duration,
          views: v.views,
          tags: query,
        });
        if (out.length >= 18) break;
      }
      if (out.length) return out;
    } catch {
      continue;
    }
  }
  return [];
}

export async function searchVideosNative(query: string): Promise<MediaResult[]> {
  const [piped, indexed] = await Promise.all([
    fetchPipedVideos(query),
    Promise.resolve(searchVideosIndexed(query, 12)),
  ]);

  const seen = new Set<string>();
  const merged: MediaResult[] = [];
  for (const v of [...piped, ...indexed]) {
    const key = v.url;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(v);
    if (merged.length >= 24) break;
  }
  return merged;
}
