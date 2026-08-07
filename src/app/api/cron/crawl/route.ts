import { NextResponse } from "next/server";
import { runCrawlBatch, seedQueue, queueStats } from "@/lib/crawler/global-crawler";
import { seedFromSitemaps } from "@/lib/crawler/sitemap";
import { indexStats } from "@/lib/search-index/fts";
import { getDb } from "@/lib/storage/database";
import { isCronAuthorized } from "@/lib/cron-auth";

export const maxDuration = 60;

async function runCronCrawl() {
  const startedAt = new Date().toISOString();

  seedQueue();
  const sitemapUrls = await seedFromSitemaps(120);
  // Hobby functions ≈60s — time-budgeted batch keeps responses reliable.
  const result = await runCrawlBatch(25, { timeBudgetMs: 25_000 });

  getDb()
    .prepare(
      `INSERT INTO job_runs (job_type, status, detail, started_at, finished_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      "cron_crawl",
      "done",
      JSON.stringify({ ...result, sitemapUrls }),
      startedAt,
      new Date().toISOString(),
    );

  return {
    ok: true,
    indexed: result.indexed,
    errors: result.errors,
    remaining: result.remaining,
    sitemapUrls,
    index: indexStats(),
    queue: queueStats(),
  };
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runCronCrawl());
  } catch (e) {
    console.error("[cron/crawl]", e);
    return NextResponse.json({ error: "Crawl failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runCronCrawl());
  } catch (e) {
    console.error("[cron/crawl]", e);
    return NextResponse.json({ error: "Crawl failed" }, { status: 500 });
  }
}
