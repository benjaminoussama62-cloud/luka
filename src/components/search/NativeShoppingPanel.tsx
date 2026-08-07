"use client";

import { useMemo, useState } from "react";
import type { ShopItem } from "@/lib/types";

export function NativeShoppingPanel({ items }: { items: ShopItem[] }) {
  const [store, setStore] = useState("");
  const [currency, setCurrency] = useState("");
  const stores = useMemo(() => [...new Set(items.map((i) => i.store))], [items]);
  const currencies = useMemo(() => [...new Set(items.map((i) => i.currency))], [items]);

  const filtered = items.filter((item) => {
    if (store && item.store !== store) return false;
    if (currency && item.currency !== currency) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={store}
          onChange={(e) => setStore(e.target.value)}
          className="ayeba-glass rounded-full px-4 py-2 text-xs text-white"
        >
          <option value="">Toutes les boutiques</option>
          {stores.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="ayeba-glass rounded-full px-4 py-2 text-xs text-white"
        >
          <option value="">Toutes devises</option>
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="self-center text-xs text-[var(--faint)]">{filtered.length} produits</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s) => (
          <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="ayeba-panel flex gap-4 p-4">
            {s.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.thumb} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-xs text-[var(--faint)]">
                {s.store.slice(0, 2)}
              </div>
            )}
            <div className="min-w-0">
              <p className="line-clamp-2 font-medium text-white">{s.title}</p>
              <p className="mt-1 text-sm text-[var(--accent)]">
                {s.price} {s.currency}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {s.store}
                {s.rating ? ` · ★ ${s.rating}` : ""}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
