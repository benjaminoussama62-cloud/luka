"use client";

import { useCallback, useEffect, useState } from "react";

export type BrowserFav = { url: string; title: string; ts: number };

const KEY = "ayeba.browser.favs.v1";

function load(): BrowserFav[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as BrowserFav[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(favs: BrowserFav[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(favs.slice(0, 200)));
  } catch {
    /* quota / private mode */
  }
}

/** Favoris du navigateur intégré — stockés localement sur l'appareil. */
export function useBrowserFavs() {
  const [favs, setFavs] = useState<BrowserFav[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => setFavs(load()), 0);
    return () => window.clearTimeout(t);
  }, []);

  const isFav = useCallback((url: string) => favs.some((f) => f.url === url), [favs]);

  const toggleFav = useCallback((url: string, title: string) => {
    setFavs((prev) => {
      const next = prev.some((f) => f.url === url)
        ? prev.filter((f) => f.url !== url)
        : [{ url, title: title.trim() || url, ts: Date.now() }, ...prev];
      save(next);
      return next;
    });
  }, []);

  const removeFav = useCallback((url: string) => {
    setFavs((prev) => {
      const next = prev.filter((f) => f.url !== url);
      save(next);
      return next;
    });
  }, []);

  return { favs, isFav, toggleFav, removeFav };
}
