/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Aether — tendances réelles + catalogue produits + recommandations.
 * Tendances : requêtes réelles des utilisateurs Ayeba (search_history) et
 * requêtes qui affichent le site (impression_signals).
 * Produits : catalogue indexé par le crawler (products_index).
 */
import { getDb } from "@/lib/storage/database";
import type { StudioSite } from "./types";

const n = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const sinceDays = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

/* ---------------- Tendances ---------------- */

/** Requêtes qui affichent le domaine dans les résultats Ayeba. */
export function aetherDomainQueries(domain: string, days = 30, limit = 50) {
  const since = sinceDays(days);
  const db = getDb();
  const imps = db
    .prepare(
      `SELECT query, COUNT(*) as imps FROM impression_signals
       WHERE domain = ? AND shown_at >= ? GROUP BY query ORDER BY imps DESC LIMIT ?`,
    )
    .all(domain, since, limit) as any[];
  const clks = db
    .prepare(
      `SELECT query, COUNT(*) as c FROM click_signals
       WHERE domain = ? AND clicked_at >= ? GROUP BY query`,
    )
    .all(domain, since) as any[];
  const clkMap = new Map(clks.map((r) => [r.query, n(r.c)]));
  return imps.map((r) => ({
    query: r.query,
    impressions: n(r.imps),
    clicks: clkMap.get(r.query) || 0,
    ctr: n(r.imps) > 0 ? Math.round(((clkMap.get(r.query) || 0) / n(r.imps)) * 1000) / 10 : 0,
  }));
}

/** Requêtes en hausse : 14 derniers jours vs les 14 précédents (données réelles). */
export function aetherRisingQueries(domain: string, limit = 25) {
  const db = getDb();
  const d14 = sinceDays(14);
  const d28 = sinceDays(28);
  const recent = db
    .prepare(
      `SELECT query, COUNT(*) as c FROM impression_signals
       WHERE domain = ? AND shown_at >= ? GROUP BY query`,
    )
    .all(domain, d14) as any[];
  const previous = db
    .prepare(
      `SELECT query, COUNT(*) as c FROM impression_signals
       WHERE domain = ? AND shown_at >= ? AND shown_at < ? GROUP BY query`,
    )
    .all(domain, d28, d14) as any[];
  const prevMap = new Map(previous.map((r) => [r.query, n(r.c)]));
  return recent
    .map((r) => {
      const prev = prevMap.get(r.query) || 0;
      const curr = n(r.c);
      const growth = prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);
      return { query: r.query, current: curr, previous: prev, growth };
    })
    .filter((r) => r.current > 0)
    .sort((a, b) => b.growth - a.growth || b.current - a.current)
    .slice(0, limit);
}

/** Tendances globales Ayeba — requêtes réelles des utilisateurs (7 derniers jours). */
export function aetherGlobalTrends(days = 7, limit = 30) {
  const db = getDb();
  const since = sinceDays(days);
  const prev = sinceDays(days * 2);
  const recent = db
    .prepare(
      `SELECT query, COUNT(*) as c FROM search_history
       WHERE created_at >= ? GROUP BY query ORDER BY c DESC LIMIT ?`,
    )
    .all(since, limit * 2) as any[];
  const previous = db
    .prepare(
      `SELECT query, COUNT(*) as c FROM search_history
       WHERE created_at >= ? AND created_at < ? GROUP BY query`,
    )
    .all(prev, since) as any[];
  const prevMap = new Map(previous.map((r) => [r.query, n(r.c)]));
  return recent
    .map((r) => {
      const p = prevMap.get(r.query) || 0;
      const c = n(r.c);
      return {
        query: r.query,
        searches: c,
        growth: p === 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100),
      };
    })
    .sort((a, b) => b.searches - a.searches)
    .slice(0, limit);
}

