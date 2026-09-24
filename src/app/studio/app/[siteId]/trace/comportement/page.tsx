"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { DataTable, SectionTitle } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type BehaviorData = {
  behavior: {
    pages: Array<{ path: string; pageviews: number; sessions: number; avg_duration_ms: number; avg_scroll: number }>;
    entryPages: Array<{ path: string; sessions: number; bounce_rate: number }>;
    exitPages: Array<{ path: string; exits: number }>;
    eventTypes: Array<{ type: string; count: number }>;
  };
  site: StudioSite;
};

export default function TraceComportementPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<BehaviorData | null>(null);
  const [days, setDays] = useState(28);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/trace/${siteId}/analytics?section=behavior&days=${days}`);
    if (res.ok) setData(await res.json());
  }, [siteId, days]);

  useEffect(() => { if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/trace/comportement`); }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  if (!data) {
    return <StudioAppShell siteId={siteId}><p className="text-sm text-[var(--muted)]">Chargement…</p></StudioAppShell>;
  }
  const b = data.behavior;

  return (
    <StudioAppShell siteId={siteId} siteDomain={data.site.domain}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Trace · Comportement</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Ce que font vos visiteurs
          </h1>
        </div>
        <select className="ayeba-input h-9 px-2 text-xs" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 14, 28, 90].map((d) => <option key={d} value={d}>{d} jours</option>)}
        </select>
      </div>

      <section className="mt-10">
        <SectionTitle title="Pages" />
        <div className="mt-4">
          <DataTable
            columns={["Page", "Vues", "Sessions", "Temps moy.", "Scroll moy."]}
            rows={b.pages.map((p) => [
              <span key="p" className="block max-w-[260px] truncate" title={p.path}>{p.path}</span>,
              String(p.pageviews), String(p.sessions),
              `${Math.round((p.avg_duration_ms || 0) / 1000)} s`,
              `${Math.round(p.avg_scroll || 0)}%`,
            ])}
            empty="Aucune page enregistrée"
          />
        </div>
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <SectionTitle title="Pages d'entrée" />
          <div className="mt-4">
            <DataTable
              columns={["Page", "Sessions", "Rebond"]}
              rows={b.entryPages.map((p) => [p.path, String(p.sessions), `${Math.round(p.bounce_rate)}%`])}
              empty="Aucune donnée"
            />
          </div>
        </div>
        <div>
          <SectionTitle title="Pages de sortie" />
          <div className="mt-4">
            <DataTable
              columns={["Page", "Sorties"]}
              rows={b.exitPages.map((p) => [p.path, String(p.exits)])}
              empty="Aucune donnée"
            />
          </div>
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle title="Types d'événements" />
        <div className="mt-4 max-w-lg">
          <DataTable
            columns={["Événement", "Occurrences"]}
            rows={b.eventTypes.map((e) => [e.type, String(e.count)])}
            empty="Aucun événement"
          />
        </div>
      </section>
    </StudioAppShell>
  );
}
