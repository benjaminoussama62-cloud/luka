"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { DataTable, Metric, MetricGrid, SectionTitle } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type Links = {
  totals: { internal: number; inbound: number; outbound: number };
  topInternal: Array<{ url: string; count: number }>;
  topExternal: Array<{ domain: string; count: number; pages: number }>;
  topOutbound: Array<{ domain: string; count: number }>;
};

export default function RadarLiensPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [links, setLinks] = useState<Links | null>(null);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/radar/${siteId}/links`);
    if (res.ok) { const d = await res.json(); setSite(d.site); setLinks(d.links); }
  }, [siteId]);

  useEffect(() => { if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/radar/liens`); }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  if (!links) {
    return <StudioAppShell siteId={siteId}><p className="text-sm text-[var(--muted)]">Chargement…</p></StudioAppShell>;
  }
  const t = links.totals;

  return (
    <StudioAppShell siteId={siteId} siteDomain={site?.domain}>
      <div>
        <p className="ayeba-kicker ayeba-kicker-accent">Radar · Liens</p>
        <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          Graphe de liens
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Liens réels découverts par le crawler Ayeba pendant l&apos;indexation des pages.
        </p>
      </div>

      <div className="mt-8">
        <MetricGrid>
          <Metric label="Liens internes" value={String(t.internal)} />
          <Metric label="Backlinks entrants" value={String(t.inbound)} hint="depuis d'autres domaines" />
          <Metric label="Liens sortants" value={String(t.outbound)} />
        </MetricGrid>
      </div>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <SectionTitle title="Pages les plus liées en interne" />
          <div className="mt-4">
            <DataTable
              columns={["Page cible", "Liens internes"]}
              rows={links.topInternal.map((r) => [
                <span key="u" className="block max-w-[280px] truncate" title={r.url}>{r.url}</span>,
                String(r.count),
              ])}
              empty="Aucun lien interne découvert — le crawler enregistrera les liens au prochain crawl"
            />
          </div>
        </div>
        <div>
          <SectionTitle title="Domaines qui pointent vers vous" />
          <div className="mt-4">
            <DataTable
              columns={["Domaine source", "Liens", "Pages ciblées"]}
              rows={links.topExternal.map((r) => [r.domain, String(r.count), String(r.pages)])}
              empty="Aucun backlink découvert pour l'instant"
            />
          </div>
          <div className="mt-8">
            <SectionTitle title="Domaines que vous liez" />
            <div className="mt-4">
              <DataTable
                columns={["Domaine cible", "Liens sortants"]}
                rows={links.topOutbound.map((r) => [r.domain, String(r.count)])}
                empty="Aucun lien sortant découvert"
              />
            </div>
          </div>
        </div>
      </section>
    </StudioAppShell>
  );
}
