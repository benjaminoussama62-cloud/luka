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
