"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { Badge, DataTable, Metric, MetricGrid, SectionTitle } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type RoasRow = {
  campaignId: string;
  campaignName: string;
  status: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
  roas: number | null;
  ctr: number;
};

export default function YieldRoasPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [campaigns, setCampaigns] = useState<RoasRow[]>([]);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/yield/${siteId}/search-terms?view=roas&days=${days}`);
    if (res.ok) {
      const d = await res.json();
      setSite(d.site);
      setCampaigns(d.campaigns || []);
    }
  }, [siteId, days]);

  useEffect(() => {
    if (ready && !user)
      router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/yield/roas`);
  }, [ready, user, router, siteId]);
  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const totals = campaigns.reduce(
    (a, c) => ({
      cost: a.cost + c.cost,
      revenue: a.revenue + c.conversionValue,
      conversions: a.conversions + c.conversions,
      clicks: a.clicks + c.clicks,
    }),
    { cost: 0, revenue: 0, conversions: 0, clicks: 0 },
  );
  const overallRoas = totals.cost > 0 ? Math.round((totals.revenue / totals.cost) * 100) / 100 : null;

  return (
    <StudioAppShell siteId={siteId} siteDomain={site?.domain}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Yield · ROAS</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Retour sur les dépenses publicitaires
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
            ROAS = valeur des conversions ÷ coût des clics, lié via la table conversions → clicks.
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
          <Metric label="Coût total" value={totals.cost.toLocaleString("fr-FR")} hint="CDF" />
          <Metric
            label="Valeur conversions"
            value={totals.revenue.toLocaleString("fr-FR")}
            hint="CDF"
          />
          <Metric
            label="ROAS global"
            value={overallRoas != null ? `${overallRoas}×` : "—"}
          />
          <Metric label="Conversions" value={String(totals.conversions)} />
        </MetricGrid>
      </div>

      <section className="mt-10">
        <SectionTitle title="ROAS par campagne" />
        <div className="mt-4">
          <DataTable
            columns={[
              "Campagne",
              "Statut",
              "Clics",
              "Coût",
              "Conv.",
              "Valeur",
              "ROAS",
            ]}
            rows={campaigns.map((c) => [
              <span key="n" className="font-medium text-[var(--ink)]">
                {c.campaignName}
              </span>,
              <Badge key="s" tone={c.status === "active" ? "good" : "neutral"}>
                {c.status}
              </Badge>,
              String(c.clicks),
              c.cost.toLocaleString("fr-FR"),
              String(c.conversions),
              c.conversionValue.toLocaleString("fr-FR"),
              c.roas != null ? `${c.roas}×` : "—",
            ])}
            empty="Aucune campagne — créez une campagne et mesurez les conversions attribuées aux clics."
          />
        </div>
      </section>
    </StudioAppShell>
  );
}
