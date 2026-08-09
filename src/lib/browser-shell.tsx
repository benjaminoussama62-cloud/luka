"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AyebaTab =
  | { id: string; kind: "home"; title: string }
  | { id: string; kind: "web"; title: string; url: string };

type BrowserShellApi = {
  tabs: AyebaTab[];
  activeId: string;
  activeTab: AyebaTab;
  openHomeTab: () => void;
  openWebTab: (url: string, title?: string) => void;
  activateTab: (id: string) => void;
  closeTab: (id: string) => void;
};

const BrowserShellContext = createContext<BrowserShellApi | null>(null);

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

export function BrowserShellProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<AyebaTab[]>([{ id: "home", kind: "home", title: "Nouvel onglet" }]);
  const [activeId, setActiveId] = useState("home");

  const openHomeTab = useCallback(() => {
    const id = uid();
    const tab: AyebaTab = { id, kind: "home", title: "Nouvel onglet" };
    setTabs((prev) => [...prev, tab]);
    setActiveId(id);
  }, []);

  const openWebTab = useCallback((rawUrl: string, title?: string) => {
    let url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
      // Validate URL
      void new URL(url);
    } catch {
      return;
    }
    const id = uid();
    const tab: AyebaTab = {
      id,
      kind: "web",
      title: title?.trim() || hostnameTitle(url),
      url,
    };
    setTabs((prev) => [...prev, tab]);
    setActiveId(id);
  }, []);

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
      activateTab,
      closeTab,
    }),
    [tabs, activeTab, openHomeTab, openWebTab, activateTab, closeTab],
  );

  return <BrowserShellContext.Provider value={value}>{children}</BrowserShellContext.Provider>;
}

export function useBrowserShell() {
  const ctx = useContext(BrowserShellContext);
  if (!ctx) throw new Error("useBrowserShell requires BrowserShellProvider");
  return ctx;
}
