"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isMobileApp } from "@/lib/mobile-app";

export type AyebaTab =
  | { id: string; kind: "home"; title: string }
  | {
      id: string;
      kind: "web";
      title: string;
      url: string;
      history: string[];
      historyIndex: number;
    };

type BrowserShellApi = {
  tabs: AyebaTab[];
  activeId: string;
  activeTab: AyebaTab;
  openHomeTab: () => void;
  openWebTab: (url: string, title?: string) => void;
  navigateWebTab: (url: string, title?: string) => void;
  webGoBack: () => void;
  webGoForward: () => void;
  activateTab: (id: string) => void;
  closeTab: (id: string) => void;
};

const BrowserShellContext = createContext<BrowserShellApi | null>(null);
const TABS_KEY = "ayeba.browser.tabs.v1";

function uid() {
  return `t_${Math.random().toString(36).slice(2, 10)}`;
}

function hostnameTitle(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Page";
  }
}

function defaultTabs(): AyebaTab[] {
  return [{ id: "home", kind: "home", title: "Nouvel onglet" }];
}

function loadTabs(): AyebaTab[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TABS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AyebaTab[];
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

function persistTabs(tabs: AyebaTab[], activeId: string) {
  try {
    sessionStorage.setItem(TABS_KEY, JSON.stringify(tabs));
    sessionStorage.setItem(`${TABS_KEY}.active`, activeId);
  } catch {
    /* private mode */
  }
}

export function BrowserShellProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<AyebaTab[]>(defaultTabs);
  const [activeId, setActiveId] = useState("home");

  useEffect(() => {
    const saved = loadTabs();
    if (saved) {
      const aid = sessionStorage.getItem(`${TABS_KEY}.active`);
      const nextActiveId = aid && saved.some((t) => t.id === aid) ? aid : saved[0].id;
      const t = window.setTimeout(() => {
        setTabs(saved);
        setActiveId(nextActiveId);
      }, 0);
      return () => window.clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    persistTabs(tabs, activeId);
  }, [tabs, activeId]);

  const openHomeTab = useCallback(() => {
    const id = uid();
    const tab: AyebaTab = { id, kind: "home", title: "Nouvel onglet" };
    setTabs((prev) => [...prev, tab]);
    setActiveId(id);
  }, []);

  /**
   * External destinations open the REAL site — ayeba.app is a search engine
   * (like Google), not an iframe wrapper. Inside the native app shell the
   * WebView navigates directly (Safari-style); on the web a new tab opens.
   */
  const openWebTab = useCallback((rawUrl: string) => {
    let url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
      void new URL(url);
    } catch {
      return;
    }
    if (isMobileApp()) {
      window.location.href = url;
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const navigateWebTab = useCallback((rawUrl: string, title?: string) => {
    let url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
      void new URL(url);
    } catch {
      return;
    }
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeId || t.kind !== "web") return t;
        const history = t.history.slice(0, t.historyIndex + 1);
        history.push(url);
        return {
          ...t,
          url,
          title: title?.trim() || hostnameTitle(url),
          history,
          historyIndex: history.length - 1,
        };
      }),
    );
  }, [activeId]);

  const webGoBack = useCallback(() => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeId || t.kind !== "web" || t.historyIndex <= 0) return t;
        const historyIndex = t.historyIndex - 1;
        return { ...t, historyIndex, url: t.history[historyIndex] };
      }),
    );
  }, [activeId]);

  const webGoForward = useCallback(() => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeId || t.kind !== "web" || t.historyIndex >= t.history.length - 1) return t;
        const historyIndex = t.historyIndex + 1;
        return { ...t, historyIndex, url: t.history[historyIndex] };
      }),
    );
  }, [activeId]);

  const activateTab = useCallback((id: string) => setActiveId(id), []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const next = prev.filter((t) => t.id !== id);
      setActiveId((cur) => {
        if (cur !== id) return cur;
        const fallback = next[Math.max(0, idx - 1)] || next[0];
        return fallback.id;
      });
      return next;
    });
  }, []);

  const activeTab = tabs.find((t) => t.id === activeId) || tabs[0];

  const value = useMemo(
    () => ({
      tabs,
      activeId: activeTab.id,
      activeTab,
      openHomeTab,
      openWebTab,
      navigateWebTab,
      webGoBack,
      webGoForward,
      activateTab,
      closeTab,
    }),
    [tabs, activeTab, openHomeTab, openWebTab, navigateWebTab, webGoBack, webGoForward, activateTab, closeTab],
  );

  return <BrowserShellContext.Provider value={value}>{children}</BrowserShellContext.Provider>;
}

export function useBrowserShell() {
  const ctx = useContext(BrowserShellContext);
  if (!ctx) throw new Error("useBrowserShell requires BrowserShellProvider");
  return ctx;
}
