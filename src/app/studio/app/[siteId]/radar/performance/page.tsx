"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { BarChart, DataTable, Metric, MetricGrid, SectionTitle } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type Dim = "query" | "url" | "country" | "device" | "page_query";
const DIMS: Array<[Dim, string]> = [
  ["query", "Requêtes"],
  ["url", "Pages"],
  ["page_query", "Page × requête"],
  ["country", "Pays"],
  ["device", "Appareils"],
];

type Totals = { impressions: number; clicks: number; ctr: number; position: number | null };
type BreakdownRow = {
  label: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number | null;
  query?: string;
  url?: string;
};
type CrossRow = {
  query: string;
  url: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number | null;
};
type PerfData = {
  totals: Totals;
  compare: {
    previous: Totals;
    delta: {
      clicks: number;
      clicksPct: number | null;
      impressions: number;
      impressionsPct: number | null;
      ctr: number;
      position: number | null;
    };
  };
  series: Array<{ day: string; impressions: number; clicks: number; ctr: number; position: number | null }>;
  breakdown: BreakdownRow[];
  pageQuery?: CrossRow[] | null;
  site: StudioSite;
};

function deltaLabel(abs: number, pct: number | null, invertGood = false) {
  const sign = abs > 0 ? "+" : "";
  const tone =
    abs === 0 ? "text-[var(--muted)]" : (abs > 0) !== invertGood ? "text-emerald-400" : "text-rose-400";
  return (
    <span className={`text-xs ${tone}`}>
      {sign}
      {abs}
      {pct != null ? ` (${sign}${pct}%)` : ""} vs préc.
    </span>
  );
}

