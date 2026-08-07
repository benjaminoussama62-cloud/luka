"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { isDeepArticle } from "@/lib/ayebi/enrich-live";
import type { AyebiArticle, AyebiCategory } from "@/lib/ayebi/types";

export function AyebiBrowser({ articles }: { articles: AyebiArticle[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<AyebiCategory | "all">("all");

  const categories = useMemo(() => {
    const labels: Record<AyebiCategory, string> = {
      personnalité: "Personnalités",
      lieu: "Lieux & monuments",
      institution: "Institutions",
      culture: "Culture & arts",
      sport: "Sport",
      économie: "Économie & mines",
    };
    const map = new Map<AyebiCategory, number>();
    for (const a of articles) {
      map.set(a.category, (map.get(a.category) ?? 0) + 1);
    }
    return [...map.entries()].map(([id, count]) => ({ id, count, label: labels[id] }));
  }, [articles]);

  const filtered = useMemo(() => {
    let list = cat === "all" ? articles : articles.filter((a) => a.category === cat);
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((a) => {
      const hay = `${a.title} ${a.subtitle} ${a.summary} ${a.tags.join(" ")}`.toLowerCase();
      return hay.includes(s) || a.slug.includes(s.replace(/\s/g, "-"));
    });
  }, [q, cat, articles]);

  return (
    <div className="relative z-10 min-h-dvh px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium text-white sm:text-6xl">
              Ayebi
            </h1>
            <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-[var(--muted)]">
              Encyclopédie <strong className="font-normal text-white">libre et collaborative</strong> — 100&nbsp;%
              RDC. Créez un compte, rédigez et modifiez les fiches.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/ayebi/connexion" className="ayeba-pill px-4 py-2 text-xs">
                Créer un compte
              </Link>
              <Link href="/ayebi/nouveau" className="ayeba-ghost px-4 py-2 text-xs">
                + Nouvelle fiche
              </Link>
            </div>
          </div>
          <div className="ayeba-panel p-4 text-right">
            <p className="ayeba-kicker ayeba-kicker-accent">Corpus</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-white">{articles.length}</p>
            <p className="text-xs text-[var(--faint)]">fiches · modifiables</p>
          </div>
        </header>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une personnalité, un lieu, une institution…"
            className="ayeba-glass flex-1 rounded-xl px-4 py-3.5 text-[15px] text-white outline-none"
          />
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCat("all")}
            className={`ayeba-ghost rounded-full px-4 py-2 text-xs ${cat === "all" ? "border-[var(--line-bright)] text-white" : ""}`}
          >
            Tout · {articles.length}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={`ayeba-ghost rounded-full px-4 py-2 text-xs capitalize ${cat === c.id ? "border-[var(--line-bright)] text-white" : ""}`}
            >
              {c.label} · {c.count}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <Link
              key={a.slug}
              href={`/ayebi/${a.slug}`}
              className="ayeba-panel group block p-5 transition hover:border-[var(--line-bright)]"
            >
              <p className="ayeba-kicker mb-2 capitalize">{a.category}</p>
              {isDeepArticle(a) ? (
                <span className="mb-2 inline-block rounded-full border border-[rgba(0,220,255,0.35)] px-2 py-0.5 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-wider text-[rgba(0,220,255,0.85)]">
                  Fiche détaillée
                </span>
              ) : null}
              <h2 className="font-[family-name:var(--font-display)] text-lg text-white group-hover:text-[var(--ink)]">
                {a.title}
              </h2>
              <p className="mt-1 text-xs text-[var(--faint)]">{a.subtitle}</p>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--muted)]">{a.summary}</p>
            </Link>
          ))}
        </div>

        {!filtered.length ? (
          <p className="ayeba-panel mt-8 p-8 text-center text-[var(--muted)]">Aucune fiche pour cette recherche.</p>
        ) : null}
      </div>
    </div>
  );
}
