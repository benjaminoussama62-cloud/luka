"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { DataTable, Metric, MetricGrid, ModuleNav, SectionTitle } from "@/components/studio/ui";
import { TRACE_NAV } from "@/components/studio/trace-nav";
import type { StudioSite } from "@/lib/studio/types";

type ConvData = {
  conversions: {
    funnel: Array<{ step: string; users: number; rate: number }>;
    attributed: { conversions: number; value: number };
  };
  site: StudioSite;
};

export default function TraceConversionsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ConvData | null>(null);
  const [days, setDays] = useState(28);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/trace/${siteId}/analytics?section=conversions&days=${days}`);
    if (res.ok) setData(await res.json());
  }, [siteId, days]);

  useEffect(() => { if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/trace/conversions`); }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  if (!data) {
    return <StudioAppShell siteId={siteId}><p className="text-sm text-[var(--muted)]">Chargement…</p></StudioAppShell>;
  }
  const c = data.conversions;
  const maxUsers = Math.max(1, ...c.funnel.map((f) => f.users));

  return (
    <StudioAppShell siteId={siteId} siteDomain={data.site.domain}>
      <ModuleNav siteId={siteId} module="trace" items={TRACE_NAV} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Trace · Conversions</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Entonnoir & conversions
          </h1>
        </div>
        <select className="ayeba-input h-9 px-2 text-xs" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 14, 28, 90].map((d) => <option key={d} value={d}>{d} jours</option>)}
        </select>
      </div>

      <div className="mt-8">
        <MetricGrid>
          <Metric label="Conversions attribuées" value={String(c.attributed.conversions)} />
          <Metric label="Valeur totale" value={String(c.attributed.value)} hint="points de contact convertis" />
        </MetricGrid>
      </div>

      <section className="mt-10">
        <SectionTitle title="Entonnoir d'engagement" />
        <div className="ayeba-panel mt-4 space-y-3 p-6">
          {c.funnel.map((f) => (
            <div key={f.step} className="flex items-center gap-4">
              <span className="w-36 shrink-0 text-sm text-[var(--ink)]">{f.step}</span>
              <div className="h-6 flex-1 rounded-sm bg-[var(--line)]">
                <div
                  className="h-full rounded-sm bg-[var(--accent)] opacity-80 transition-all"
                  style={{ width: `${Math.max(1, (f.users / maxUsers) * 100)}%` }}
                />
              </div>
              <span className="w-28 shrink-0 text-right text-sm text-[var(--muted)]">
                {f.users} <span className="text-[var(--faint)]">({f.rate}%)</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle title="Détail" />
        <div className="mt-4 max-w-2xl">
          <DataTable
            columns={["Étape", "Utilisateurs", "Taux"]}
            rows={c.funnel.map((f) => [f.step, String(f.users), `${f.rate}%`])}
            empty="Aucune donnée"
          />
        </div>
      </section>
    </StudioAppShell>
  );
}
