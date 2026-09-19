"use client";

import { useEffect, useState } from "react";

type Stats = { totalViews: number; last30Days: number; contributorCount: number };

export function AyebiStatsBar({ slug }: { slug: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    // Record view
    fetch(`/api/ayebi/articles/${slug}/stats`, { method: "POST" }).catch(() => {});
    // Fetch stats
    fetch(`/api/ayebi/articles/${slug}/stats`)
      .then((r) => r.json())
      .then((d: Stats) => setStats(d))
      .catch(() => {});
  }, [slug]);

  if (!stats) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-4 font-mono text-[10px] text-[var(--faint)]">
      <span>👁 {stats.totalViews.toLocaleString("fr-FR")} vues totales</span>
      <span>📅 {stats.last30Days.toLocaleString("fr-FR")} vues (30 j)</span>
      <span>✏️ {stats.contributorCount} contributeur{stats.contributorCount !== 1 ? "s" : ""}</span>
    </div>
  );
}
