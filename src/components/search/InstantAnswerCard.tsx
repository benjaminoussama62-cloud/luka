"use client";

import { useAyeba } from "@/lib/store";
import { useMarket } from "@/lib/market-context";
import type { InstantAnswer } from "@/lib/types";

const KIND_LABEL: Record<string, string> = {
  fx: "Change",
  fuel: "Carburant",
  weather: "Météo",
  time: "Heure",
  unit: "Conversion",
  definition: "Définition",
  population: "Population",
  calc: "Calcul",
};

function AnswerCard({ ia }: { ia: InstantAnswer }) {
  const { openQuote } = useMarket();
  const canConvert = Boolean(ia.marketQuoteId);

  return (
    <article className="ayeba-instant p-5 sm:p-6">
      <p className="ayeba-kicker ayeba-kicker-accent mb-2">{KIND_LABEL[ia.kind] ?? "Réponse"}</p>
      <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-white">{ia.title}</h2>
      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        {ia.lines.map((line) => (
          <div key={`${line.label}-${line.value}`} className="ayeba-glass rounded-lg px-3 py-2.5">
            <dt className="text-[10px] uppercase tracking-wider text-[var(--faint)]">{line.label}</dt>
            <dd className="mt-0.5 font-[family-name:var(--font-mono)] text-base text-white">{line.value}</dd>
          </div>
        ))}
      </dl>
      {canConvert ? (
        <button
          type="button"
          className="ayeba-pill mt-4 px-5 py-2 text-xs font-medium"
          onClick={() => openQuote(ia.marketQuoteId!, ia.defaultAmount)}
        >
          Ouvrir le convertisseur
        </button>
      ) : null}
      {ia.footnote ? (
        <p className="mt-3 font-[family-name:var(--font-mono)] text-[10px] text-[var(--faint)]">{ia.footnote}</p>
      ) : null}
    </article>
  );
}

export function InstantAnswerCard() {
  const { response } = useAyeba();
  const items = response?.instantAnswers?.length
    ? response.instantAnswers
    : response?.instantAnswer
      ? [response.instantAnswer]
      : [];
  if (!items.length) return null;

  return (
    <section className="mb-8 animate-rise">
      <p className="ayeba-kicker mb-4">Réponses instantanées · AYEBA</p>
      <div className={`grid gap-4 ${items.length > 1 ? "lg:grid-cols-2" : ""}`}>
        {items.map((ia, i) => (
          <AnswerCard key={`${ia.kind}-${ia.title}-${i}`} ia={ia} />
        ))}
      </div>
    </section>
  );
}

export function AyebiSerpRail() {
  const { response, search } = useAyeba();
  const hits = response?.results.filter((r) => r.domain === "ayebi").slice(0, 4) ?? [];
  if (!hits.length) return null;

  return (
    <section className="ayeba-panel mb-8 p-5 animate-rise">
      <div className="mb-4 flex items-center justify-between">
        <p className="ayeba-kicker ayeba-kicker-accent">Ayebi · encyclopédie RDC</p>
        <a href="/ayebi" className="text-xs text-[var(--link)]">
          Toutes les fiches
        </a>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {hits.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              if (r.url.startsWith("/")) window.location.href = r.url;
              else search(r.title.replace(/ — Ayebi$/, ""));
            }}
            className="ayeba-glass rounded-xl px-4 py-3 text-left transition hover:border-[var(--line-bright)]"
          >
            <p className="font-[family-name:var(--font-display)] text-sm text-white">{r.title.replace(/ — Ayebi$/, "")}</p>
            <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{r.snippet}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
