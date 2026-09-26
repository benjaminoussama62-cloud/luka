import { canUseSyncDb, getDb } from "../storage/database";
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

/**
 * Lignes fabriquées par l'ancien catalogue template (« messi… — négociable
 * CDF ») : elles pointaient vers des pages de RECHERCHE, pas des produits,
 * et se sont auto-indexées. Un vrai produit mène à une fiche produit.
 */
const FAKE_PRODUCT_URL = /(?:\/search[/?]|\/catalog\/|\?q=|[?&]q=|openstreetmap\.org\/search|alibaba\.com\/trade\/search)/i;
const FAKE_PRODUCT_IDS = new Set([
  "sombateka", "jumia-1", "jumia-electronics", "local-market", "local-lub",
  "phones-rdc", "mines-b2b",
]);

export function searchProducts(query: string, limit = 24): ShopItem[] {
  if (!canUseSyncDb()) return [];
  const q = `%${query.toLowerCase()}%`;
  const rows = getDb()
    .prepare(
      `SELECT id, title, price, currency, store, url, thumb, rating, category FROM products_index
       WHERE lower(title) LIKE ? OR lower(query_tags) LIKE ? OR lower(category) LIKE ?
       ORDER BY rating DESC NULLS LAST, indexed_at DESC LIMIT ?`,
    )
    .all(q, q, q, limit * 2) as Array<{
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

  return rows
    .filter((r) => !FAKE_PRODUCT_IDS.has(r.id) && !FAKE_PRODUCT_URL.test(r.url))
    .slice(0, limit)
    .map((r) => ({
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
