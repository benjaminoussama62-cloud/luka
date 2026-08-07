import { enqueueUrl } from "./global-crawler";

const UA = "AyebiBot/1.0 (+https://ayeba.app)";

export async function parseSitemap(url: string, maxUrls = 500): Promise<number> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": UA, Accept: "application/xml,text/xml,*/*" },
    });
    if (!res.ok) return 0;
    const xml = await res.text();
    return extractUrlsFromSitemap(xml, url, maxUrls);
  } catch {
    return 0;
  }
}

function extractUrlsFromSitemap(xml: string, baseUrl: string, maxUrls: number): number {
  let count = 0;

  // Sitemap index → nested sitemaps
  const sitemapLocs = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>/gi)];
  if (sitemapLocs.length) {
    for (const m of sitemapLocs.slice(0, 5)) {
      count += extractUrlsFromSitemapSync(m[1].trim(), maxUrls - count);
      if (count >= maxUrls) break;
    }
    return count;
  }

  return extractUrlsFromSitemapSync(xml, maxUrls, baseUrl);
}

function extractUrlsFromSitemapSync(xml: string, maxUrls: number, sourceUrl?: string): number {
  let count = 0;
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)];
  for (const m of locs) {
    const u = m[1].trim().replace(/&amp;/g, "&");
    if (!u.startsWith("http")) continue;
    const priority = u.includes(".cd") || /congo|kinshasa|rdc/i.test(u) ? 9 : 3;
    enqueueUrl(u, priority);
    count++;
    if (count >= maxUrls) break;
  }
  if (sourceUrl && count === 0) {
    // fallback: no loc found
    return 0;
  }
  return count;
}

export async function seedFromSitemaps(maxPerSitemap = 300): Promise<number> {
  const { SITEMAP_SEEDS } = await import("./mega-seeds");
  let total = 0;
  for (const sm of SITEMAP_SEEDS) {
    total += await parseSitemap(sm, maxPerSitemap);
  }
  return total;
}
