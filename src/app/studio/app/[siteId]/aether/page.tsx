"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { ModuleNav } from "@/components/studio/ui";
import { AETHER_NAV } from "@/components/studio/aether-nav";
import type {
  AetherOverview,
  StudioSite,
} from "@/lib/studio/types";

type Insight = { title: string; detail: string; href: string; priority: "high" | "medium" | "low" };

export default function StudioAetherPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [overview, setOverview] = useState<AetherOverview | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);

  const load = useCallback(async () => {
    if (!siteId) return;
    const [o, i] = await Promise.all([
      fetch(`/api/studio/aether/${siteId}/overview`),
      fetch(`/api/studio/aether/${siteId}/insights`),
    ]);
    if (o.ok) {
      const data = (await o.json()) as { overview: AetherOverview; site: StudioSite };
      setOverview(data.overview);
      setSite(data.site);
    }
    if (i.ok) {
      const data = (await i.json()) as { insights: Insight[] };
      setInsights(data.insights || []);
    }
  }, [siteId]);

  useEffect(() => {
    if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/aether`);
  }, [ready, user, router, siteId]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (!site || !overview) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--muted)]">Chargement Aether…</p>
      </StudioAppShell>
    );
  }

  return (
    <StudioAppShell siteId={siteId} siteDomain={site.domain}>
      <ModuleNav siteId={siteId} module="aether" items={AETHER_NAV} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Aether</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-[clamp(2rem,5vw,3.2rem)] font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Copilote Studio
          </h1>
        </div>
        <button type="button" className="ayeba-ghost px-3 py-2 text-xs" onClick={() => void load()}>
          Actualiser
        </button>
      </div>

      <section className="mt-8 border-y border-[var(--line)] py-8">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">Priorité maintenant</p>
        <h2 className="mt-2 font-[family-name:var(--font-brand)] text-2xl text-[var(--ink)]">
          {overview.headline}
        </h2>
      </section>

      <section className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-5">
        {overview.signals.map((s) => (
          <div key={s.label}>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">{s.label}</p>
            <p className="mt-1 font-[family-name:var(--font-brand)] text-2xl text-[var(--ink)]">{s.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">
          3 actions à fort impact
        </h2>
        <ol className="mt-6 space-y-6">
          {overview.actions.map((a, i) => (
            <li key={a.id} className="border-l-2 border-[var(--accent)] pl-5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
                {i + 1} · {a.module} · {a.impact === "high" ? "Impact élevé" : "Impact moyen"}
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">
                {a.title}
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{a.detail}</p>
              <Link href={a.href} className="ayeba-cta mt-4 inline-flex h-10 items-center px-4 text-xs">
                Ouvrir
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {insights.length ? (
        <section className="mt-12">
          <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">
            Diagnostics sur vos données
          </h2>
          <ul className="mt-6 space-y-4">
            {insights.map((ins) => (
              <li key={ins.title} className="ayeba-panel flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
                    {ins.priority === "high" ? "Priorité haute" : "Priorité moyenne"}
                  </p>
                  <h3 className="mt-1 font-[family-name:var(--font-brand)] text-lg text-[var(--ink)]">{ins.title}</h3>
                  <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{ins.detail}</p>
                </div>
                <Link href={ins.href} className="ayeba-ghost shrink-0 px-3 py-2 text-xs">Ouvrir</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </StudioAppShell>
  );
}
