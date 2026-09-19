"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { BarChart, DataTable, Metric, MetricGrid, ModuleNav, SectionTitle } from "@/components/studio/ui";
import { TRACE_NAV } from "@/components/studio/trace-nav";
import type { StudioSite } from "@/lib/studio/types";

type Breakdown = Array<{ label: string; sessions: number; pageviews: number; bounce_rate: number }>;
type AudienceData = {
  audience: {
    devices: Breakdown; browsers: Breakdown; os: Breakdown;
    countries: Breakdown; cities: Breakdown; languages: Breakdown;
    screenResolutions: Breakdown;
    hourly: Array<{ hour: number; sessions: number }>;
    newVsReturning: { new: number; returning: number };
  };
  site: StudioSite;
};

function Table({ title, rows }: { title: string; rows: Breakdown }) {
  return (
    <div>
      <SectionTitle title={title} />
      <div className="mt-4">
        <DataTable
          columns={["", "Sessions", "Pages vues", "Rebond"]}
          rows={rows.map((r) => [r.label || "—", String(r.sessions), String(r.pageviews), `${Math.round(r.bounce_rate)}%`])}
          empty="Aucune donnée"
        />
      </div>
    </div>
  );
}

export default function TraceAudiencePage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AudienceData | null>(null);
  const [days, setDays] = useState(28);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/trace/${siteId}/analytics?section=audience&days=${days}`);
    if (res.ok) setData(await res.json());
  }, [siteId, days]);

  useEffect(() => { if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/trace/audience`); }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  if (!data) {
    return <StudioAppShell siteId={siteId}><p className="text-sm text-[var(--muted)]">Chargement…</p></StudioAppShell>;
  }
  const a = data.audience;

  return (
    <StudioAppShell siteId={siteId} siteDomain={data.site.domain}>
      <ModuleNav siteId={siteId} module="trace" items={TRACE_NAV} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Trace · Audience</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Qui visite votre site
          </h1>
        </div>
        <select className="ayeba-input h-9 px-2 text-xs" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 14, 28, 90].map((d) => <option key={d} value={d}>{d} jours</option>)}
        </select>
      </div>

      <div className="mt-8">
        <MetricGrid>
          <Metric label="Nouveaux visiteurs" value={String(a.newVsReturning.new)} />
          <Metric label="Visiteurs récurrents" value={String(a.newVsReturning.returning)} />
          <Metric
            label="Fidélité"
            value={
              a.newVsReturning.new + a.newVsReturning.returning > 0
                ? `${Math.round((a.newVsReturning.returning / (a.newVsReturning.new + a.newVsReturning.returning)) * 100)}%`
                : "—"
            }
            hint="part de visiteurs revenus"
          />
        </MetricGrid>
      </div>

      <section className="mt-10">
        <SectionTitle title="Sessions par heure (UTC)" />
        <div className="ayeba-panel mt-4 p-5">
          <BarChart points={a.hourly.map((h) => ({ label: `${h.hour}h`, value: h.sessions }))} height={120} />
          {!a.hourly.length ? <p className="mt-3 text-center text-xs text-[var(--muted)]">Aucune session</p> : null}
        </div>
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <Table title="Appareils" rows={a.devices} />
        <Table title="Pays" rows={a.countries} />
        <Table title="Villes" rows={a.cities} />
        <Table title="Navigateurs" rows={a.browsers} />
        <Table title="Systèmes" rows={a.os} />
        <Table title="Langues" rows={a.languages} />
      </section>
    </StudioAppShell>
  );
}
