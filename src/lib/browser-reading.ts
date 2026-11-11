"use client";

import { useCallback, useEffect, useState } from "react";

export type ReadingItem = { url: string; title: string; ts: number };

const KEY = "ayeba.browser.reading.v1";

function load(): ReadingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]") as ReadingItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(items: ReadingItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 200)));
  } catch {
    /* quota / mode privé */
  }
}

/** Liste de lecture du navigateur intégré — stockée localement sur l'appareil. */
export function useReadingList() {
  const [items, setItems] = useState<ReadingItem[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => setItems(load()), 0);
    return () => window.clearTimeout(t);
  }, []);

  const inList = useCallback((url: string) => items.some((i) => i.url === url), [items]);

  const toggleItem = useCallback((url: string, title: string) => {
    setItems((prev) => {
      const next = prev.some((i) => i.url === url)
        ? prev.filter((i) => i.url !== url)
        : [{ url, title: title.trim() || url, ts: Date.now() }, ...prev];
      save(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((url: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.url !== url);
      save(next);
      return next;
    });
  }, []);

  return { items, inList, toggleItem, removeItem };
}
