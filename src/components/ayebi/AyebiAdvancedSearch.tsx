"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { AYEBI_CATEGORIES } from "@/lib/ayebi/constants";
import type { AyebiArticle } from "@/lib/ayebi/types";
import type { SearchFilters } from "@/lib/ayebi/db-sqlite";

export function AyebiAdvancedSearch() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState<SearchFilters["sortBy"]>("relevance");
  const [stub, setStub] = useState<"" | "1" | "0">("");
  const [results, setResults] = useState<AyebiArticle[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ q, sort: sortBy ?? "relevance" });
    if (category) params.set("category", category);
    if (stub) params.set("stub", stub);
    const res = await fetch(`/api/ayebi/search?${params}`);
    const data = (await res.json()) as { results: AyebiArticle[]; total: number };
    setResults(data.results);
    setTotal(data.total);
    setLoading(false);
  }, [q, category, sortBy, stub]);

  return (
    <div className="relative z-10 min-h-dvh px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/ayebi" className="ayeba-ghost px-3 py-1.5 text-xs">← Ayebi</Link>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl text-white">Recherche avancée</h1>

        <div className="ayeba-panel mt-6 p-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--faint)]">Mots-clés</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Rechercher dans Ayebi…"
              className="ayeba-glass w-full rounded-xl px-4 py-3 text-white"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--faint)]">Catégorie</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="ayeba-glass w-full rounded-xl px-4 py-3 text-white"
              >
                <option value="">Toutes</option>
                {AYEBI_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-[var(--faint)]">Trier par</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SearchFilters["sortBy"])}
                className="ayeba-glass w-full rounded-xl px-4 py-3 text-white"
              >
                <option value="relevance">Pertinence</option>
                <option value="recent">Plus récent</option>
                <option value="views">Plus consulté</option>
                <option value="title">Titre A→Z</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-[var(--faint)]">État</span>
              <select
                value={stub}
                onChange={(e) => setStub(e.target.value as "" | "1" | "0")}
                className="ayeba-glass w-full rounded-xl px-4 py-3 text-white"
              >
                <option value="">Tous</option>
                <option value="0">Articles complets</option>
                <option value="1">Ébauches seulement</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={search}
            disabled={loading}
            className="ayeba-pill px-6 py-3 text-sm"
          >
            {loading ? "Recherche…" : "Rechercher"}
          </button>
        </div>

        {results !== null && (
          <div className="mt-8">
            <p className="mb-4 text-sm text-[var(--muted)]">{total} résultat{total !== 1 ? "s" : ""}</p>
            {results.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {results.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/ayebi/${a.slug}`}
                    className="ayeba-panel block p-5 hover:border-[var(--line-bright)]"
                  >
                    <p className="ayeba-kicker mb-1 capitalize">{a.category}</p>
                    <p className="font-medium text-white">{a.title}</p>
                    <p className="mt-1 text-xs text-[var(--faint)]">{a.subtitle}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{a.summary}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="ayeba-panel p-8 text-center text-[var(--muted)]">Aucun résultat.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
