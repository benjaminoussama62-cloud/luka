"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import type { StudioSite } from "@/lib/studio/types";

export default function StudioAppHomePage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [sites, setSites] = useState<StudioSite[]>([]);
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && !user) {
      router.replace("/ayebi/connexion?redirect=/studio/app");
    }
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const res = await fetch("/api/studio/sites");
      if (!res.ok) return;
      const data = (await res.json()) as { sites: StudioSite[] };
      setSites(data.sites);
    })();
  }, [user]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/studio/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    const data = (await res.json()) as { site?: StudioSite; error?: string };
    setLoading(false);
    if (!res.ok || !data.site) {
      setError(data.error || "Impossible d’ajouter le site");
      return;
    }
    router.push(`/studio/app/${data.site.id}/verify`);
  }

  if (!ready || !user) {
    return (
      <StudioAppShell>
        <p className="text-sm text-[var(--muted)]">Chargement…</p>
      </StudioAppShell>
    );
  }

  return (
    <StudioAppShell>
      <p className="ayeba-kicker ayeba-kicker-accent">Sites</p>
      <h1 className="mt-2 font-[family-name:var(--font-brand)] text-[clamp(2rem,5vw,3rem)] font-semibold tracking-[-0.04em] text-[var(--ink)]">
        Vos propriétés
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
        Ajoutez un domaine, vérifiez que vous le contrôlez, puis ouvrez Radar pour voir l’indexation et
        les requêtes Ayeba.
      </p>

      <form onSubmit={onCreate} className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="exemple.com"
          className="ayeba-input h-12 flex-1 px-4 text-sm"
          required
        />
        <button type="submit" className="ayeba-cta h-12 px-6 text-sm" disabled={loading}>
          {loading ? "…" : "Ajouter"}
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}

      <ul className="mt-12 space-y-0 border-t border-[var(--line)]">
        {sites.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] py-5">
            <div>
              <p className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">{s.domain}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--faint)]">
                {s.status === "verified" ? "Vérifié" : "En attente de vérification"}
              </p>
            </div>
            <div className="flex gap-2">
              {s.status !== "verified" ? (
                <Link href={`/studio/app/${s.id}/verify`} className="ayeba-ghost px-3 py-2 text-xs">
                  Vérifier
                </Link>
              ) : null}
              <Link href={`/studio/app/${s.id}/radar`} className="ayeba-cta px-3 py-2 text-xs">
                Ouvrir Radar
              </Link>
            </div>
          </li>
        ))}
        {!sites.length ? (
          <li className="py-10 text-sm text-[var(--muted)]">Aucun site pour l’instant.</li>
        ) : null}
      </ul>
    </StudioAppShell>
  );
}
