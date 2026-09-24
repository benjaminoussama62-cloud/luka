"use client";
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { BarChart, DataTable, SectionTitle } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type AcquisitionData = {
  acquisition: {
    channels: Array<{ channel: string; sessions: number; pageviews: number }>;
    referrers: Array<{ referrer: string; sessions: number; pageviews: number; avg_duration: number }>;
    campaigns: Array<{ source: string; medium: string; campaign: string; sessions: number; pageviews: number }>;
    touchpoints: Array<{ type: string; source: string; medium: string; interactions: number }>;
  };
  site: StudioSite;
};

export default function TraceAcquisitionPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AcquisitionData | null>(null);
  const [days, setDays] = useState(28);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/trace/${siteId}/analytics?section=acquisition&days=${days}`);
    if (res.ok) setData(await res.json());
  }, [siteId, days]);

  useEffect(() => { if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/trace/acquisition`); }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  if (!data) {
    return <StudioAppShell siteId={siteId}><p className="text-sm text-[var(--muted)]">Chargement…</p></StudioAppShell>;
  }
  const a = data.acquisition;

  return (
    <StudioAppShell siteId={siteId} siteDomain={data.site.domain}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Trace · Acquisition</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            D'où viennent vos visiteurs
          </h1>
        </div>
        <select className="ayeba-input h-9 px-2 text-xs" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 14, 28, 90].map((d) => <option key={d} value={d}>{d} jours</option>)}
        </select>
      </div>

      <section className="mt-10">
        <SectionTitle title="Canaux" />
        <div className="ayeba-panel mt-4 p-5">
          <BarChart points={a.channels.map((c) => ({ label: c.channel, value: c.sessions }))} height={140} />
          {!a.channels.length ? <p className="mt-3 text-center text-xs text-[var(--muted)]">Aucune session</p> : null}
          <div className="mt-4">
            <DataTable
              columns={["Canal", "Sessions", "Pages vues"]}
              rows={a.channels.map((c) => [c.channel, String(c.sessions), String(c.pageviews)])}
              empty=""
            />
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <SectionTitle title="Sites référents" />
          <div className="mt-4">
            <DataTable
              columns={["Source", "Sessions", "Pages", "Durée moy."]}
              rows={a.referrers.map((r) => [
                <span key="r" className="block max-w-[220px] truncate" title={r.referrer}>{r.referrer}</span>,
                String(r.sessions), String(r.pageviews), `${Math.round(r.avg_duration)} s`,
              ])}
              empty="Aucun referrer — tout le trafic est direct"
            />
          </div>
        </div>
        <div>
          <SectionTitle title="Campagnes UTM" />
          <div className="mt-4">
            <DataTable
              columns={["Campagne", "Source / Support", "Sessions"]}
              rows={a.campaigns.map((c) => [
                c.campaign, `${c.source || "—"} / ${c.medium || "—"}`, String(c.sessions),
              ])}
              empty="Aucune campagne UTM détectée"
            />
          </div>
          <div className="mt-8">
            <SectionTitle title="Points de contact (attribution)" />
            <div className="mt-4">
              <DataTable
                columns={["Type", "Source / Support", "Interactions"]}
                rows={a.touchpoints.map((t) => [t.type, `${t.source}/${t.medium}`, String(t.interactions)])}
                empty="Aucun point de contact"
              />
            </div>
          </div>
        </div>
      </section>
    </StudioAppShell>
  );
}
