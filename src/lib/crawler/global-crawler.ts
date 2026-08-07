import * as cheerio from "cheerio";
import { getDb } from "../storage/database";
import { indexDocument } from "../search-index/fts";
import { indexImage } from "../verticals/images";
import { indexProduct } from "../verticals/shopping";
import { canFetch, canonicalUrl } from "./robots";
import { MEGA_SEEDS } from "./mega-seeds";
import { seedFromSitemaps } from "./sitemap";

/** Graines mondiales + RDC — file extensible vers milliards via queue */
export const GLOBAL_SEEDS = MEGA_SEEDS;

const USER_AGENT = "AyebiBot/1.0 (+https://ayeba.app; crawl RDC-first)";

export function enqueueUrl(url: string, priority = 0) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO crawl_queue (url, priority, status, scheduled_at, created_at)
     VALUES (?, ?, 'pending', ?, ?) ON CONFLICT(url) DO NOTHING`,
  ).run(url, priority, now, now);
}

export function seedQueue() {
  for (const u of GLOBAL_SEEDS) enqueueUrl(u, 10);
  void seedFromSitemaps(400).catch(() => {});
}

export function queueStats() {
  const db = getDb();
  return {
    pending: (db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status='pending'").get() as { c: number }).c,
    done: (db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status='done'").get() as { c: number }).c,
    failed: (db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status='failed'").get() as { c: number }).c,
  };
}

type CrawlResult = { indexed: number; errors: number; remaining: number };

export async function runCrawlBatch(maxPages = 80): Promise<CrawlResult> {
  seedQueue();
  const db = getDb();
  let indexed = 0;
  let errors = 0;

  const pending = db
    .prepare(
      `SELECT id, url FROM crawl_queue WHERE status='pending' ORDER BY priority DESC, id ASC LIMIT ?`,
    )
    .all(maxPages) as { id: number; url: string }[];

  for (const item of pending) {
    db.prepare("UPDATE crawl_queue SET status='processing' WHERE id=?").run(item.id);
    try {
      const ok = await canFetch(item.url, USER_AGENT);
      if (!ok) {
        db.prepare("UPDATE crawl_queue SET status='skipped', last_error='robots' WHERE id=?").run(item.id);
        continue;
      }

      const res = await fetch(item.url, {
        signal: AbortSignal.timeout(12000),
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const html = await res.text();
      const doc = parseHtml(html, item.url);
      if (!doc) throw new Error("empty");

      indexDocument(doc);

      for (const link of doc.outLinks.slice(0, 80)) {
        enqueueUrl(link, link.includes(".cd") ? 9 : link.includes("wikipedia") ? 6 : 2);
      }

      for (const img of doc.images.slice(0, 15)) {
        indexImage(img);
      }
      for (const prod of doc.products.slice(0, 8)) {
        indexProduct(prod);
      }

      db.prepare("UPDATE crawl_queue SET status='done' WHERE id=?").run(item.id);
      indexed++;
    } catch (e) {
      errors++;
      const msg = e instanceof Error ? e.message : "err";
      db.prepare(
        "UPDATE crawl_queue SET status='failed', attempts=attempts+1, last_error=? WHERE id=?",
      ).run(msg.slice(0, 120), item.id);
    }
  }

  const remaining = (db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status='pending'").get() as { c: number }).c;
  db.prepare(
    "INSERT INTO job_runs (job_type, status, detail, started_at, finished_at) VALUES ('crawl', 'done', ?, ?, ?)",
  ).run(JSON.stringify({ indexed, errors, remaining }), new Date().toISOString(), new Date().toISOString());

  return { indexed, errors, remaining };
}

function parseHtml(html: string, url: string) {
  const $ = cheerio.load(html);
  const canon =
    $('link[rel="canonical"]').attr("href")?.trim() ||
    $('meta[property="og:url"]').attr("content")?.trim() ||
    url;
  const finalUrl = canonicalUrl(canon.startsWith("http") ? canon : url);

  const title =
    $("title").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1").first().text().trim();
  if (!title || title.length < 2) return null;

  $("script, style, nav, footer, header").remove();
  const body = $("article, main, body").first().text().replace(/\s+/g, " ").trim().slice(0, 12000);
  const domain = new URL(finalUrl).hostname.replace(/^www\./, "");

  const outLinks: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const u = new URL(href, finalUrl).toString();
      if (u.startsWith("http")) outLinks.push(canonicalUrl(u));
    } catch {
      /* skip */
    }
  });

  const images: Array<{
    id: string;
    url: string;
    thumb: string;
    title: string;
    source: string;
    domain: string;
    tags?: string;
  }> = [];
  $("img[src]").each((i, el) => {
    const src = $(el).attr("src");
    if (!src || src.startsWith("data:")) return;
    try {
      const imgUrl = new URL(src, finalUrl).toString();
      if (!/\.(jpg|jpeg|png|webp|gif)/i.test(imgUrl) && !imgUrl.includes("upload")) return;
      images.push({
        id: Buffer.from(imgUrl).toString("base64url").slice(0, 40),
        url: imgUrl,
        thumb: imgUrl,
        title: $(el).attr("alt") || title,
        source: domain,
        domain,
        tags: title,
      });
    } catch {
      /* skip */
    }
    if (images.length >= 20) return false;
  });

  const products: Array<{
    id: string;
    title: string;
    price?: number;
    currency?: string;
    store: string;
    url: string;
    thumb?: string;
    tags?: string;
  }> = [];

  $('[itemtype*="Product"], .product, .woocommerce-loop-product').each((i, el) => {
    const name =
      $(el).find('[itemprop="name"], .product-title, h2, h3').first().text().trim() ||
      $(el).find("a").first().attr("title") ||
      "";
    const priceText = $(el).find('[itemprop="price"], .price').first().text().trim();
    const price = parseFloat(priceText.replace(/[^\d.,]/g, "").replace(",", "."));
    const link = $(el).find("a[href]").first().attr("href");
    const img = $(el).find("img").first().attr("src");
    if (!name || name.length < 3) return;
    try {
      products.push({
        id: `prod-${Buffer.from(name + domain).toString("base64url").slice(0, 32)}`,
        title: name.slice(0, 120),
        price: Number.isNaN(price) ? undefined : price,
        currency: domain.includes(".cd") ? "CDF" : "USD",
        store: domain,
        url: link ? new URL(link, finalUrl).toString() : finalUrl,
        thumb: img ? new URL(img, finalUrl).toString() : undefined,
        tags: title,
      });
    } catch {
      /* skip */
    }
    if (products.length >= 10) return false;
  });

  const local = domain.endsWith(".cd") || /kinshasa|congo|rdc|lubumbashi/i.test(body);
  const sourceType = domain.endsWith(".cd")
    ? domain.includes("gouv") || domain.includes("gov")
      ? "gov"
      : domain.includes("ac.")
        ? "academic"
        : "web"
    : domain.includes("reuters") || domain.includes("bbc") || domain.includes("rfi")
      ? "news"
      : "web";

  return {
    id: Buffer.from(finalUrl).toString("base64url").slice(0, 48),
    url: finalUrl,
    domain,
    title: title.slice(0, 200),
    body: body || title,
    sourceType,
    credibility: domain.endsWith(".cd") ? 0.85 : TRUST[domain] ?? 0.55,
    localRelevant: local,
    outLinks: [...new Set(outLinks)],
    images,
    products,
  };
}

const TRUST: Record<string, number> = {
  "bbc.com": 0.92,
  "reuters.com": 0.93,
  "worldbank.org": 0.9,
  "imf.org": 0.9,
  "un.org": 0.88,
  "nature.com": 0.9,
  "arxiv.org": 0.88,
  "developer.mozilla.org": 0.87,
  "radiookapi.net": 0.9,
  "bcc.cd": 0.92,
};
