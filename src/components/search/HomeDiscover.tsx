"use client";

import { useAyeba } from "@/lib/store";

const TRENDING = [
  "Kinshasa tech",
  "cours dollar franc congolais",
  "Virunga parc",
  "SNEL coupure",
  "UNIKIN",
  "cobalt RDC",
];

const SERVICES = [
  { id: "deep", label: "Deep Research", desc: "Rapport sourcé multi-pages", action: "deep" as const },
  { id: "maps", label: "Maps", desc: "Lieux & OpenStreetMap", action: "tab" as const, tab: "maps" as const },
  { id: "news", label: "Actualités", desc: "Flux presse live", action: "tab" as const, tab: "news" as const },
  { id: "canvas", label: "Canvas", desc: "Tableaux exportables", action: "canvas" as const },
  { id: "audio", label: "Podcast", desc: "Synthèse audio", action: "podcast" as const },
  { id: "shop", label: "Shopping", desc: "Comparateur prix", action: "tab" as const, tab: "shopping" as const },
];

export function HomeDiscover({
  crawlCount,
  onExplore,
}: {
  crawlCount?: number | null;
  onExplore: (q: string) => void;
}) {
  const s = useAyeba();

  function runService(item: (typeof SERVICES)[number]) {
    if (item.action === "deep") s.setDeepResearchOpen(true);
    else if (item.action === "canvas") s.setCanvasOpen(true);
    else if (item.action === "podcast") s.setPodcastOpen(true);
    else if (item.action === "tab") {
      s.setTab(item.tab);
      onExplore("Kinshasa");
    }
  }

  return (
    <div className="mt-10 w-full max-w-2xl space-y-8 text-left">
      <section>
        <p className="ayeba-kicker mb-3">Tendances</p>
        <div className="flex flex-wrap gap-2">
          {TRENDING.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onExplore(q)}
              className="ayeba-ghost px-3 py-1.5 text-xs text-[var(--muted)]"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="ayeba-kicker mb-3">Services</p>
        <div className="ayeba-bento">
          {SERVICES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => runService(item)}
              className="ayeba-bento-tile text-left"
            >
              <span className="hud-label">{item.label}</span>
              <span className="mt-2 block text-sm text-[var(--ink)]">{item.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="ayeba-panel p-4 sm:p-5">
        <p className="ayeba-kicker mb-3">Index live</p>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: "Crawl .cd", v: crawlCount ?? "—" },
            { k: "Sources", v: "12+" },
            { k: "Langues", v: "FR · EN · LN" },
            { k: "LLM", v: "Auto" },
          ].map((row) => (
            <div key={row.k}>
              <dt className="hud-label">{row.k}</dt>
              <dd className="mt-1 font-[family-name:var(--font-mono)] text-sm text-[var(--ink)]">{row.v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
