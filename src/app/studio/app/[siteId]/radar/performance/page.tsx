"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { BarChart, DataTable, Metric, MetricGrid, SectionTitle } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type Dim = "query" | "url" | "country" | "device";
const DIMS: Array<[Dim, string]> = [
  ["query", "Requêtes"], ["url", "Pages"], ["country", "Pays"], ["device", "Appareils"],
];

type PerfData = {
  totals: { impressions: number; clicks: number; ctr: number; position: number | null };
  series: Array<{ day: string; impressions: number; clicks: number; ctr: number; position: number | null }>;
  breakdown: Array<{ label: string; impressions: number; clicks: number; ctr: number; position: number | null }>;
  site: StudioSite;
};

export default function RadarPerformancePage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<PerfData | null>(null);
  const [dim, setDim] = useState<Dim>("query");
  const [days, setDays] = useState(28);
  const [metric, setMetric] = useState<"clicks" | "impressions">("clicks");

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/radar/${siteId}/performance?days=${days}&dim=${dim}`);
    if (res.ok) setData(await res.json());
  }, [siteId, days, dim]);

  useEffect(() => { if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/radar/performance`); }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  if (!data) {
    return <StudioAppShell siteId={siteId}><p className="text-sm text-[var(--muted)]">Chargement…</p></StudioAppShell>;
  }
  const t = data.totals;

  return (
    <StudioAppShell siteId={siteId} siteDomain={data.site.domain}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Radar · Performance</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Résultats de recherche Ayeba
          </h1>
        </div>
        <select className="ayeba-input h-9 px-2 text-xs" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 14, 28, 90].map((d) => <option key={d} value={d}>{d} jours</option>)}
        </select>
      </div>

      <div className="mt-8">
        <MetricGrid>
          <Metric label="Clics" value={String(t.clicks)} />
          <Metric label="Impressions" value={String(t.impressions)} />
          <Metric label="CTR moyen" value={`${t.ctr}%`} />
          <Metric label="Position moyenne" value={t.position != null ? String(t.position) : "—"} />
        </MetricGrid>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <SectionTitle title={`Évolution · ${days}j`} />
          <div className="flex gap-1">
            {(["clicks", "impressions"] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`px-3 py-1.5 text-xs ${metric === m ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
                onClick={() => setMetric(m)}
              >
                {m === "clicks" ? "Clics" : "Impressions"}
              </button>
            ))}
          </div>
        </div>
        <div className="ayeba-panel mt-4 p-5">
          <BarChart
            points={data.series.map((s) => ({ label: s.day.slice(5), value: metric === "clicks" ? s.clicks : s.impressions }))}
            height={140}
          />
          {!data.series.length ? (
            <p className="mt-3 text-center text-xs text-[var(--muted)]">
              Aucune impression de recherche — vos pages apparaîtront ici quand Ayeba les affichera dans ses résultats.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap gap-1 border-b border-[var(--line)]">
          {DIMS.map(([d, label]) => (
            <button
              key={d}
              type="button"
              className={`px-4 py-2 text-xs ${dim === d ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}
              style={dim === d ? { boxShadow: "inset 0 -2px 0 var(--accent)" } : undefined}
              onClick={() => setDim(d)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <DataTable
            columns={[
              dim === "query" ? "Requête" : dim === "url" ? "Page" : dim === "country" ? "Pays" : "Appareil",
              "Clics", "Impressions", "CTR", "Position",
            ]}
            rows={data.breakdown.map((r) => [
              <span key="l" className="block max-w-[320px] truncate" title={r.label}>{r.label}</span>,
              String(r.clicks), String(r.impressions), `${r.ctr}%`,
              r.position != null ? String(r.position) : "—",
            ])}
            empty={
              dim === "country" || dim === "device"
                ? "Dimension collectée depuis les nouvelles recherches — aucune donnée pour l'instant"
                : "Aucune donnée"
            }
          />
        </div>
      </section>
    </StudioAppShell>
  );
}
