"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AyebiCategory } from "@/lib/ayebi/types";

type NavArticle = { slug: string; title: string; category: AyebiCategory };

export function AyebiNavbox({
  slugs,
  currentSlug,
  category,
}: {
  slugs: string[];
  currentSlug: string;
  category: AyebiCategory;
}) {
  const [articles, setArticles] = useState<NavArticle[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    Promise.all(
      slugs.map((s) =>
        fetch(`/api/ayebi/articles/${s}`)
          .then((r) => r.json())
          .then((d: { article?: NavArticle }) => d.article ?? null)
          .catch(() => null),
      ),
    ).then((results) => {
      setArticles(results.filter((a): a is NavArticle => Boolean(a)));
    });
  }, [slugs]);

  if (!articles.length) return null;

  const CAT_LABELS: Record<AyebiCategory, string> = {
    "personnalité": "Personnalités",
    "lieu": "Lieux & monuments",
    "institution": "Institutions",
    "culture": "Culture & arts",
    "sport": "Sport",
    "économie": "Économie & mines",
  };

  return (
    <div className="ayeba-panel mt-10 overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-[rgba(0,180,255,0.06)] px-4 py-3">
        <p className="text-xs font-semibold text-white">
          Navigation · {CAT_LABELS[category]}
        </p>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="font-mono text-[10px] text-[var(--faint)] hover:text-white"
        >
          [{collapsed ? "afficher" : "masquer"}]
        </button>
      </div>
      {!collapsed && (
        <div className="flex flex-wrap gap-2 px-4 py-3">
          {articles.map((a) => (
            <Link
              key={a.slug}
              href={`/ayebi/${a.slug}`}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                a.slug === currentSlug
                  ? "border-[var(--accent)] bg-[rgba(0,180,255,0.12)] text-white font-semibold"
                  : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-bright)] hover:text-white"
              }`}
            >
              {a.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
