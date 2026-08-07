"use client";

import { useEffect, useState } from "react";
import { MARKET_FALLBACK, type MarketPayload, type MarketQuote } from "@/lib/market";
import { useMarket } from "@/lib/market-context";

function QuoteChip({ q, onClick }: { q: MarketQuote; onClick: () => void }) {
  const up = q.changePct != null && q.changePct >= 0;
  const down = q.changePct != null && q.changePct < 0;
  return (
    <button type="button" className="ayeba-ticker-item ayeba-ticker-btn" onClick={onClick}>
      <span className="ayeba-ticker-label">{q.label}</span>
      <span className="ayeba-ticker-value">{q.value}</span>
      {q.changePct != null ? (
        <span className={`ayeba-ticker-change ${up ? "up" : down ? "down" : ""}`}>
          {up ? "▲" : down ? "▼" : "·"} {Math.abs(q.changePct).toFixed(2)}%
        </span>
      ) : null}
    </button>
  );
}

export function MarketTicker({
  compact = false,
  fixed = false,
  belowSearch = false,
}: {
  compact?: boolean;
  fixed?: boolean;
  belowSearch?: boolean;
}) {
  const { openQuote, payload, loading } = useMarket();
  const [data, setData] = useState<MarketPayload>(payload);

  useEffect(() => {
    setData(payload);
  }, [payload]);

  const row = [...data.quotes, ...data.quotes];
  const updated = new Date(data.updatedAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`ayeba-ticker ${compact ? "ayeba-ticker-compact" : ""} ${fixed ? "ayeba-ticker-fixed" : ""} ${belowSearch ? "ayeba-ticker-below-search" : ""}`}
      role="region"
      aria-label="Cours, carburants et change"
    >
      <div className="ayeba-ticker-track">
        {row.map((q, i) => (
          <QuoteChip key={`${q.id}-${i}`} q={q} onClick={() => void openQuote(q.id)} />
        ))}
      </div>
      <p className="ayeba-ticker-meta">
        {loading ? "MAJ…" : "LIVE"} · {updated} · clic = convertir
      </p>
    </div>
  );
}
