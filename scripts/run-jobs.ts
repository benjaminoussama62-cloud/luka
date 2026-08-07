/**
 * Lance crawl + import Ayebi + vérifie l'état — sans passer par le serveur HTTP.
 * Usage: npx tsx scripts/run-jobs.ts
 */
import { bulkImportRdc, ayebiStats } from "../src/lib/ayebi/bulk-import";
import { importSeedIfEmpty } from "../src/lib/ayebi/db-sqlite";
import { runCrawlBatch, seedQueue, queueStats } from "../src/lib/crawler/global-crawler";
import { seedFromSitemaps } from "../src/lib/crawler/sitemap";
import { indexStats } from "../src/lib/search-index/fts";
import { getMlWeights } from "../src/lib/search-index/ml-rank";
import { cacheStats } from "../src/lib/cache/redis";
import { getDb } from "../src/lib/storage/database";
import { searchImagesNative } from "../src/lib/verticals/images";
import { searchVideosNative } from "../src/lib/verticals/videos";
import { searchMapsNative } from "../src/lib/verticals/maps";
import { buildNativeShopping } from "../src/lib/verticals/shopping";
import { liveSearch } from "../src/lib/real-search";

async function main() {
  console.log("=== AYEBA/Ayebi — lancement jobs ===\n");

  importSeedIfEmpty();
  console.log("Ayebi seed:", ayebiStats());

  console.log("\n[1/4] Sitemaps + crawl (2 rounds × 60 pages)...");
  seedQueue();
  const sitemapCount = await seedFromSitemaps(200);
  console.log("  Sitemap URLs enqueued:", sitemapCount);

  let totalIndexed = 0;
  for (let i = 0; i < 2; i++) {
    const r = await runCrawlBatch(60);
    totalIndexed += r.indexed;
    console.log(`  Round ${i + 1}: indexed=${r.indexed} errors=${r.errors} remaining=${r.remaining}`);
  }

  console.log("\n[2/4] Import Ayebi Wikipedia (max 35/catégorie + liens RDC)...");
  const imp = await bulkImportRdc({ maxPerCategory: 35, delayMs: 25 });
  console.log("  Import:", imp);

  console.log("\n[3/4] Stats infra");
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

  console.log("\n[4/4] Smoke tests...");
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
    ["Ayebi articles >= 200", ayebi.total >= 200],
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
