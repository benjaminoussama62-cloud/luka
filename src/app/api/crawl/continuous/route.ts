import { NextResponse } from "next/server";
import { runCrawlBatch, seedQueue, queueStats } from "@/lib/crawler/global-crawler";
import { seedFromSitemaps } from "@/lib/crawler/sitemap";
import { indexStats } from "@/lib/search-index/fts";
import { getDb } from "@/lib/storage/database";
import { isCronAuthorized } from "@/lib/cron-auth";

export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({
    index: indexStats(),
    queue: queueStats(),
  });
}

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { rounds?: number; batch?: number };
  const rounds = Math.min(body.rounds ?? 1, 2);
  const batch = Math.min(body.batch ?? 8, 20);

  seedQueue();
  const sitemapUrls = await seedFromSitemaps(120);

  let totalIndexed = 0;
  let totalErrors = 0;
  for (let i = 0; i < rounds; i++) {
    const r = await runCrawlBatch(batch, { timeBudgetMs: 20_000 });
    totalIndexed += r.indexed;
    totalErrors += r.errors;
  }

  getDb()
    .prepare(
      `INSERT INTO job_runs (job_type, status, detail, started_at, finished_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      "crawl_continuous",
      "done",
      JSON.stringify({ totalIndexed, totalErrors, sitemapUrls, rounds, batch }),
      new Date().toISOString(),
      new Date().toISOString(),
    );

  return NextResponse.json({
    ok: true,
    indexed: totalIndexed,
    errors: totalErrors,
    sitemapUrls,
    index: indexStats(),
    queue: queueStats(),
  });
}
