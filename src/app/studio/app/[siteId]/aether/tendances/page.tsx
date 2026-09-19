"use client";
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { BarChart, DataTable, ModuleNav, SectionTitle } from "@/components/studio/ui";
import { AETHER_NAV } from "@/components/studio/aether-nav";
import type { StudioSite } from "@/lib/studio/types";

type Trends = {
  domainQueries: Array<{ query: string; impressions: number; clicks: number; ctr: number }>;
  rising: Array<{ query: string; current: number; previous: number; growth: number }>;
  global: Array<{ query: string; searches: number; growth: number }>;
  querySeries: Array<{ day: string; searches: number; impressions: number }>;
  query: string;
  site: StudioSite;
};

export default function AetherTendancesPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Trends | null>(null);
  const [days, setDays] = useState(30);
  const [queryInput, setQueryInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  const load = useCallback(async (q?: string) => {
    if (!siteId) return;
    const res = await fetch(
      `/api/studio/aether/${siteId}/trends?days=${days}${q ? `&query=${encodeURIComponent(q)}` : ""}`,
    );
    if (res.ok) setData(await res.json());
  }, [siteId, days]);

  useEffect(() => { if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/aether/tendances`); }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(activeQuery); }, [user, load, activeQuery]);

  const explore = (e: FormEvent) => {
    e.preventDefault();
    setActiveQuery(queryInput.trim());
  };

  if (!data) {
    return <StudioAppShell siteId={siteId}><p className="text-sm text-[var(--muted)]">Chargement…</p></StudioAppShell>;
  }

  return (
    <StudioAppShell siteId={siteId} siteDomain={data.site.domain}>
      <ModuleNav siteId={siteId} module="aether" items={AETHER_NAV} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Aether · Tendances</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Tendances de recherche Ayeba
          </h1>
        </div>
        <select className="ayeba-input h-9 px-2 text-xs" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 14, 30, 90].map((d) => <option key={d} value={d}>{d} jours</option>)}
        </select>
      </div>

      <form onSubmit={explore} className="ayeba-panel mt-8 flex flex-col gap-3 p-5 sm:flex-row">
        <input
          className="ayeba-input h-11 flex-1 px-3 text-sm"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="Explorer l'intérêt d'une requête (ex : économie, football…)"
        />
        <button type="submit" className="ayeba-cta h-11 px-5 text-xs">Explorer</button>
      </form>

      {activeQuery && data.querySeries.length ? (
        <section className="mt-8">
          <SectionTitle title={`Intérêt pour "${activeQuery}" · ${days}j`} />
          <div className="ayeba-panel mt-4 p-5">
            <BarChart points={data.querySeries.map((s) => ({ label: s.day.slice(5), value: s.searches }))} height={140} />
            <p className="mt-3 text-center text-xs text-[var(--muted)]">
              Recherches réelles des utilisateurs Ayeba par jour
            </p>
          </div>
        </section>
      ) : null}
      {activeQuery && !data.querySeries.length ? (
        <p className="mt-6 text-sm text-[var(--muted)]">Aucune recherche enregistrée pour « {activeQuery} » sur la période.</p>
      ) : null}

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <SectionTitle title="Requêtes qui affichent votre site" />
          <div className="mt-4">
            <DataTable
              columns={["Requête", "Impressions", "Clics", "CTR"]}
              rows={data.domainQueries.map((r) => [
                <span key="q" className="font-medium text-[var(--ink)]">{r.query}</span>,
                String(r.impressions), String(r.clicks), `${r.ctr}%`,
              ])}
              empty="Votre site n'apparaît dans aucune requête pour l'instant"
            />
          </div>
        </div>
        <div>
          <SectionTitle title="Requêtes en hausse pour votre site" />
          <div className="mt-4">
            <DataTable
              columns={["Requête", "14j", "14j préc.", "Évolution"]}
              rows={data.rising.map((r) => [
                <span key="q" className="font-medium text-[var(--ink)]">{r.query}</span>,
                String(r.current), String(r.previous),
                <span key="g" className={r.growth >= 50 ? "text-[var(--accent)]" : "text-[var(--muted)]"}>
                  {r.growth >= 100 && r.previous === 0 ? "Nouveau" : `${r.growth > 0 ? "+" : ""}${r.growth}%`}
                </span>,
              ])}
              empty="Pas assez de données pour détecter une tendance"
            />
          </div>
          <div className="mt-8">
            <SectionTitle title="Tendances Ayeba (tous sites)" />
            <div className="mt-4">
              <DataTable
                columns={["Requête", "Recherches 7j", "Évolution"]}
                rows={data.global.map((r) => [
                  <button key="q" type="button" className="font-medium text-[var(--ink)] hover:underline" onClick={() => { setQueryInput(r.query); setActiveQuery(r.query); }}>
                    {r.query}
                  </button>,
                  String(r.searches),
                  <span key="g" className={r.growth >= 50 ? "text-[var(--accent)]" : "text-[var(--muted)]"}>
                    {r.growth > 0 ? "+" : ""}{r.growth}%
                  </span>,
                ])}
                empty="Aucune recherche enregistrée cette semaine"
              />
            </div>
          </div>
        </div>
      </section>
    </StudioAppShell>
  );
}
