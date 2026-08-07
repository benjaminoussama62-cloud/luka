import { NextResponse } from "next/server";
import { indexStats, searchIndex } from "@/lib/search-index/fts";
import { queueStats, runCrawlBatch, seedQueue } from "@/lib/crawler/global-crawler";
import { getDb } from "@/lib/storage/database";
import { isCronAuthorized } from "@/lib/cron-auth";

export const maxDuration = 60;

export async function GET() {
  const stats = indexStats();
  const queue = queueStats();
  return NextResponse.json({ ...stats, queue });
}

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { batch?: number };
  const batch = Math.min(Math.max(body.batch ?? 8, 2), 20);

  seedQueue();
  const result = await runCrawlBatch(batch, { timeBudgetMs: 20_000 });

  getDb()
    .prepare(
      `INSERT INTO job_runs (job_type, status, detail, started_at, finished_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      "crawl_v2",
      "done",
      JSON.stringify(result),
      new Date().toISOString(),
      new Date().toISOString(),
    );

  return NextResponse.json({
    ok: true,
    indexed: result.indexed,
    errors: result.errors,
    remaining: result.remaining,
    ftsSample: searchIndex("congo", 3),
  });
}
