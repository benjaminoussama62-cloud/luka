"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { BarChart, DataTable, Metric, MetricGrid, SectionTitle } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type RealtimePayload = {
  site: StudioSite;
  realtime: {
    minutes: number;
    activeUsers: number;
    sessions: number;
    events: number;
    pageviews: number;
    conversions: number;
    byMinute: Array<{ minute: string; users: number; events: number }>;
    topPages: Array<{ path: string; views: number; activeUsers: number }>;
    topEvents: Array<{ event_type: string; count: number; sessions: number }>;
    topReferrers: Array<{ referrer: string; sessions: number }>;
    recentEvents: Array<{
      event_type: string;
      path: string;
      title: string | null;
      session_id: string;
      timestamp: string;
    }>;
    devices: Array<{ device: string; count: number }>;
  };
};

export default function TraceRealtimePage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<RealtimePayload | null>(null);
  const [minutes, setMinutes] = useState(30);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/trace/${siteId}/realtime?minutes=${minutes}`);
    if (res.ok) {
      setData(await res.json());
      setTick((t) => t + 1);
    }
  }, [siteId, minutes]);

  useEffect(() => {
    if (ready && !user) {
      router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/trace/temps-reel`);
    }
  }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);
  useEffect(() => {
    const t = setInterval(() => void load(), 15_000);
    return () => clearInterval(t);
  }, [load]);

  if (!data) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--muted)]">Chargement du temps réel…</p>
      </StudioAppShell>
    );
  }

  const r = data.realtime;
  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return iso;
    }
  };

  return (
    <StudioAppShell siteId={siteId} siteDomain={data.site.domain}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Trace · Temps réel</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Activité en direct
          </h1>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Données réelles · fenêtre {r.minutes} min · actualisation auto 15 s
            {tick > 0 ? ` · #${tick}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="ayeba-input h-9 px-2 text-xs"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          >
            {[15, 30, 60].map((m) => (
              <option key={m} value={m}>{m} minutes</option>
            ))}
          </select>
          <button type="button" className="ayeba-ghost px-3 py-2 text-xs" onClick={() => void load()}>
            Actualiser
          </button>
        </div>
      </div>

      <div className="mt-8">
        <MetricGrid>
          <Metric label="Utilisateurs actifs" value={String(r.activeUsers)} hint={`sessions distinctes · ${r.minutes} min`} />
          <Metric label="Sessions" value={String(r.sessions)} />
          <Metric label="Événements" value={String(r.events)} hint={`${r.pageviews} pages vues`} />
          <Metric label="Conversions" value={String(r.conversions)} />
        </MetricGrid>
      </div>

      <section className="mt-10">
        <SectionTitle title="Utilisateurs par minute" />
        <div className="ayeba-panel mt-4 p-5">
          <BarChart
            points={r.byMinute.map((m) => ({
              label: m.minute.slice(11, 16),
              value: m.users,
            }))}
            height={120}
          />
          {!r.byMinute.length ? (
            <p className="mt-3 text-center text-xs text-[var(--muted)]">
              Aucune activité dans la fenêtre — installez la balise Trace ou ouvrez votre site.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <SectionTitle title="Pages actives" />
          <div className="mt-4">
            <DataTable
              columns={["Page", "Vues", "Actifs"]}
              rows={r.topPages.map((p) => [p.path, String(p.views), String(p.activeUsers)])}
              empty="Aucune page vue récente"
            />
          </div>
        </div>
        <div>
          <SectionTitle title="Types d'événements" />
          <div className="mt-4">
            <DataTable
              columns={["Type", "Count", "Sessions"]}
              rows={r.topEvents.map((e) => [e.event_type, String(e.count), String(e.sessions)])}
              empty="Aucun événement"
            />
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <SectionTitle title="Sources" />
          <div className="mt-4">
            <DataTable
              columns={["Référent", "Sessions"]}
              rows={r.topReferrers.map((ref) => [ref.referrer, String(ref.sessions)])}
              empty="Aucune source"
            />
          </div>
        </div>
        <div>
          <SectionTitle title="Appareils" />
          <div className="mt-4">
            <DataTable
              columns={["Appareil", "Sessions"]}
              rows={r.devices.map((d) => [d.device, String(d.count)])}
              empty="Aucun appareil"
            />
          </div>
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle title="Flux d'événements" />
        <div className="mt-4">
          <DataTable
            columns={["Heure", "Type", "Page", "Session"]}
            rows={r.recentEvents.map((e) => [
              fmtTime(e.timestamp),
              e.event_type,
              e.path || "/",
              e.session_id.slice(0, 8),
            ])}
            empty="Aucun événement récent"
          />
        </div>
      </section>
    </StudioAppShell>
  );
}
