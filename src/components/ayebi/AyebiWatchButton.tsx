"use client";

import { useEffect, useState } from "react";

export function AyebiWatchButton({ slug }: { slug: string }) {
  const [watching, setWatching] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/ayebi/watchlist?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d: { watching?: boolean }) => setWatching(d.watching ?? false))
      .catch(() => setWatching(false));
  }, [slug]);

  async function toggle() {
    setLoading(true);
    const res = await fetch("/api/ayebi/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (res.status === 401) {
      window.location.href = `/ayebi/connexion?redirect=/ayebi/${slug}`;
      return;
    }
    const data = (await res.json()) as { watching?: boolean };
    setWatching(data.watching ?? false);
    setLoading(false);
  }

  if (watching === null) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`ayeba-ghost px-3 py-1.5 text-xs ${watching ? "border-[var(--accent)] text-[var(--accent)]" : ""}`}
    >
      {loading ? "…" : watching ? "★ Suivi" : "☆ Suivre"}
    </button>
  );
}
