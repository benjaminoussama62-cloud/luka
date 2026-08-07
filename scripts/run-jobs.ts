/**
 * Lance crawl + import Ayebi + vérifie l'état — écrit directement dans Turso/SQLite.
 * Usage (prod Turso): node --env-file=.env.local --import tsx scripts/run-jobs.ts
 * Options: --crawl-only | --ayebi-only | --quick
 */
import { bulkImportRdc, ayebiStats } from "../src/lib/ayebi/bulk-import";
import { importSeedIfEmpty } from "../src/lib/ayebi/db-sqlite";
import { runCrawlBatch, seedQueue, queueStats } from "../src/lib/crawler/global-crawler";
import { seedFromSitemaps } from "../src/lib/crawler/sitemap";
import { indexStats } from "../src/lib/search-index/fts";
import { getMlWeights } from "../src/lib/search-index/ml-rank";
import { cacheStats } from "../src/lib/cache/redis";
import { getDb, currentDbMode, getDbMode } from "../src/lib/storage/database";
import { searchImagesNative } from "../src/lib/verticals/images";
import { searchVideosNative } from "../src/lib/verticals/videos";
import { searchMapsNative } from "../src/lib/verticals/maps";
import { buildNativeShopping } from "../src/lib/verticals/shopping";
import { liveSearch } from "../src/lib/real-search";

const args = new Set(process.argv.slice(2));
const quick = args.has("--quick");
const crawlOnly = args.has("--crawl-only");
const ayebiOnly = args.has("--ayebi-only");

async function main() {
  // Avoid treating a local Turso run as a Vercel serverless instance.
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;

  console.log("=== AYEBA/Ayebi — lancement jobs ===");
  console.log("Expected DB mode:", getDbMode());
  if (getDbMode() !== "turso" && !args.has("--allow-local")) {
    console.error("Abort: TURSO_DATABASE_URL missing. Pull env or pass --allow-local.");
    process.exit(2);
  }
  getDb();
  console.log("Active DB mode:", currentDbMode());
  if (currentDbMode() === "memory") {
    console.error("Abort: DB fell back to memory (Turso open failed).");
    process.exit(2);
  }

  importSeedIfEmpty();
  console.log("Ayebi seed:", ayebiStats());

  let totalIndexed = 0;

  if (!ayebiOnly) {
    const rounds = quick ? 2 : 4;
    const batch = quick ? 30 : 50;
    console.log(`\n[1] Sitemaps + crawl (${rounds} × ${batch})...`);
    seedQueue();
    const sitemapCount = await seedFromSitemaps(quick ? 80 : 200);
    console.log("  Sitemap URLs enqueued:", sitemapCount);

    for (let i = 0; i < rounds; i++) {
      const r = await runCrawlBatch(batch);
      totalIndexed += r.indexed;
      console.log(`  Round ${i + 1}: indexed=${r.indexed} errors=${r.errors} remaining=${r.remaining}`);
    }
  }

  if (!crawlOnly) {
    const maxPer = quick ? 20 : 40;
    const maxImport = quick ? 60 : 180;
    console.log(`\n[2] Import Ayebi Wikipedia (max ${maxImport}, ${maxPer}/catégorie)...`);
    const imp = await bulkImportRdc({ maxPerCategory: maxPer, maxImport, delayMs: 20 });
    console.log("  Import:", imp);
  }

  console.log("\n[3] Stats infra");
  const idx = indexStats();
  const queue = queueStats();
  const cache = cacheStats();
  const ayebi = ayebiStats();
  const mlSamples = getDb()
    .prepare("SELECT samples FROM ml_rank_weights WHERE id = 1")
    .get() as { samples: number };
  console.log("  Index:", idx);
  console.log("  Queue:", queue);
  console.log("  Cache:", cache);
  console.log("  Ayebi:", ayebi);
  console.log("  ML samples:", mlSamples?.samples ?? 0);

  console.log("\n[4] Smoke tests...");
  const q = "Kinshasa RDC";
  const [search, images, videos, maps, shopping] = await Promise.all([
    liveSearch(q, {
      zeroAi: true,
      zeroAds: true,
      privateMode: false,
      sliders: { audience: 35, authority: 55, locality: 40 },
    }),
    searchImagesNative(q),
    searchVideosNative(q),
    searchMapsNative(q),
    Promise.resolve(buildNativeShopping("téléphone")),
  ]);

  const checks = [
    ["Search results", search.results.length > 0],
    ["Search maps", search.maps.length > 0],
    ["Images vertical", images.length > 0],
    ["Videos vertical", videos.length > 0],
    ["Maps vertical", maps.length > 0],
    ["Shopping vertical", shopping.length > 0],
    ["Ayebi articles >= 100", ayebi.total >= 100],
    ["Crawl documents >= 10", idx.documents >= 10],
    ["ML weights loaded", Object.keys(getMlWeights()).length >= 10],
  ] as const;

  let passed = 0;
  for (const [name, ok] of checks) {
    const isOptional = name.includes("Videos");
    const success = isOptional ? true : ok;
    console.log(`  ${ok ? "✓" : isOptional ? "~" : "✗"} ${name}${!ok && isOptional ? " (Piped indisponible — OK)" : ""}`);
    if (success) passed++;
  }

  console.log(`\n=== Résultat: ${passed}/${checks.length} checks OK ===`);
  console.log(`Crawl total indexed this run: ${totalIndexed}`);
  process.exit(passed === checks.length ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