/** Série temporelle d'intérêt pour une requête (recherches réelles par jour). */
export function aetherQuerySeries(query: string, domain: string, days = 30) {
  const db = getDb();
  const since = sinceDays(days);
  const global = db
    .prepare(
      `SELECT substr(created_at, 1, 10) as day, COUNT(*) as c
       FROM search_history WHERE query = ? AND created_at >= ?
       GROUP BY day ORDER BY day`,
    )
    .all(query, since) as any[];
  const siteImps = db
    .prepare(
      `SELECT substr(shown_at, 1, 10) as day, COUNT(*) as c
       FROM impression_signals WHERE query = ? AND domain = ? AND shown_at >= ?
       GROUP BY day ORDER BY day`,
    )
    .all(query, domain, since) as any[];
  const map = new Map<string, { searches: number; impressions: number }>();
  for (const r of global) map.set(r.day, { searches: n(r.c), impressions: 0 });
  for (const r of siteImps) {
    const e = map.get(r.day) || { searches: 0, impressions: 0 };
    e.impressions = n(r.c);
    map.set(r.day, e);
  }
  return [...map.entries()]
    .map(([day, v]) => ({ day, searches: v.searches, impressions: v.impressions }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * Related queries — co-occurrence / shared tokens from impression_signals + search_history.
 * When seedQuery is empty, returns top related pairs for the domain.
 */
export function aetherRelatedQueries(domain: string, seedQuery = "", days = 30, limit = 25) {
  const db = getDb();
  const since = sinceDays(days);
  const seed = seedQuery.trim().toLowerCase();
  const tokens = seed
    ? seed.split(/\s+/).filter((t) => t.length >= 3).slice(0, 6)
    : [];

  if (seed && tokens.length) {
    // Queries that share a token with the seed, excluding the seed itself
    const likeClauses = tokens.map(() => `LOWER(query) LIKE ?`).join(" OR ");
    const likeParams = tokens.map((t) => `%${t}%`);
    const fromImps = db
      .prepare(
        `SELECT query, COUNT(*) as c FROM impression_signals
         WHERE domain = ? AND shown_at >= ? AND (${likeClauses})
           AND LOWER(query) != ?
         GROUP BY query ORDER BY c DESC LIMIT ?`,
      )
      .all(domain, since, ...likeParams, seed, limit) as any[];
    const fromHist = db
      .prepare(
        `SELECT query, COUNT(*) as c FROM search_history
         WHERE created_at >= ? AND (${likeClauses}) AND LOWER(query) != ?
         GROUP BY query ORDER BY c DESC LIMIT ?`,
      )
      .all(since, ...likeParams, seed, limit) as any[];
    const map = new Map<string, { impressions: number; searches: number }>();
    for (const r of fromImps) {
      map.set(String(r.query).toLowerCase(), {
        impressions: n(r.c),
        searches: 0,
      });
    }
    for (const r of fromHist) {
      const q = String(r.query).toLowerCase();
      const e = map.get(q) || { impressions: 0, searches: 0 };
      e.searches = n(r.c);
      map.set(q, e);
    }
    return [...map.entries()]
      .map(([query, v]) => ({
        query,
        impressions: v.impressions,
        searches: v.searches,
        score: v.impressions * 2 + v.searches,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // No seed: top queries for the domain with global search volume
  const imps = db
    .prepare(
      `SELECT query, COUNT(*) as c FROM impression_signals
       WHERE domain = ? AND shown_at >= ? GROUP BY query ORDER BY c DESC LIMIT ?`,
    )
    .all(domain, since, limit) as any[];
  return imps.map((r) => {
    const searches = db
      .prepare(
        `SELECT COUNT(*) as c FROM search_history WHERE LOWER(query) = LOWER(?) AND created_at >= ?`,
      )
      .get(r.query, since) as any;
    return {
      query: r.query,
      impressions: n(r.c),
      searches: n(searches?.c),
      score: n(r.c) * 2 + n(searches?.c),
    };
  });
}

/** Country breakdown of impressions for the domain (and optional query). */
export function aetherCountryBreakdown(domain: string, days = 30, query?: string, limit = 20) {
  const db = getDb();
  const since = sinceDays(days);
  const q = query?.trim();
  const rows = (
    q
      ? db
          .prepare(
            `SELECT COALESCE(NULLIF(TRIM(country), ''), '—') as country, COUNT(*) as imps
             FROM impression_signals
             WHERE domain = ? AND shown_at >= ? AND query = ?
             GROUP BY country ORDER BY imps DESC LIMIT ?`,
          )
          .all(domain, since, q, limit)
      : db
          .prepare(
            `SELECT COALESCE(NULLIF(TRIM(country), ''), '—') as country, COUNT(*) as imps
             FROM impression_signals
             WHERE domain = ? AND shown_at >= ?
             GROUP BY country ORDER BY imps DESC LIMIT ?`,
          )
          .all(domain, since, limit)
  ) as any[];

  const clks = (
    q
      ? db
          .prepare(
            `SELECT COALESCE(NULLIF(TRIM(country), ''), '—') as country, COUNT(*) as c
             FROM click_signals
             WHERE domain = ? AND clicked_at >= ? AND query = ?
             GROUP BY country`,
          )
          .all(domain, since, q)
      : db
          .prepare(
            `SELECT COALESCE(NULLIF(TRIM(country), ''), '—') as country, COUNT(*) as c
             FROM click_signals
             WHERE domain = ? AND clicked_at >= ?
             GROUP BY country`,
          )
          .all(domain, since)
  ) as any[];
  const clkMap = new Map(clks.map((r) => [r.country, n(r.c)]));
  const total = rows.reduce((s, r) => s + n(r.imps), 0);
  return rows.map((r) => ({
    country: r.country,
    impressions: n(r.imps),
    clicks: clkMap.get(r.country) || 0,
    share: total > 0 ? Math.round((n(r.imps) / total) * 1000) / 10 : 0,
  }));
}

/** Sample Merchant feed template (TSV Google Shopping). */
export function aetherMerchantSampleTemplate(domain: string): string {
  const base = `https://${domain}`;
  return [
    "id\ttitle\tlink\tprice\timage_link\tavailability\tbrand\tgoogle_product_category",
    `SKU-001\tExemple produit A\t${base}/produit/a\t15000 CDF\t${base}/img/a.jpg\tin stock\tMaMarque\tApparel & Accessories`,
    `SKU-002\tExemple produit B\t${base}/produit/b\t25000 CDF\t${base}/img/b.jpg\tin stock\tMaMarque\tElectronics`,
    `SKU-003\tExemple produit C\t${base}/produit/c\t8000 CDF\t${base}/img/c.jpg\tout of stock\tMaMarque\tHome & Garden`,
  ].join("\n");
}

/**
 * Catalogue health: count products missing critical Merchant fields
 * (price, image, stock) from real products_index rows.
 */
export function aetherProductIssueCounts(domain: string) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, title, price, url, thumb, in_stock, category
       FROM products_index WHERE store = ? OR store LIKE ?`,
    )
    .all(domain, `%.${domain}`) as any[];

  let errors = 0;
  let warnings = 0;
  for (const p of rows) {
    if (!p.title || !p.url) errors++;
    else {
      if (p.price == null) warnings++;
      if (!p.thumb) warnings++;
      if (!p.category) warnings++;
    }
  }
  return {
    products: rows.length,
    errors,
    warnings,
    ok: Math.max(0, rows.length - errors),
  };
}

/* ---------------- Produits (Merchant Center-like) ---------------- */

export function aetherProducts(domain: string, limit = 100) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, title, price, currency, url, thumb, rating, category, in_stock, indexed_at
       FROM products_index WHERE store = ? OR store LIKE ?
       ORDER BY indexed_at DESC LIMIT ?`,
    )
    .all(domain, `%.${domain}`, limit) as any[];
  const totals = db
    .prepare(
      `SELECT COUNT(*) as total,
              SUM(in_stock) as inStock,
              AVG(price) as avgPrice
       FROM products_index WHERE store = ? OR store LIKE ?`,
    )
    .get(domain, `%.${domain}`) as any;
  return {
    totals: {
      products: n(totals?.total),
      inStock: n(totals?.inStock),
      avgPrice: totals?.avgPrice != null ? Math.round(n(totals.avgPrice) * 100) / 100 : null,
    },
    products: rows.map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price != null ? n(p.price) : null,
      currency: p.currency,
      url: p.url,
      thumb: p.thumb,
      rating: p.rating != null ? n(p.rating) : null,
      category: p.category,
      inStock: n(p.in_stock) === 1,
      indexedAt: p.indexed_at,
    })),
  };
}

export type MerchantFeedIssue = {
  line: number;
  severity: "error" | "warning";
  message: string;
  field?: string;
};

/**
 * Import feed Merchant (TSV Google Shopping / CSV) → products_index.
 * Colonnes attendues (en-têtes flexibles) : id, title, link, price, image_link,
 * availability, brand, google_product_category / product_type.
 */
export function aetherIngestMerchantFeed(
  domain: string,
  raw: string,
): { imported: number; updated: number; issues: MerchantFeedIssue[]; totals: ReturnType<typeof aetherProducts>["totals"] } {
  const issues: MerchantFeedIssue[] = [];
  const text = raw.replace(/^\uFEFF/, "").trim();
  if (!text) {
    return { imported: 0, updated: 0, issues: [{ line: 0, severity: "error", message: "Feed vide" }], totals: aetherProducts(domain, 1).totals };
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return {
      imported: 0,
      updated: 0,
      issues: [{ line: 1, severity: "error", message: "En-tête + au moins une ligne produit requis" }],
      totals: aetherProducts(domain, 1).totals,
    };
  }

  const delim = lines[0].includes("\t") ? "\t" : ",";
  const split = (line: string) => {
    if (delim === "\t") return line.split("\t").map((c) => c.trim());
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        q = !q;
        continue;
      }
      if (ch === "," && !q) {
        out.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur.trim());
    return out;
  };

  const headers = split(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const idx = (...names: string[]) => {
    for (const name of names) {
      const i = headers.indexOf(name);
      if (i >= 0) return i;
    }
    return -1;
  };

  const iId = idx("id", "offer_id", "sku", "item_id");
  const iTitle = idx("title", "name", "product_name");
  const iLink = idx("link", "url", "product_url");
  const iPrice = idx("price", "sale_price");
  const iImage = idx("image_link", "image", "image_url", "thumb");
  const iAvail = idx("availability", "in_stock", "stock");
  const iCat = idx("google_product_category", "product_type", "category");
  const iBrand = idx("brand", "marque");
  const iCurrency = idx("currency");

  if (iTitle < 0 || iLink < 0) {
    issues.push({
      line: 1,
      severity: "error",
      message: "Colonnes obligatoires manquantes : title + link (ou name + url)",
    });
    return { imported: 0, updated: 0, issues, totals: aetherProducts(domain, 1).totals };
  }

  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM products_index WHERE store = ? OR store LIKE ?`)
    .all(domain, `%.${domain}`) as { id: string }[];
  const existingIds = new Set(existing.map((e) => e.id));

  let imported = 0;
  let updated = 0;
  const maxRows = Math.min(lines.length - 1, 2000);

  for (let li = 1; li <= maxRows; li++) {
    const cols = split(lines[li]);
    const title = cols[iTitle]?.trim() || "";
    const link = cols[iLink]?.trim() || "";
    if (!title || !link) {
      issues.push({ line: li + 1, severity: "error", message: "title ou link vide" });
      continue;
    }
    let host = "";
    try {
      host = new URL(link.includes("://") ? link : `https://${link}`).hostname.replace(/^www\./, "");
    } catch {
      issues.push({ line: li + 1, severity: "error", field: "link", message: "URL invalide" });
      continue;
    }
    if (host !== domain && !host.endsWith(`.${domain}`)) {
      issues.push({
        line: li + 1,
        severity: "error",
        field: "link",
        message: `URL hors domaine (${host} ≠ ${domain})`,
      });
      continue;
    }

    const rawId = (iId >= 0 ? cols[iId] : "") || `feed_${host}_${li}`;
    const id = `mcht_${domain}_${String(rawId).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80)}`;
    const priceRaw = iPrice >= 0 ? cols[iPrice] || "" : "";
    const priceMatch = priceRaw.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
    const price = priceMatch ? Number(priceMatch[1]) : null;
    let currency = iCurrency >= 0 ? cols[iCurrency] || "CDF" : "CDF";
    const currFromPrice = priceRaw.match(/\b([A-Z]{3})\b/);
    if (currFromPrice) currency = currFromPrice[1];
    if (!priceMatch && priceRaw) {
      issues.push({ line: li + 1, severity: "warning", field: "price", message: "Prix illisible — produit importé sans prix" });
    }

    const avail = (iAvail >= 0 ? cols[iAvail] || "" : "in stock").toLowerCase();
    const inStock = !/out.of.stock|rupture|épuisé|0|false|no/i.test(avail);
    const category = [
      iCat >= 0 ? cols[iCat] : "",
      iBrand >= 0 ? cols[iBrand] : "",
    ]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 120);
    const thumb = iImage >= 0 ? cols[iImage] || null : null;

    const was = existingIds.has(id);
    db.prepare(
      `INSERT INTO products_index (id, title, price, currency, store, url, thumb, rating, category, in_stock, query_tags, indexed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title=excluded.title, price=excluded.price, currency=excluded.currency,
         url=excluded.url, thumb=excluded.thumb, category=excluded.category,
         in_stock=excluded.in_stock, query_tags=excluded.query_tags, indexed_at=excluded.indexed_at`,
    ).run(
      id,
      title.slice(0, 200),
      price,
      currency.slice(0, 8),
      domain,
      link.includes("://") ? link : `https://${link}`,
      thumb,
      category,
      inStock ? 1 : 0,
      `merchant feed ${title}`.slice(0, 200),
      new Date().toISOString(),
    );
    if (was) updated++;
    else {
      imported++;
      existingIds.add(id);
    }
  }

  if (lines.length - 1 > 2000) {
    issues.push({
      line: 2001,
      severity: "warning",
      message: "Feed tronqué à 2000 produits (limite par import)",
    });
  }

  return { imported, updated, issues: issues.slice(0, 100), totals: aetherProducts(domain, 1).totals };
}

