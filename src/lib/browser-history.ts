"use client";

import { useCallback, useEffect, useState } from "react";

export type HistoryEntry = { url: string; title: string; ts: number };

const KEY = "ayeba.browser.history.v1";
const MAX = 500;

function load(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
  } catch {
    /* quota / private */
  }
}

/** Append un entry — appelé par le shell à chaque navigation hors mode privé. */
export function recordHistory(url: string, title: string) {
  if (typeof window === "undefined") return;
  const entries = load();
  if (entries[0]?.url === url) return;
  save([{ url, title: title.trim() || url, ts: Date.now() }, ...entries.filter((e) => e.url !== url)]);
}

/** Historique de navigation du navigateur intégré — local à l'appareil. */
export function useBrowserHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => setEntries(load()), 0);
    return () => window.clearTimeout(t);
  }, []);

  const refresh = useCallback(() => setEntries(load()), []);

  const removeEntry = useCallback((url: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.url !== url);
      save(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    save([]);
    setEntries([]);
  }, []);

  return { entries, refresh, removeEntry, clearAll };
}
