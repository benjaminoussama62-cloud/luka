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
export type AyebaTab =
  | { id: string; kind: "home"; title: string; private?: boolean }
  | {
      id: string;
      kind: "web";
      title: string;
      url: string;
      history: string[];
      historyIndex: number;
      private?: boolean;
    };

type ClosedTab = { title: string; url?: string; home?: boolean };

type BrowserShellApi = {
  tabs: AyebaTab[];
  activeId: string;
  activeTab: AyebaTab;
  privateMode: boolean;
  setPrivateMode: (v: boolean) => void;
  recentlyClosed: ClosedTab[];
  restoreClosedTab: (index: number) => void;
  openHomeTab: () => void;
  openWebTab: (url: string, title?: string) => void;
  navigateWebTab: (url: string, title?: string) => void;
  webGoBack: () => void;
  webGoForward: () => void;
  webGoTo: (index: number) => void;
  activateTab: (id: string) => void;
  closeTab: (id: string) => void;
  closeAllTabs: () => void;
};

import { recordHistory } from "@/lib/browser-history";

const BrowserShellContext = createContext<BrowserShellApi | null>(null);
const TABS_KEY = "ayeba.browser.tabs.v2";

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
    const raw = localStorage.getItem(TABS_KEY) ?? sessionStorage.getItem("ayeba.browser.tabs.v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AyebaTab[];
    return Array.isArray(parsed) && parsed.length ? parsed.filter((t) => !t.private) : null;
  } catch {
    return null;
  }
}

/** Persiste les onglets sur l'appareil — les onglets privés ne sont JAMAIS écrits. */
function persistTabs(tabs: AyebaTab[], activeId: string) {
  try {
    const visible = tabs.filter((t) => !t.private);
    localStorage.setItem(TABS_KEY, JSON.stringify(visible.length ? visible : defaultTabs()));
    const persistedActive = visible.some((t) => t.id === activeId) ? activeId : (visible[0]?.id ?? "home");
    localStorage.setItem(`${TABS_KEY}.active`, persistedActive);
  } catch {
    /* private mode */
  }
}

export function BrowserShellProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<AyebaTab[]>(defaultTabs);
  const [activeId, setActiveId] = useState("home");
  const [privateMode, setPrivateMode] = useState(false);
  const [recentlyClosed, setRecentlyClosed] = useState<ClosedTab[]>([]);

  useEffect(() => {
    const saved = loadTabs();
    if (saved) {
      const aid = localStorage.getItem(`${TABS_KEY}.active`);
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
    const tab: AyebaTab = { id, kind: "home", title: "Nouvel onglet", private: privateMode || undefined };
    setTabs((prev) => [...prev, tab]);
    setActiveId(id);
  }, [privateMode]);

  /**
   * External destinations open inside Ayeba's own browser tab — the shell
   * keeps the result page, tab history and navigation chrome so the user
   * never loses the app inside the mobile WebView.
   */
  const openWebTab = useCallback((rawUrl: string, title?: string) => {
    let url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
      void new URL(url);
    } catch {
      return;
    }
    const id = uid();
    const tabTitle = title?.trim() || hostnameTitle(url);
    const tab: AyebaTab = {
      id,
      kind: "web",
      title: tabTitle,
      url,
      history: [url],
      historyIndex: 0,
      private: privateMode || undefined,
    };
    if (!privateMode) recordHistory(url, tabTitle);
    setTabs((prev) => [...prev, tab]);
    setActiveId(id);
  }, [privateMode]);

  const navigateWebTab = useCallback((rawUrl: string, title?: string) => {
    let url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
      void new URL(url);
    } catch {
      return;
    }
    const nextTitle = title?.trim() || hostnameTitle(url);
    const current = tabs.find((t) => t.id === activeId);
    if (current?.kind === "web" && !current.private) recordHistory(url, nextTitle);
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeId || t.kind !== "web") return t;
        const history = t.history.slice(0, t.historyIndex + 1);
        history.push(url);
        return {
          ...t,
          url,
          title: nextTitle,
          history,
          historyIndex: history.length - 1,
        };
      }),
    );
  }, [activeId, tabs]);

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

  const webGoTo = useCallback((index: number) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeId || t.kind !== "web") return t;
        if (index < 0 || index >= t.history.length) return t;
        return { ...t, historyIndex: index, url: t.history[index] };
      }),
    );
  }, [activeId]);

  const activateTab = useCallback((id: string) => setActiveId(id), []);

  const closeAllTabs = useCallback(() => {
    setTabs(defaultTabs());
    setActiveId("home");
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const closed = prev[idx];
      if (!closed.private) {
        setRecentlyClosed((rc) =>
          [
            closed.kind === "web"
              ? { title: closed.title, url: closed.url }
              : { title: closed.title, home: true },
            ...rc,
          ].slice(0, 20),
        );
      }
      const next = prev.filter((t) => t.id !== id);
      setActiveId((cur) => {
        if (cur !== id) return cur;
        const fallback = next[Math.max(0, idx - 1)] || next[0];
        return fallback.id;
      });
      return next;
    });
  }, []);

  const restoreClosedTab = useCallback(
    (index: number) => {
      const closed = recentlyClosed[index];
      if (!closed) return;
      setRecentlyClosed((rc) => rc.filter((_, i) => i !== index));
      if (closed.url) openWebTab(closed.url, closed.title);
      else openHomeTab();
    },
    [recentlyClosed, openWebTab, openHomeTab],
  );

  const activeTab = tabs.find((t) => t.id === activeId) || tabs[0];

  const value = useMemo(
    () => ({
      tabs,
      activeId: activeTab.id,
      activeTab,
      privateMode,
      setPrivateMode,
      recentlyClosed,
      restoreClosedTab,
      openHomeTab,
      openWebTab,
      navigateWebTab,
      webGoBack,
      webGoForward,
      webGoTo,
      activateTab,
      closeTab,
      closeAllTabs,
    }),
    [tabs, activeTab, privateMode, recentlyClosed, restoreClosedTab, openHomeTab, openWebTab, navigateWebTab, webGoBack, webGoForward, webGoTo, activateTab, closeTab, closeAllTabs],
  );

  return <BrowserShellContext.Provider value={value}>{children}</BrowserShellContext.Provider>;
}

export function useBrowserShell() {
  const ctx = useContext(BrowserShellContext);
  if (!ctx) throw new Error("useBrowserShell requires BrowserShellProvider");
  return ctx;
}