/* ---------------- Recommandations croisées ---------------- */

export function aetherInsights(site: StudioSite) {
  const out: Array<{ title: string; detail: string; href: string; priority: "high" | "medium" | "low" }> = [];
  const domain = site.domain;

  const coverage = getDb()
    .prepare("SELECT COUNT(*) as c FROM crawl_documents WHERE domain = ? OR domain LIKE ?")
    .get(domain, `%.${domain}`) as any;
  const indexed = n(coverage?.c);
  if (indexed === 0) {
    out.push({
      title: "Site absent de l'index",
      detail: "Aucune page indexée — soumettez votre sitemap pour démarrer l'indexation.",
      href: `/studio/app/${site.id}/radar/sitemaps`,
      priority: "high",
    });
  }

  const perf = getDb()
    .prepare("SELECT SUM(clicks) as c FROM radar_daily WHERE domain = ? AND day >= ?")
    .get(domain, sinceDays(28).slice(0, 10)) as any;
  if (indexed > 0 && n(perf?.c) === 0) {
    out.push({
      title: "Indexé mais aucun clic",
      detail: "Vos pages apparaissent peu ou mal — travaillez les titres et la couverture des requêtes montantes.",
      href: `/studio/app/${site.id}/radar/performance`,
      priority: "medium",
    });
  }

  const rising = aetherRisingQueries(domain, 3);
  if (rising.length && rising[0].growth >= 50) {
    out.push({
      title: `Requête en forte hausse : "${rising[0].query}"`,
      detail: `+${rising[0].growth}% d'impressions sur 14 jours — créez ou renforcez le contenu qui y répond.`,
      href: `/studio/app/${site.id}/aether/tendances`,
      priority: "high",
    });
  }

  const sessions = getDb()
    .prepare("SELECT COUNT(*) as c FROM trace_sessions WHERE site_id = ? AND started_at >= ?")
    .get(site.id, sinceDays(7)) as any;
  if (n(sessions?.c) === 0) {
    out.push({
      title: "Aucune mesure d'audience",
      detail: "Installez le snippet Trace pour mesurer vos visiteurs et alimenter les recommandations.",
      href: `/studio/app/${site.id}/trace/tags`,
      priority: "medium",
    });
  }

  const audits = getDb()
    .prepare("SELECT score FROM velocity_audits WHERE site_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(site.id) as any;
  if (!audits) {
    out.push({
      title: "Jamais audité",
      detail: "Lancez un audit Lighthouse pour identifier les freins de performance.",
      href: `/studio/app/${site.id}/velocity`,
      priority: "medium",
    });
  } else if (n(audits.score) < 60) {
    out.push({
      title: `Performance faible (${n(audits.score)}/100)`,
      detail: "Le dernier audit révèle des problèmes qui pénalisent le classement.",
      href: `/studio/app/${site.id}/velocity`,
      priority: "high",
    });
  }

  return out.sort((a, b) => (a.priority === "high" ? -1 : b.priority === "high" ? 1 : 0));
}
