"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AlgorithmSliders,
  SearchResponse,
  SearchTab,
} from "./types";

type AyebaState = {
  query: string;
  setQuery: (q: string) => void;
  hasSearched: boolean;
  response: SearchResponse | null;
  searching: boolean;
  searchError: string | null;
  search: (q?: string) => void;
  tab: SearchTab;
  setTab: (t: SearchTab) => void;
  sliders: AlgorithmSliders;
  setSlider: (key: keyof AlgorithmSliders, value: number) => void;
  zeroAi: boolean;
  setZeroAi: (v: boolean) => void;
  zeroAds: boolean;
  setZeroAds: (v: boolean) => void;
  privateMode: boolean;
  setPrivateMode: (v: boolean) => void;
  splitScreen: boolean;
  setSplitScreen: (v: boolean) => void;
  showOpposing: boolean;
  setShowOpposing: (v: boolean) => void;
  deepResearchOpen: boolean;
  setDeepResearchOpen: (v: boolean) => void;
  canvasOpen: boolean;
  setCanvasOpen: (v: boolean) => void;
  codeOpen: boolean;
  setCodeOpen: (v: boolean) => void;
  podcastOpen: boolean;
  setPodcastOpen: (v: boolean) => void;
  resetHome: () => void;
};

const Ctx = createContext<AyebaState | null>(null);

const DEFAULT_SLIDERS: AlgorithmSliders = {
  audience: 35,
  authority: 55,
  locality: 40,
};

export function AyebaProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [tab, setTab] = useState<SearchTab>("web");
  const [sliders, setSliders] = useState<AlgorithmSliders>(DEFAULT_SLIDERS);
  const [zeroAi, setZeroAi] = useState(false);
  const [zeroAds, setZeroAds] = useState(false);
  const [privateMode, setPrivateMode] = useState(false);
  const [splitScreen, setSplitScreen] = useState(true);
  const [showOpposing, setShowOpposing] = useState(false);
  const [deepResearchOpen, setDeepResearchOpen] = useState(false);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [podcastOpen, setPodcastOpen] = useState(false);

  const applySearch = useCallback(
    async (
      q: string,
      nextSliders = sliders,
      nextOpts = { zeroAi, zeroAds, privateMode },
    ) => {
      setSearching(true);
      setSearchError(null);
      setHasSearched(true);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 12000);
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: q,
            sliders: nextSliders,
            ...nextOpts,
          }),
          signal: controller.signal,
        });
        window.clearTimeout(timeout);
        if (!res.ok) {
          let detail = "La recherche n’a pas abouti. Réessayez.";
          try {
            const errBody = (await res.json()) as { message?: string; error?: string };
            if (errBody.error) detail = errBody.error;
          } catch {
            /* ignore */
          }
          throw new Error(detail);
        }
        const data = (await res.json()) as SearchResponse;
        setResponse(data);
        setSearchError(null);
        if (data.code) setCodeOpen(true);
        if (!nextOpts.privateMode) {
          try {
            const prev = JSON.parse(sessionStorage.getItem("ayeba-history") || "[]") as string[];
            const next = [q, ...prev.filter((x) => x !== q)].slice(0, 12);
            sessionStorage.setItem("ayeba-history", JSON.stringify(next));
            const session = JSON.parse(localStorage.getItem("ayeba-session") || "null") as {
              id?: string;
            } | null;
            if (session?.id) {
              const key = `ayeba-history-${session.id}`;
              const profile = JSON.parse(localStorage.getItem(key) || "[]") as string[];
              localStorage.setItem(
                key,
                JSON.stringify([q, ...profile.filter((x) => x !== q)].slice(0, 40)),
              );
            }
          } catch {
            /* ignore */
          }
        } else {
          sessionStorage.removeItem("ayeba-history");
        }
      } catch (e) {
        // Keep previous results if any — never leave a broken empty SERP with a harsh banner.
        setSearchError(
          e instanceof Error && e.name === "AbortError"
            ? "Recherche trop longue — réessayez"
            : e instanceof Error
              ? e.message
              : "Erreur réseau",
        );
      } finally {
        setSearching(false);
      }
    },
    [sliders, zeroAi, zeroAds, privateMode],
  );

  const search = useCallback(
    (q?: string) => {
      const final = (q ?? query).trim();
      if (!final) return;
      setQuery(final);
      void applySearch(final);
    },
    [query, applySearch],
  );

  const setSlider = useCallback(
    (key: keyof AlgorithmSliders, value: number) => {
      setSliders((prev) => {
        const next = { ...prev, [key]: value };
        if (hasSearched && query.trim()) void applySearch(query, next);
        return next;
      });
    },
    [hasSearched, query, applySearch],
  );

  const value = useMemo<AyebaState>(
    () => ({
      query,
      setQuery,
      hasSearched,
      response,
      searching,
      searchError,
      search,
      tab,
      setTab,
      sliders,
      setSlider,
      zeroAi,
      setZeroAi: (v) => {
        setZeroAi(v);
        if (hasSearched && query.trim()) {
          void applySearch(query, sliders, { zeroAi: v, zeroAds, privateMode });
        }
      },
      zeroAds,
      setZeroAds: (v) => {
        setZeroAds(v);
        if (hasSearched && query.trim()) {
          void applySearch(query, sliders, { zeroAi, zeroAds: v, privateMode });
        }
      },
      privateMode,
      setPrivateMode: (v) => {
        setPrivateMode(v);
        if (v) setZeroAds(true);
        if (hasSearched && query.trim()) {
          void applySearch(query, sliders, {
            zeroAi,
            zeroAds: v || zeroAds,
            privateMode: v,
          });
        }
      },
      splitScreen,
      setSplitScreen,
      showOpposing,
      setShowOpposing,
      deepResearchOpen,
      setDeepResearchOpen,
      canvasOpen,
      setCanvasOpen,
      codeOpen,
      setCodeOpen,
      podcastOpen,
      setPodcastOpen,
      resetHome: () => {
        setHasSearched(false);
        setResponse(null);
        setQuery("");
        setTab("web");
        setSearchError(null);
        setShowOpposing(false);
        setDeepResearchOpen(false);
        setCanvasOpen(false);
        setCodeOpen(false);
        setPodcastOpen(false);
      },
    }),
    [
      query,
      hasSearched,
      response,
      searching,
      searchError,
      search,
      tab,
      sliders,
      setSlider,
      zeroAi,
      zeroAds,
      privateMode,
      splitScreen,
      showOpposing,
      deepResearchOpen,
      canvasOpen,
      codeOpen,
      podcastOpen,
      applySearch,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAyeba() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAyeba must be used within AyebaProvider");
  return ctx;
}