export default function RadarPerformancePage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<PerfData | null>(null);
  const [dim, setDim] = useState<Dim>("query");
  const [days, setDays] = useState(28);
  const [metric, setMetric] = useState<"clicks" | "impressions">("clicks");
  const [filterQuery, setFilterQuery] = useState("");
  const [filterPage, setFilterPage] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [appliedPage, setAppliedPage] = useState("");

  const load = useCallback(async () => {
    if (!siteId) return;
    const params = new URLSearchParams({ days: String(days), dim });
    if (appliedQuery.trim()) params.set("query", appliedQuery.trim());
    if (appliedPage.trim()) params.set("page", appliedPage.trim());
    const res = await fetch(`/api/studio/radar/${siteId}/performance?${params}`);
    if (res.ok) setData(await res.json());
  }, [siteId, days, dim, appliedQuery, appliedPage]);

  useEffect(() => {
    if (ready && !user)
      router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/radar/performance`);
  }, [ready, user, router, siteId]);
  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  function applyFilters(e?: FormEvent) {
    e?.preventDefault();
    setAppliedQuery(filterQuery);
    setAppliedPage(filterPage);
  }

  function exportCsv() {
    const params = new URLSearchParams({ days: String(days), dim, format: "csv" });
    if (appliedQuery.trim()) params.set("query", appliedQuery.trim());
    if (appliedPage.trim()) params.set("page", appliedPage.trim());
    window.open(`/api/studio/radar/${siteId}/performance?${params}`, "_blank");
  }

  if (!data) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--muted)]">Chargement…</p>
      </StudioAppShell>
    );
  }
  const t = data.totals;
  const d = data.compare?.delta;
  const crossRows =
    dim === "page_query"
      ? data.pageQuery ||
        data.breakdown.map((r) => ({
          query: r.query || r.label.split(" · ")[0] || "",
          url: r.url || r.label.split(" · ").slice(1).join(" · ") || "",
          impressions: r.impressions,
          clicks: r.clicks,
          ctr: r.ctr,
          position: r.position,
        }))
      : data.pageQuery || [];

  return (
    <StudioAppShell siteId={siteId} siteDomain={data.site.domain}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Radar · Performance</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Résultats de recherche Ayeba
          </h1>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Comparaison vs les {days} jours précédents · croisement page × requête · export CSV
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="ayeba-input h-9 px-2 text-xs"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[7, 14, 28, 90].map((d) => (
              <option key={d} value={d}>
                {d} jours
              </option>
            ))}
          </select>
          <button type="button" className="ayeba-ghost h-9 px-3 text-xs" onClick={exportCsv}>
            Exporter CSV
          </button>
        </div>
      </div>

      <div className="mt-8">
        <MetricGrid>
          <Metric
            label="Clics"
            value={String(t.clicks)}
            hint={d ? deltaLabel(d.clicks, d.clicksPct) : undefined}
          />
          <Metric
            label="Impressions"
            value={String(t.impressions)}
            hint={d ? deltaLabel(d.impressions, d.impressionsPct) : undefined}
          />
          <Metric
            label="CTR moyen"
            value={`${t.ctr}%`}
            hint={
              d ? (
                <span className={`text-xs ${d.ctr >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {d.ctr >= 0 ? "+" : ""}
                  {d.ctr} pts vs préc.
                </span>
              ) : undefined
            }
          />
          <Metric
            label="Position moyenne"
            value={t.position != null ? String(t.position) : "—"}
            hint={d?.position != null ? deltaLabel(d.position, null, true) : undefined}
          />
        </MetricGrid>
      </div>

      <form
        onSubmit={applyFilters}
        className="ayeba-panel mt-8 flex flex-wrap items-end gap-3 p-4"
      >
        <label className="flex min-w-[160px] flex-1 flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]">
            Filtrer requête
          </span>
          <input
            className="ayeba-input h-9 px-3 text-sm"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="ex. ayeba studio"
          />
        </label>
        <label className="flex min-w-[160px] flex-1 flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]">
            Filtrer page
          </span>
          <input
            className="ayeba-input h-9 px-3 text-sm"
            value={filterPage}
            onChange={(e) => setFilterPage(e.target.value)}
            placeholder="/blog/…"
          />
        </label>
        <button type="submit" className="ayeba-ghost h-9 px-4 text-xs">
          Appliquer
        </button>
        {appliedQuery || appliedPage ? (
          <button
            type="button"
            className="ayeba-ghost h-9 px-3 text-xs"
            onClick={() => {
              setFilterQuery("");
              setFilterPage("");
              setAppliedQuery("");
              setAppliedPage("");
            }}
          >
            Effacer
          </button>
        ) : null}
      </form>

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
            points={data.series.map((s) => ({
              label: s.day.slice(5),
              value: metric === "clicks" ? s.clicks : s.impressions,
            }))}
            height={140}
          />
          {!data.series.length ? (
            <p className="mt-3 text-center text-xs text-[var(--muted)]">
              Aucune impression de recherche — vos pages apparaîtront ici quand Ayeba les affichera
              dans ses résultats.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)]">
          <div className="flex flex-wrap gap-1">
            {DIMS.map(([dKey, label]) => (
              <button
                key={dKey}
                type="button"
                className={`px-4 py-2 text-xs ${dim === dKey ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}
                style={dim === dKey ? { boxShadow: "inset 0 -2px 0 var(--accent)" } : undefined}
                onClick={() => setDim(dKey)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          {dim === "page_query" ? (
            <DataTable
              columns={["Requête", "Page", "Clics", "Impressions", "CTR", "Position"]}
              rows={crossRows.map((r) => [
                <span key="q" className="block max-w-[200px] truncate" title={r.query}>
                  {r.query}
                </span>,
                <span key="u" className="block max-w-[240px] truncate" title={r.url}>
                  {r.url}
                </span>,
                String(r.clicks),
                String(r.impressions),
                `${r.ctr}%`,
                r.position != null ? String(r.position) : "—",
              ])}
              empty="Aucun croisement page × requête — les lignes radar_daily avec query et url apparaîtront ici"
            />
          ) : (
            <DataTable
              columns={[
                dim === "query"
                  ? "Requête"
                  : dim === "url"
                    ? "Page"
                    : dim === "country"
                      ? "Pays"
                      : "Appareil",
                "Clics",
                "Impressions",
                "CTR",
                "Position",
              ]}
              rows={data.breakdown.map((r) => [
                <span key="l" className="block max-w-[320px] truncate" title={r.label}>
                  {r.label}
                </span>,
                String(r.clicks),
                String(r.impressions),
                `${r.ctr}%`,
                r.position != null ? String(r.position) : "—",
              ])}
              empty={
                dim === "country" || dim === "device"
                  ? "Dimension collectée depuis les nouvelles recherches — aucune donnée pour l'instant"
                  : "Aucune donnée"
              }
            />
          )}
        </div>
      </section>
    </StudioAppShell>
  );
}
