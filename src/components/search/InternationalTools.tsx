"use client";

import { AYEBI_STATS } from "@/lib/ayebi";
import { useAyeba } from "@/lib/store";
import { useMarket } from "@/lib/market-context";

const TOOLS = [
  { q: "100 USD en CDF", label: "Change USD" },
  { q: "prix essence Kinshasa", label: "Essence KIN" },
  { q: "météo Kinshasa", label: "Météo" },
  { q: "heure à Kinshasa", label: "Heure locale" },
  { q: "population Kinshasa", label: "Population" },
  { q: "définition RDC", label: "Dictionnaire" },
  { q: "Patrice Lumumba", label: "Ayebi" },
  { q: "TP Mazembe", label: "Sport" },
] as const;

export function InternationalTools() {
  const { search } = useAyeba();
  const { openQuote } = useMarket();

  return (
    <section className="mt-8 w-full">
      <p className="ayeba-kicker mb-3 text-center">Outils internationaux</p>
      <div className="flex flex-wrap justify-center gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.q}
            type="button"
            onClick={() => search(t.q)}
            className="ayeba-ghost rounded-full px-4 py-2 text-xs normal-case tracking-normal"
          >
            {t.label}
          </button>
        ))}
        <button type="button" onClick={() => openQuote("usd-cdf", "100")} className="ayeba-pill px-4 py-2 text-xs">
          Convertisseur $
        </button>
        <a href="/marches" className="ayeba-ghost rounded-full px-4 py-2 text-xs normal-case">
          Tous les marchés
        </a>
        <a href="/ayebi" className="ayeba-ghost rounded-full px-4 py-2 text-xs normal-case">
          Ayebi ({AYEBI_STATS.total} fiches)
        </a>
      </div>
    </section>
  );
}
