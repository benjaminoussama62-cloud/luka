/** Vérifie les APIs HTTP du serveur dev */
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";

async function get(path: string, timeout = 90000) {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

async function post(path: string, body: unknown, timeout = 120000) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

async function main() {
  console.log("=== Vérification HTTP ===\nBase:", BASE);

  const stats = await get("/api/index/stats");
  console.log("✓ /api/index/stats");
  console.log("  Ayebi:", stats.ayebi.total, "articles");
  console.log("  Index:", stats.index.documents, "docs,", stats.index.queuePending, "queue");

  const ayebi = await get("/api/ayebi/bulk-import");
  console.log("✓ /api/ayebi/bulk-import GET →", ayebi.stats.total, "articles");

  const search = await post("/api/search", {
    query: "Kinshasa RDC",
    zeroAi: true,
    zeroAds: true,
    privateMode: false,
    sliders: { audience: 35, authority: 55, locality: 40 },
  });
  console.log("✓ /api/search POST");
  console.log("  Results:", search.results?.length ?? 0);
  console.log("  Images:", search.images?.length ?? 0);
  console.log("  Videos:", search.videos?.length ?? 0);
  console.log("  Maps:", search.maps?.length ?? 0);
  console.log("  Shopping:", search.shopping?.length ?? 0);
  console.log("  Approx:", search.approxResults?.toLocaleString("fr-FR"));

  const articles = await get("/api/ayebi/articles");
  console.log("✓ /api/ayebi/articles →", articles.total, "fiches");

  const ok =
    stats.ayebi.total >= 200 &&
    stats.index.documents >= 10 &&
    (search.results?.length ?? 0) > 0 &&
    (search.maps?.length ?? 0) > 0 &&
    articles.total >= 200;

  console.log(ok ? "\n=== TOUT OK ===" : "\n=== ÉCHEC ===");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
