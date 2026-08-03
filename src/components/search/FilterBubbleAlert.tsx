"use client";

import { useAyeba } from "@/lib/store";

export function FilterBubbleAlert() {
  const { response, showOpposing, setShowOpposing } = useAyeba();
  if (!response?.isSensitiveTopic) return null;

  return (
    <section className="ayeba-panel mb-8 animate-rise border-[rgba(255,45,58,0.45)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="live-dot" style={{ background: "var(--warn)" }} />
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--red)]">
              Alerte bulle de filtre
            </h3>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            Sujet sensible détecté. Ayeba refuse le monologue algorithmique — ouvre volontairement
            l&apos;autre camp.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowOpposing(!showOpposing)}
          className="ayeba-cta px-4 py-2 text-sm"
        >
          {showOpposing ? "Masquer" : "Voir l'autre camp"}
        </button>
      </div>
      {showOpposing && response.opposingViews && (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {response.opposingViews.map((v) => (
            <a
              key={v.url}
              href={v.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-[var(--line)] bg-black/40 p-4 transition hover:border-[var(--red)]/40"
            >
              <span className="text-[11px] uppercase tracking-wider text-[var(--red)]">{v.stance}</span>
              <p className="mt-1.5 font-medium text-white">{v.title}</p>
              <p className="mt-1.5 text-sm text-[var(--muted)]">{v.snippet}</p>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
