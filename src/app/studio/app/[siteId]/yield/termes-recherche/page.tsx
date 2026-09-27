"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { DataTable, Metric, MetricGrid, SectionTitle } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type Term = {
  query: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
};

export default function YieldTermesRecherchePage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/yield/${siteId}/search-terms?days=${days}`);
    if (res.ok) {
      const d = await res.json();
      setSite(d.site);
      setTerms(d.terms || []);
    }
  }, [siteId, days]);

  useEffect(() => {
    if (ready && !user)
      router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/yield/termes-recherche`);
  }, [ready, user, router, siteId]);
  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const totals = terms.reduce(
    (a, t) => ({
      impressions: a.impressions + t.impressions,
      clicks: a.clicks + t.clicks,
      cost: a.cost + t.cost,
      conversions: a.conversions + t.conversions,
    }),
    { impressions: 0, clicks: 0, cost: 0, conversions: 0 },
  );

  return (
    <StudioAppShell siteId={siteId} siteDomain={site?.domain}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Yield · Termes de recherche</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Termes de recherche
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
            Requêtes réellement associées aux impressions publicitaires (matched_query), avec
            clics, coût et conversions.
          </p>
        </div>
        <select
          className="ayeba-input h-9 px-2 text-xs"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          {[7, 14, 30, 90].map((d) => (
            <option key={d} value={d}>
              {d} jours
            </option>
          ))}
        </select>
      </div>

      <div className="mt-8">
        <MetricGrid>
          <Metric label="Impressions" value={String(totals.impressions)} />
          <Metric label="Clics" value={String(totals.clicks)} />
          <Metric label="Coût" value={totals.cost.toLocaleString("fr-FR")} hint="CDF" />
          <Metric label="Conversions" value={String(totals.conversions)} />
        </MetricGrid>
      </div>

      <section className="mt-10">
        <SectionTitle title="Rapport des termes" />
        <div className="mt-4">
          <DataTable
            columns={["Requête", "Impressions", "Clics", "CTR", "Coût", "Conversions"]}
            rows={terms.map((t) => [
              <span key="q" className="font-medium text-[var(--ink)]">
                {t.query}
              </span>,
              String(t.impressions),
              String(t.clicks),
              `${t.ctr}%`,
              t.cost.toLocaleString("fr-FR"),
              String(t.conversions),
            ])}
            empty="Aucun terme enregistré — les impressions avec contexte keywords/query alimentent ce rapport."
          />
        </div>
      </section>
    </StudioAppShell>
  );
}
