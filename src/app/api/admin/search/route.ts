import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { getDb } from "@/lib/storage/database";

export const runtime = "nodejs";

/** GET /api/admin/search — moteur de recherche: index, crawl, requêtes. */
export async function GET() {
  const auth = await requireSection("search");
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const count = (sql: string, ...args: unknown[]) =>
    (db.prepare(sql).get(...args) as { n: number } | undefined)?.n ?? 0;
  const all = (sql: string, ...args: unknown[]) =>
    db.prepare(sql).all(...args) as Record<string, unknown>[];

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  return NextResponse.json({
    ok: true,
    index: {
      totalDocuments: count("SELECT COUNT(*) AS n FROM crawl_documents"),
      localDocuments: count("SELECT COUNT(*) AS n FROM crawl_documents WHERE local_relevant = 1"),
      lastCrawled:
        (db.prepare("SELECT MAX(crawled_at) AS m FROM crawl_documents").get() as { m: string | null })?.m ?? null,
      bySourceType: all(
        "SELECT source_type, COUNT(*) AS n FROM crawl_documents GROUP BY source_type ORDER BY n DESC",
      ),
      topDomains: all(
        "SELECT domain, COUNT(*) AS pages, AVG(credibility) AS avg_credibility FROM crawl_documents GROUP BY domain ORDER BY pages DESC LIMIT 20",
      ),
    },
    queue: {
      pending: count("SELECT COUNT(*) AS n FROM crawl_queue WHERE status = 'pending'"),
      processing: count("SELECT COUNT(*) AS n FROM crawl_queue WHERE status = 'processing'"),
      failed: count("SELECT COUNT(*) AS n FROM crawl_queue WHERE status = 'failed' OR attempts > 3"),
      recentErrors: all(
        "SELECT url, last_error, attempts, created_at FROM crawl_queue WHERE last_error IS NOT NULL ORDER BY created_at DESC LIMIT 20",
      ),
    },
    queries: {
      top7d: all(
        "SELECT query, COUNT(*) AS n FROM search_history WHERE created_at >= ? GROUP BY lower(query) ORDER BY n DESC LIMIT 25",
        sevenDaysAgo,
      ),
      recent: all(
        "SELECT h.query, h.created_at, u.email AS user_email FROM search_history h LEFT JOIN users u ON u.id = h.user_id ORDER BY h.created_at DESC LIMIT 30",
      ),
      totalSearches: count("SELECT COUNT(*) AS n FROM search_history"),
      impressions7d: count("SELECT COUNT(*) AS n FROM impression_signals WHERE shown_at >= ?", sevenDaysAgo),
      clicks7d: count("SELECT COUNT(*) AS n FROM click_signals WHERE clicked_at >= ?", sevenDaysAgo),
    },
    articles: {
      total: count("SELECT COUNT(*) AS n FROM ayebi_articles"),
      stubs: count("SELECT COUNT(*) AS n FROM ayebi_articles WHERE stub = 1"),
      views: count("SELECT COALESCE(SUM(view_count),0) AS n FROM ayebi_articles"),
      flagged: count("SELECT COUNT(*) AS n FROM ayebi_flags WHERE status = 'pending'"),
    },
  });
}
