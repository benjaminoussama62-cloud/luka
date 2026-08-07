"use client";

import Link from "next/link";
import { FUEL_BY_CITY, type MarketQuote } from "@/lib/market";
import { useMarket } from "@/lib/market-context";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { GradientStage } from "@/components/effects/GradientStage";

function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="ayeba-market-muted">Indicatif</span>;
  const up = pct >= 0;
  return (
    <span className={`ayeba-market-change ${up ? "up" : "down"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)} %
    </span>
  );
}

function QuoteCard({ q, onOpen }: { q: MarketQuote; onOpen: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onOpen(q.id)} className="ayeba-market-card">
      <div className="ayeba-market-card-head">
        <span className="ayeba-kicker">{q.label}</span>
        <ChangeBadge pct={q.changePct} />
      </div>
      <p className="ayeba-market-value">{q.value}</p>
      <p className="ayeba-market-hint">Clic → convertisseur</p>
    </button>
  );
}

const QUICK_AMOUNTS = ["50", "100", "500", "1000"];

const CITY_FUEL_QUOTE: Record<string, string> = {
  Kinshasa: "essence",
  Lubumbashi: "essence-lshi",
  Goma: "essence-goma",
  Kisangani: "essence",
};

export function MarketsHubPage() {
  const { openQuote, payload, loading, refresh } = useMarket();

  const fx = payload.quotes.filter((q) => q.kind === "fx");
  const fuel = payload.quotes.filter((q) => q.kind === "fuel");
  const crypto = payload.quotes.filter((q) => q.kind === "crypto");
  const commodity = payload.quotes.filter((q) => q.kind === "commodity");
  const usd = payload.quotes.find((q) => q.id === "usd-cdf");

  const updated = new Date(payload.updatedAt).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <GradientStage />
      <div className="ayeba-vignette ayeba-vignette-soft" aria-hidden />

      <div className="relative z-10 min-h-dvh px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <Link href="/" aria-label="AYEBA">
              <AyebaWordmark size="sm" />
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/ayebi" className="ayeba-ghost px-3 py-1.5 text-xs">
                Ayebi
              </Link>
              <button
                type="button"
                onClick={() => void refresh()}
                className="ayeba-ghost px-3 py-1.5 text-xs"
                disabled={loading}
              >
                {loading ? "MAJ…" : "Actualiser"}
              </button>
            </div>
          </header>

          <p className="ayeba-kicker ayeba-kicker-accent">Marchés · RDC</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-medium text-white sm:text-5xl">
            Change & carburants
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)]">
            Taux de change, essence, gasoil, gaz et crypto. Cliquez sur une carte ou utilisez les montants rapides pour
            ouvrir le convertisseur.
          </p>
          <p className="mt-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[var(--faint)]">
            {loading ? "Chargement…" : "Live"} · {updated} · {payload.source}
          </p>

          {/* Hero USD/CDF */}
          {usd ? (
            <section className="ayeba-market-hero mt-8">
              <div className="ayeba-market-hero-main">
                <p className="ayeba-kicker">Taux principal</p>
                <p className="ayeba-market-hero-rate">{usd.value}</p>
                <p className="ayeba-market-hero-sub">1 dollar américain → franc congolais</p>
                <ChangeBadge pct={usd.changePct} />
              </div>
              <div className="ayeba-market-hero-actions">
                <p className="ayeba-kicker mb-3">Montants rapides (USD → FC)</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="ayeba-pill px-4 py-2 text-sm"
                      onClick={() => void openQuote("usd-cdf", amt)}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="ayeba-ghost mt-4 w-full py-2.5 text-sm"
                  onClick={() => void openQuote("usd-cdf")}
                >
                  Montant personnalisé →
                </button>
              </div>
            </section>
          ) : null}

          {/* Carburants par ville */}
          <section className="mt-10">
            <h2 className="ayeba-kicker mb-4">Carburants par ville (indicatif FC)</h2>
            <div className="ayeba-panel overflow-x-auto">
              <table className="ayeba-market-table w-full min-w-[480px] text-sm">
                <thead>
                  <tr>
                    <th>Ville</th>
                    <th>Essence / L</th>
                    <th>Gasoil / L</th>
                    <th>Gaz 12 kg</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(FUEL_BY_CITY).map(([city, prices]) => (
                    <tr key={city}>
                      <td className="font-medium text-white">{city}</td>
                      <td>{prices.essence.toLocaleString("fr-FR")} FC</td>
                      <td>{prices.gasoil.toLocaleString("fr-FR")} FC</td>
                      <td>{prices.gaz12kg.toLocaleString("fr-FR")} FC</td>
                      <td>
                        <button
                          type="button"
                          className="ayeba-ghost px-2 py-1 text-[10px]"
                          onClick={() => void openQuote(CITY_FUEL_QUOTE[city] ?? "essence", "10")}
                        >
                          10 L
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="ayeba-kicker mb-4">Devises → CDF</h2>
            <div className="ayeba-market-grid">
              {fx.map((q) => (
                <QuoteCard key={q.id} q={q} onOpen={(id) => void openQuote(id)} />
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="ayeba-kicker mb-4">Pompes & gaz</h2>
            <div className="ayeba-market-grid">
              {fuel.map((q) => (
                <QuoteCard key={q.id} q={q} onOpen={(id) => void openQuote(id)} />
              ))}
            </div>
          </section>

          {crypto.length ? (
            <section className="mt-10">
              <h2 className="ayeba-kicker mb-4">Crypto</h2>
              <div className="ayeba-market-grid">
                {crypto.map((q) => (
                  <QuoteCard key={q.id} q={q} onOpen={(id) => void openQuote(id)} />
                ))}
              </div>
            </section>
          ) : null}

          {commodity.length ? (
            <section className="mt-10">
              <h2 className="ayeba-kicker mb-4">Matières premières · RDC</h2>
              <div className="ayeba-market-grid">
                {commodity.map((q) => (
                  <QuoteCard key={q.id} q={q} onOpen={(id) => void openQuote(id)} />
                ))}
              </div>
            </section>
          ) : null}

          <p className="ayeba-market-disclaimer mt-12">
            Prix carburants : indicatifs pump (varient selon station et quartier). Change : sources publiques agrégées.
            Toujours vérifier au bureau de change ou à la pompe avant transaction.
          </p>
        </div>
      </div>
    </>
  );
}
