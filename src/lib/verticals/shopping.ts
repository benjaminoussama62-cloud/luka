import { getDb } from "../storage/database";
import type { ShopItem } from "../types";

export function indexProduct(p: {
  id: string;
  title: string;
  price?: number;
  currency?: string;
  store: string;
  url: string;
  thumb?: string;
  rating?: number;
  category?: string;
  tags?: string;
}) {
  getDb()
    .prepare(
      `INSERT INTO products_index (id, title, price, currency, store, url, thumb, rating, category, query_tags, indexed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET price=excluded.price, rating=excluded.rating, query_tags=excluded.query_tags`,
    )
    .run(
      p.id,
      p.title,
      p.price ?? null,
      p.currency ?? "CDF",
      p.store,
      p.url,
      p.thumb ?? null,
      p.rating ?? null,
      p.category ?? "",
      p.tags ?? "",
      new Date().toISOString(),
    );
}

export function searchProducts(query: string, limit = 24): ShopItem[] {
  const q = `%${query.toLowerCase()}%`;
  const rows = getDb()
    .prepare(
      `SELECT id, title, price, currency, store, url, thumb, rating, category FROM products_index
       WHERE lower(title) LIKE ? OR lower(query_tags) LIKE ? OR lower(category) LIKE ?
       ORDER BY rating DESC NULLS LAST, indexed_at DESC LIMIT ?`,
    )
    .all(q, q, q, limit) as Array<{
    id: string;
    title: string;
    price: number | null;
    currency: string;
    store: string;
    url: string;
    thumb: string | null;
    rating: number | null;
    category: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    price: r.price != null ? String(Math.round(r.price)) : "—",
    currency: r.currency,
    store: r.store,
    url: r.url,
    thumb: r.thumb ?? undefined,
    rating: r.rating ?? undefined,
  }));
}

function thumb(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

/** Catalogue RDC structuré + index local */
export function buildNativeShopping(query: string): ShopItem[] {
  const q = encodeURIComponent(query);
  const ql = query.toLowerCase();

  const catalog: ShopItem[] = [
    {
      id: "jumia-1",
      title: `${query} — Jumia RDC`,
      price: "à partir de",
      currency: "CDF",
      store: "Jumia",
      url: `https://www.jumia.cd/catalog/?q=${q}`,
      thumb: thumb("jumia.cd"),
      rating: 4.3,
    },
    {
      id: "jumia-electronics",
      title: `Électronique · ${query}`,
      price: "promo",
      currency: "CDF",
      store: "Jumia",
      url: `https://www.jumia.cd/electronics/?q=${q}`,
      thumb: thumb("jumia.cd"),
      rating: 4.1,
    },
    {
      id: "local-market",
      title: `${query} — Marchés Kinshasa`,
      price: "négociable",
      currency: "CDF",
      store: "Marché local",
      url: `https://www.openstreetmap.org/search?query=${encodeURIComponent(query + " marché Kinshasa")}`,
      thumb: thumb("openstreetmap.org"),
      rating: 4.0,
    },
    {
      id: "local-lub",
      title: `${query} — Lubumbashi`,
      price: "négociable",
      currency: "CDF",
      store: "Marché local",
      url: `https://www.openstreetmap.org/search?query=${encodeURIComponent(query + " Lubumbashi")}`,
      thumb: thumb("openstreetmap.org"),
      rating: 3.9,
    },
  ];

  if (/phone|téléphone|samsung|iphone|tecno|infinix/i.test(ql)) {
    catalog.unshift({
      id: "phones-rdc",
      title: "Smartphones — comparatif RDC",
      price: "150–800",
      currency: "USD",
      store: "Multi-boutiques",
      url: `https://www.jumia.cd/mobile-phones/?q=${q}`,
      thumb: thumb("jumia.cd"),
      rating: 4.4,
    });
  }

  if (/cobalt|cuivre|mine|minera/i.test(ql)) {
    catalog.unshift({
      id: "mines-b2b",
      title: "Minerais & B2B — Congo",
      price: "devis",
      currency: "USD",
      store: "Alibaba B2B",
      url: `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(query + " DRC")}`,
      thumb: thumb("alibaba.com"),
      rating: 4.0,
    });
  }

  for (const item of catalog) {
    indexProduct({
      id: item.id,
      title: item.title,
      store: item.store,
      url: item.url,
      thumb: item.thumb,
      rating: item.rating,
      tags: query,
    });
  }

  const indexed = searchProducts(query, 12);
  const seen = new Set<string>();
  const merged: ShopItem[] = [];
  for (const item of [...indexed, ...catalog]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged.slice(0, 20);
}

export type ShopFilters = {
  minPrice?: number;
  maxPrice?: number;
  store?: string;
  currency?: string;
};

export function filterShopping(items: ShopItem[], filters: ShopFilters): ShopItem[] {
  return items.filter((item) => {
    if (filters.store && !item.store.toLowerCase().includes(filters.store.toLowerCase())) return false;
    if (filters.currency && item.currency !== filters.currency) return false;
    const num = parseFloat(item.price.replace(/[^\d.]/g, ""));
    if (filters.minPrice != null && !Number.isNaN(num) && num < filters.minPrice) return false;
    if (filters.maxPrice != null && !Number.isNaN(num) && num > filters.maxPrice) return false;
    return true;
  });
}
