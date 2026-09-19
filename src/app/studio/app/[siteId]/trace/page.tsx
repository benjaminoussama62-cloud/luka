"use client";
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { BarChart, DataTable, Metric, MetricGrid, ModuleNav, SectionTitle } from "@/components/studio/ui";
import { TRACE_NAV } from "@/components/studio/trace-nav";
import type { StudioSite } from "@/lib/studio/types";

type OverviewData = {
  totals: {
    sessions: number; pageviews: number; users: number; newUsers: number;
    avgSessionDurationSec: number; bounceRate: number; pagesPerSession: number;
  };
  daily: Array<{ day: string; sessions: number; pageviews: number }>;
  realtime: {
    activeUsers: number; pageviews: number;
    topPages: Array<{ path: string; views: number }>;
    topReferrers: Array<{ referrer: string; sessions: number }>;
  };
  site: StudioSite;
};

export default function StudioTracePage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);
  const [days, setDays] = useState(28);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/trace/${siteId}/analytics?section=overview&days=${days}`);
    if (res.ok) setData(await res.json());
  }, [siteId, days]);

  useEffect(() => {
    if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/trace`);
  }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);
  useEffect(() => {
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  if (!data) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--muted)]">Chargement Trace…</p>
      </StudioAppShell>
    );
  }

  const { totals, daily, realtime, site } = data;
  const fmtDur = (s: number) => s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`;

  return (
    <StudioAppShell siteId={siteId} siteDomain={site.domain}>
      <ModuleNav siteId={siteId} module="trace" items={TRACE_NAV} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Trace · Analytics</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-[clamp(2rem,5vw,3.2rem)] font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Vue d'ensemble
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="ayeba-input h-9 px-2 text-xs"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[7, 14, 28, 90].map((d) => <option key={d} value={d}>{d} jours</option>)}
          </select>
          <button type="button" className="ayeba-ghost px-3 py-2 text-xs" onClick={() => void load()}>Actualiser</button>
        </div>
      </div>

      {/* Temps réel */}
      <section className="ayeba-panel mt-8 flex flex-wrap items-center gap-6 p-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">Temps réel</p>
          <p className="mt-1 font-[family-name:var(--font-brand)] text-4xl text-[var(--accent)]">
            {realtime.activeUsers}
          </p>
          <p className="text-xs text-[var(--muted)]">utilisateurs actifs (30 min)</p>
        </div>
        <div className="min-w-[200px] flex-1">
          <p className="mb-2 text-xs text-[var(--muted)]">Pages actives</p>
          {(realtime.topPages || []).slice(0, 5).map((p) => (
            <div key={p.path} className="flex justify-between text-xs">
              <span className="truncate text-[var(--ink)]">{p.path}</span>
              <span className="text-[var(--muted)]">{p.views}</span>
            </div>
          ))}
          {!realtime.topPages?.length ? <p className="text-xs text-[var(--faint)]">Aucune activité récente</p> : null}
        </div>
      </section>

      <div className="mt-8">
        <MetricGrid>
          <Metric label="Utilisateurs" value={String(totals.users)} hint={`${totals.newUsers} nouveaux`} />
          <Metric label="Sessions" value={String(totals.sessions)} />
          <Metric label="Pages vues" value={String(totals.pageviews)} hint={`${totals.pagesPerSession} / session`} />
          <Metric label="Durée moyenne" value={fmtDur(totals.avgSessionDurationSec)} />
          <Metric label="Taux de rebond" value={`${totals.bounceRate}%`} />
        </MetricGrid>
      </div>

      <section className="mt-10">
        <SectionTitle title={`Sessions par jour · ${days}j`} />
        <div className="ayeba-panel mt-4 p-5">
          <BarChart points={daily.map((d) => ({ label: d.day.slice(5), value: d.sessions }))} height={140} />
          {!daily.length ? <p className="mt-3 text-center text-xs text-[var(--muted)]">Aucune session collectée — installez le snippet Trace (onglet Balises).</p> : null}
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <SectionTitle title="Top pages (30 min)" />
          <div className="mt-4">
            <DataTable
              columns={["Page", "Vues"]}
              rows={(realtime.topPages || []).map((p) => [p.path, String(p.views)])}
              empty="Aucune donnée temps réel"
            />
          </div>
        </div>
        <div>
          <SectionTitle title="Top sources (30 min)" />
          <div className="mt-4">
            <DataTable
              columns={["Source", "Sessions"]}
              rows={(realtime.topReferrers || []).map((r) => [r.referrer || "direct", String(r.sessions)])}
              empty="Aucune source"
            />
          </div>
        </div>
      </section>
    </StudioAppShell>
  );
}
