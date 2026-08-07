"use client";

import { useEffect, useMemo, useState } from "react";
import type { MarketPayload, MarketQuote } from "@/lib/market";

function parseNum(raw: string): number {
  const n = Number(String(raw).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number, d = 2) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: d });
}

const PURPOSE: Record<string, string> = {
  fx: "Convertissez des devises en francs congolais (ou l'inverse) avant un achat ou un échange.",
  fuel: "Estimez le coût de votre plein ou de vos bouteilles de gaz avant de sortir.",
  crypto: "Valeur en dollars et équivalent en FC.",
  commodity: "Estimation basée sur le cours affiché.",
};

export function MarketDetailModal({
  quote,
  payload,
  initialAmount,
  onClose,
}: {
  quote: MarketQuote;
  payload: MarketPayload;
  initialAmount?: string;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(
    initialAmount ?? (quote.kind === "fuel" ? (quote.meta?.fuelType === "gaz" ? "1" : "10") : "100"),
  );
  const [reverse, setReverse] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (initialAmount) setAmount(initialAmount);
  }, [initialAmount, quote.id]);

  const num = parseNum(amount);
  const cdfPerUsd = payload.cdfPerUsd;
  const base = quote.meta?.base ?? 0;
  const live = !quote.value.includes("—") && payload.source !== "offline";

  const result = useMemo(() => {
    if (!base || !num) return null;

    if (quote.kind === "fx" && quote.meta?.from && quote.meta?.to) {
      if (reverse && quote.meta.to === "CDF" && quote.meta.from !== "CDF") {
        const out = num / base;
        return {
          primary: `${fmt(out, quote.meta.from === "USD" ? 2 : 4)} ${quote.meta.from}`,
          secondary: cdfPerUsd && quote.meta.from === "USD" ? `≈ ${fmt(num, 0)} FC saisis` : undefined,
        };
      }
      if (quote.meta.to === "CDF") {
        return {
          primary: `${fmt(num * base, 0)} FC`,
          secondary:
            cdfPerUsd && quote.meta.from === "EUR"
              ? `≈ $${fmt((num * base) / cdfPerUsd, 2)}`
              : undefined,
        };
      }
      if (quote.meta.from === "EUR" && quote.meta.to === "USD") {
        const out = reverse ? num / base : num * base;
        return {
          primary: reverse ? `${fmt(out, 4)} EUR` : `${fmt(out, 4)} USD`,
          secondary: reverse ? `${fmt(num, 4)} USD` : `${fmt(num, 4)} EUR`,
        };
      }
      return { primary: fmt(num * base, 2) };
    }

    if (quote.kind === "fuel") {
      const totalFc = num * base;
      const usd = cdfPerUsd ? totalFc / cdfPerUsd : null;
      return {
        primary: `${fmt(totalFc, 0)} FC`,
        secondary: usd ? `≈ $${fmt(usd, 2)}` : undefined,
        hint:
          quote.meta?.fuelType === "gaz"
            ? `${fmt(num, 0)} bouteille(s) × ${fmt(base, 0)} FC`
            : `${fmt(num, 1)} L × ${fmt(base, 0)} FC/L`,
      };
    }

    if (quote.kind === "crypto") {
      const usd = num * base;
      return {
        primary: `$${fmt(usd, quote.meta?.from === "USDT" ? 4 : 2)}`,
        secondary: cdfPerUsd ? `${fmt(usd * cdfPerUsd, 0)} FC` : undefined,
      };
    }

    if (quote.kind === "commodity") {
      return {
        primary: `$${fmt(num * base, 2)}`,
        secondary: quote.meta?.unitLabel ? `${fmt(num, 2)} ${quote.meta.unitLabel}` : undefined,
      };
    }

    return null;
  }, [quote, num, reverse, cdfPerUsd, base]);

  const inputLabel =
    quote.kind === "fuel"
      ? quote.meta?.fuelType === "gaz"
        ? "Nombre de bouteilles"
        : "Litres à remplir"
      : quote.kind === "fx" && reverse && quote.meta?.to === "CDF"
        ? "Montant en FC"
        : quote.kind === "fx" && quote.meta?.from
          ? `Montant en ${quote.meta.from}`
          : "Montant";

  return (
    <div
      className="ayeba-overlay z-[90]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="market-modal-title"
      onClick={onClose}
    >
      <div
        className="ayeba-modal ayeba-modal-market max-w-xl p-6 sm:p-10 animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="ayeba-kicker ayeba-kicker-accent">Convertisseur</p>
            <h2 id="market-modal-title" className="mt-2 font-[family-name:var(--font-display)] text-3xl text-white">
              {quote.label}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              {PURPOSE[quote.kind] ?? "Saisissez un montant pour obtenir le total."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="ayeba-ghost px-3 py-1.5 text-sm">
            Fermer
          </button>
        </div>

        <div className="ayeba-panel mb-6 flex items-baseline justify-between gap-4 px-4 py-3">
          <span className="text-xs text-[var(--faint)]">Cours {live ? "live" : "indicatif"}</span>
          <span className="font-[family-name:var(--font-mono)] text-lg text-white">{quote.value}</span>
        </div>

        <label className="block">
          <span className="ayeba-kicker mb-2 block">{inputLabel}</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ex. 50, 1000, 25000…"
            className="ayeba-glass w-full rounded-xl px-5 py-5 text-3xl font-[family-name:var(--font-mono)] text-white outline-none focus:border-[var(--line-bright)]"
            autoFocus
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          {["1", "10", "50", "100", "500", "1000", "10000"].map((p) => (
            <button
              key={p}
              type="button"
              className={`ayeba-ghost rounded-full px-3 py-1.5 text-xs ${amount === p ? "border-[var(--line-bright)] text-white" : ""}`}
              onClick={() => setAmount(p)}
            >
              {Number(p).toLocaleString("fr-FR")}
            </button>
          ))}
        </div>

        {quote.kind === "fx" && quote.meta?.to === "CDF" ? (
          <button
            type="button"
            className="ayeba-ghost mt-4 px-3 py-1.5 text-xs"
            onClick={() => setReverse((v) => !v)}
          >
            {reverse ? "Sens : devise → FC" : "Sens : FC → devise"}
          </button>
        ) : null}

        {result ? (
          <div className="ayeba-panel mt-6 border border-[rgba(0,220,255,0.25)] p-6">
            <p className="ayeba-kicker mb-2">Total estimé</p>
            <p className="font-[family-name:var(--font-display)] text-4xl text-white">{result.primary}</p>
            {result.secondary ? (
              <p className="mt-3 text-[16px] text-[var(--muted)]">{result.secondary}</p>
            ) : null}
            {result.hint ? (
              <p className="mt-3 font-[family-name:var(--font-mono)] text-xs text-[var(--faint)]">{result.hint}</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-6 text-sm text-[var(--faint)]">Entrez un montant pour voir le résultat.</p>
        )}

        <p className="mt-5 font-[family-name:var(--font-mono)] text-[10px] leading-relaxed text-[var(--faint)]">
          {quote.kind === "fuel"
            ? "Prix station indicatifs · Kinshasa. Confirmez sur place."
            : "Taux indicatif · les bureaux de change appliquent souvent un spread."}
        </p>
      </div>
    </div>
  );
}
