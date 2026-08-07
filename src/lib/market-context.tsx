"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MARKET_FALLBACK, type MarketPayload, type MarketQuote } from "@/lib/market";
import { MarketDetailModal } from "@/components/search/MarketDetailModal";

type MarketCtx = {
  openQuote: (id: string, defaultAmount?: string) => void | Promise<void>;
  payload: MarketPayload;
  loading: boolean;
  refresh: () => Promise<MarketPayload>;
};

const Ctx = createContext<MarketCtx | null>(null);

async function fetchMarket(): Promise<MarketPayload> {
  const res = await fetch("/api/market", { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error("market fetch failed");
  const d = (await res.json()) as MarketPayload;
  if (!d?.quotes?.length) throw new Error("empty market");
  return d;
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<MarketPayload>(MARKET_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MarketQuote | null>(null);
  const [defaultAmount, setDefaultAmount] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    try {
      const d = await fetchMarket();
      setData(d);
      return d;
    } catch {
      return data;
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 180_000);
    return () => window.clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openQuote = useCallback(
    async (id: string, amount?: string) => {
      setDefaultAmount(amount);
      let payload = data;
      try {
        payload = await fetchMarket();
        setData(payload);
      } catch {
        /* garde indicatif local */
      }
      const q = payload.quotes.find((x) => x.id === id) ?? MARKET_FALLBACK.quotes.find((x) => x.id === id);
      if (q) setSelected(q);
    },
    [data],
  );

  const value = useMemo(
    () => ({ openQuote, payload: data, loading, refresh }),
    [openQuote, data, loading, refresh],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {selected ? (
        <MarketDetailModal
          quote={selected}
          payload={data}
          initialAmount={defaultAmount}
          onClose={() => {
            setSelected(null);
            setDefaultAmount(undefined);
          }}
        />
      ) : null}
    </Ctx.Provider>
  );
}

export function useMarket() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMarket must be used within MarketProvider");
  return ctx;
}
