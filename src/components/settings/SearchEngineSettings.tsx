"use client";

import { useEffect, useState } from "react";
import {
  SEARCH_ENGINES,
  getSearchEngineId,
  setSearchEngineId,
  type SearchEngineId,
} from "@/lib/search-engine-prefs";

export function SearchEngineSettings({ compact = false }: { compact?: boolean }) {
  const [engine, setEngine] = useState<SearchEngineId>("ayeba");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setEngine(getSearchEngineId());
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<SearchEngineId>).detail;
      if (id) setEngine(id);
    };
    window.addEventListener("ayeba:search-engine", onChange);
    return () => window.removeEventListener("ayeba:search-engine", onChange);
  }, []);

  function pick(id: SearchEngineId) {
    setSearchEngineId(id);
    setEngine(id);
    if (compact) setOpen(false);
  }

  if (compact) {
    return (
      <div className="ayeba-engine-picker">
        <button
          type="button"
          className="ayeba-engine-trigger"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          title="Moteur de recherche"
        >
          {SEARCH_ENGINES.find((e) => e.id === engine)?.name ?? "Ayeba"}
        </button>
        {open ? (
          <div className="ayeba-engine-menu" role="listbox">
            {SEARCH_ENGINES.map((e) => (
              <button
                key={e.id}
                type="button"
                role="option"
                aria-selected={engine === e.id}
                className={engine === e.id ? "is-active" : ""}
                onClick={() => pick(e.id)}
              >
                <strong>{e.name}</strong>
                <span>{e.hint}</span>
              </button>
            ))}
            <p className="ayeba-engine-note">
              Ayebi (encyclopédie RDC) reste toujours disponible — comme Wikipedia mondial.
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className="ayeba-panel p-5">
      <p className="ayeba-kicker ayeba-kicker-accent mb-2">Moteur de recherche</p>
      <h3 className="text-lg font-medium text-[var(--ink)]">Barre d’adresse</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Choisissez Google, Yandex ou Ayeba. Ayebi et Wikipedia restent accessibles dans Ayeba.
      </p>
      <div className="mt-4 space-y-2">
        {SEARCH_ENGINES.map((e) => (
          <button
            key={e.id}
            type="button"
            className={`ayeba-engine-option${engine === e.id ? " is-active" : ""}`}
            onClick={() => pick(e.id)}
          >
            <span className="ayeba-engine-radio" aria-hidden />
            <span>
              <strong>{e.name}</strong>
              <span className="block text-xs text-[var(--muted)]">{e.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
