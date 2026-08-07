import { NextResponse } from "next/server";
import { runCrawlBatch, seedQueue, queueStats } from "@/lib/crawler/global-crawler";
import { seedFromSitemaps } from "@/lib/crawler/sitemap";
import { indexStats } from "@/lib/search-index/fts";
import { getDb } from "@/lib/storage/database";

export const maxDuration = 300;

function isAuthorized(req: Request): boolean {
  if (req.headers.get("x-vercel-cron") === "1") return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function runCronCrawl() {
  const startedAt = new Date().toISOString();

  seedQueue();
  const sitemapUrls = await seedFromSitemaps(200);
  const result = await runCrawlBatch(80);

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
  if (!isAuthorized(req)) {
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
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runCronCrawl());
  } catch (e) {
    console.error("[cron/crawl]", e);
    return NextResponse.json({ error: "Crawl failed" }, { status: 500 });
  }
}
