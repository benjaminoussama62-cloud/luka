import { NextResponse } from "next/server";
import { cacheStats } from "@/lib/cache/redis";
import { indexStats } from "@/lib/search-index/fts";
import { getMlWeights } from "@/lib/search-index/ml-rank";
import { queueStats } from "@/lib/crawler/global-crawler";
import { ayebiStats } from "@/lib/ayebi/bulk-import";
import { getDb } from "@/lib/storage/database";

export async function GET() {
  const mlSamples = getDb()
    .prepare("SELECT samples FROM ml_rank_weights WHERE id = 1")
    .get() as { samples: number } | undefined;

  return NextResponse.json({
    index: indexStats(),
    queue: queueStats(),
    cache: cacheStats(),
    ayebi: ayebiStats(),
    ml: { weights: getMlWeights(), trainingSamples: mlSamples?.samples ?? 0 },
  });
}
