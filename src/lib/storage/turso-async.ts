/**
 * Async Turso reads for the search hot path.
 * The sync `libsql` driver blocks the Node event loop on every query —
 * unusable for a default-engine SERP. This client is abortable.
 */
import { createClient, type Client } from "@libsql/client";
import { ensureTursoMigrate } from "./database";
import { ftsMatchQueries } from "../search-index/fts-query";

let _client: Client | null = null;

function strip(v?: string) {
  return (v ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function getAsyncClient(): Client | null {
  if (_client) return _client;
  const raw = strip(process.env.TURSO_DATABASE_URL);
  const authToken = strip(process.env.TURSO_AUTH_TOKEN);
  if (!raw || (!raw.startsWith("libsql://") && !raw.startsWith("https://"))) return null;
  const url = raw.replace(/^libsql:/, "https:");
  try {
    _client = createClient({ url, authToken: authToken || undefined });
    // Schema + seeds run in the background on this async client — never on the
    // sync driver (one blocking HTTP round trip per statement).
    void ensureTursoMigrate();
    return _client;
  } catch {
    return null;
  }
}

export type AsyncFtsHit = {
  docId: string;
  url: string;
  domain: string;
  title: string;
  snippet: string;
  sourceType: string;
  credibility: number;
  localRelevant: boolean;
  rank: number;
};

const FTS_SQL = `SELECT doc_id, url, domain, title, snippet(body, '<b>', '</b>', '…', 10) as snip,
        source_type, credibility, local_relevant, rank
 FROM search_fts WHERE search_fts MATCH ? ORDER BY rank LIMIT ?`;

async function matchRows(
  client: Client,
  matchQuery: string,
  limit: number,
): Promise<AsyncFtsHit[]> {
  const rs = await Promise.race([
    client.execute({ sql: FTS_SQL, args: [matchQuery, limit] }),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 900)),
  ]);
  if (!rs) return [];
  return rs.rows.map((r) => ({
    docId: String(r.doc_id ?? ""),
    url: String(r.url ?? ""),
    domain: String(r.domain ?? ""),
    title: String(r.title ?? ""),
    snippet: String(r.snip ?? "").replace(/<\/?b>/g, ""),
    sourceType: String(r.source_type ?? "web"),
    credibility: Number(r.credibility ?? 0.5),
    localRelevant: Boolean(r.local_relevant),
    rank: Number(r.rank ?? 0),
  }));
}

export async function searchIndexAsync(query: string, limit = 30): Promise<AsyncFtsHit[]> {
  const client = getAsyncClient();
  if (!client) return [];

  const { and, or } = ftsMatchQueries(query.trim());
  if (!and) return [];

  try {
    let hits = await matchRows(client, and, limit);
    // Même rappel que le chemin sync : OR préfixé quand l'AND est vide.
    if (hits.length < Math.min(6, limit) && or !== and) {
      const seenIds = new Set(hits.map((h) => h.docId));
      const extra = (await matchRows(client, or, limit)).filter((h) => !seenIds.has(h.docId));
      hits = [...hits, ...extra].slice(0, limit);
    }
    return hits;
  } catch {
    return [];
  }
}

/** Impressions + Radar aggregates in one batch — never on the sync driver. */
export async function recordImpressionsAsync(
  query: string,
  items: Array<{ url: string; domain: string; position: number }>,
  ctx?: { device?: string; country?: string },
): Promise<void> {
  const client = getAsyncClient();
  if (!client || !query || !items.length) return;

  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  const statements = items
    .slice(0, 30)
    .filter((i) => i.url && i.domain)
    .flatMap((i) => [
      {
        sql: "INSERT INTO impression_signals (query, url, domain, position, shown_at, device, country) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [query, i.url, i.domain, i.position, now, ctx?.device || "", ctx?.country || ""],
      },
      {
        sql: `INSERT INTO radar_daily (day, domain, query, url, impressions, clicks, position_sum, position_count)
              VALUES (?, ?, ?, ?, 1, 0, ?, 1)
              ON CONFLICT(day, domain, query, url) DO UPDATE SET
                impressions = impressions + excluded.impressions,
                position_sum = position_sum + excluded.position_sum,
                position_count = position_count + excluded.position_count`,
        args: [day, i.domain, query, i.url, i.position],
      },
    ]);
  if (!statements.length) return;

  try {
    await client.batch(statements, "write");
  } catch {
    /* signals are best-effort */
  }
}

export async function pushSearchHistoryAsync(userId: string, query: string): Promise<void> {
  const client = getAsyncClient();
  if (!client || !userId || !query) return;

  try {
    await client.batch(
      [
        {
          sql: "DELETE FROM search_history WHERE user_id = ? AND query = ?",
          args: [userId, query],
        },
        {
          sql: "INSERT INTO search_history (user_id, query, created_at) VALUES (?, ?, ?)",
          args: [userId, query, new Date().toISOString()],
        },
        {
          sql: `DELETE FROM search_history WHERE user_id = ? AND id NOT IN (
                  SELECT id FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 40
                )`,
          args: [userId, userId],
        },
      ],
      "write",
    );
  } catch {
    /* history is best-effort */
  }
}

export async function searchAyebiAsync(
  query: string,
  limit = 5,
): Promise<Array<{ slug: string; title: string; summary: string; tags: string[] }>> {
  const client = getAsyncClient();
  if (!client) return [];

  const { and, or } = ftsMatchQueries(query.trim());
  if (!and) return [];

  const ayebiSql = `SELECT a.slug AS slug, a.title AS title, a.summary AS summary, a.tags_json AS tags_json
        FROM ayebi_fts
        JOIN ayebi_articles a ON a.slug = ayebi_fts.slug
        WHERE ayebi_fts MATCH ?
        LIMIT ?`;
  const fetchRows = async (matchQuery: string) => {
    const rs = await Promise.race([
      client.execute({ sql: ayebiSql, args: [matchQuery, limit] }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
    ]);
    return rs?.rows ?? [];
  };

  try {
    let rows = await fetchRows(and);
    if (rows.length < Math.min(3, limit) && or !== and) {
      const extra = await fetchRows(or);
      const seen = new Set(rows.map((r) => String(r.slug ?? "")));
      rows = [...rows, ...extra.filter((r) => !seen.has(String(r.slug ?? "")))].slice(0, limit);
    }

    return rows.map((r) => {
      let tags: string[] = [];
      try {
        tags = JSON.parse(String(r.tags_json || "[]")) as string[];
      } catch {
        tags = [];
      }
      return {
        slug: String(r.slug ?? ""),
        title: String(r.title ?? ""),
        summary: String(r.summary ?? ""),
        tags,
      };
    });
  } catch {
    return [];
  }
}
