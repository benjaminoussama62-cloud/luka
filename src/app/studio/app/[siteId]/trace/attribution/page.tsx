"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { DataTable, EmptyState, SectionTitle } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type Attribution = {
  touchpoints: Array<{
    type: string; source: string; medium: string; campaign: string;
    interactions: number; conversions: number;
    firstTouchConversions: number; lastTouchConversions: number;
    assistedConversions: number; value: number;
  }>;
  models: {
    lastClick: Array<{ touchpoint: string; conversions: number; value: number }>;
    firstClick: Array<{ touchpoint: string; conversions: number; value: number }>;
    linear: Array<{ touchpoint: string; conversions: number; value: number }>;
    timeDecay: Array<{ touchpoint: string; conversions: number; value: number }>;
  };
  customerJourney: Array<{
    sessionId: string; touchpoints: string[]; path: string[];
    conversionValue: number; totalDuration: number;
  }>;
};

const MODELS = [
  { id: "lastClick", label: "Dernier clic" },
  { id: "firstClick", label: "Premier clic" },
  { id: "linear", label: "Linéaire" },
  { id: "timeDecay", label: "Décroissance temporelle" },
] as const;

export default function TraceAttributionPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<{ site: StudioSite; attribution: Attribution } | null>(null);
  const [days, setDays] = useState(30);
  const [model, setModel] = useState<(typeof MODELS)[number]["id"]>("lastClick");

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/trace/${siteId}/analytics?section=attribution&days=${days}`);
    if (res.ok) setData(await res.json());
  }, [siteId, days]);

  useEffect(() => {
    if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/trace/attribution`);
  }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  if (!data) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--muted)]">Chargement Attribution…</p>
      </StudioAppShell>
    );
  }

  const { site, attribution } = data;
  const modelRows = attribution.models[model] || [];

  return (
    <StudioAppShell siteId={siteId} siteDomain={site.domain}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Trace · Attribution</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-[clamp(2rem,5vw,3rem)] font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Quels canaux convertissent
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Touchpoints mesurés sur les sessions réelles — chaque modèle répartit différemment le crédit.
          </p>
        </div>
        <select
          className="ayeba-input h-9 px-2 text-xs"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          {[7, 30, 90].map((d) => <option key={d} value={d}>{d} jours</option>)}
        </select>
      </div>

      {/* Modèles d'attribution comparés */}
      <section className="mt-10">
        <SectionTitle
          title="Comparaison des modèles"
          aside={
            <div className="dcw-seg">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`dcw-seg-btn ${model === m.id ? "active" : ""}`}
                  onClick={() => setModel(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          }
        />
        <div className="mt-4">
          <DataTable
            columns={["Touchpoint", "Conversions", "Valeur (CDF)"]}
            rows={modelRows.map((t) => [
              t.touchpoint,
              String(Math.round(t.conversions * 10) / 10),
              Math.round(t.value).toLocaleString("fr"),
            ])}
            empty="Aucune conversion attribuée sur la période — les touchpoints se construisent à mesure que des sessions convertissent."
          />
        </div>
      </section>

      {/* Touchpoints détaillés */}
      <section className="mt-10">
        <SectionTitle title="Touchpoints détaillés" />
        <div className="mt-4">
          <DataTable
            columns={["Type", "Source", "Campagne", "Interactions", "Conv.", "1er contact", "Dernier", "Assistées"]}
            rows={attribution.touchpoints.map((t) => [
              t.type,
              t.source || "direct",
              t.campaign || "—",
              String(t.interactions),
              String(t.conversions),
              String(t.firstTouchConversions),
              String(t.lastTouchConversions),
              String(t.assistedConversions),
            ])}
            empty="Aucun touchpoint mesuré — les paramètres UTM sur vos liens alimentent ce rapport."
          />
        </div>
      </section>

      {/* Parcours clients réels */}
      {attribution.customerJourney.length > 0 && (
        <section className="mt-10">
          <SectionTitle title="Parcours clients (sessions avec conversion)" />
          <div className="mt-4">
            <DataTable
              columns={["Session", "Touchpoints", "Pages", "Valeur (CDF)", "Durée"]}
              rows={attribution.customerJourney.map((j) => [
                <code key="s" className="dev-console-code">{j.sessionId.slice(0, 12)}…</code>,
                j.touchpoints.join(" → "),
                String(j.path.length),
                Math.round(j.conversionValue).toLocaleString("fr"),
                `${Math.round(j.totalDuration / 60)} min`,
              ])}
              empty=""
            />
          </div>
        </section>
      )}

      {attribution.touchpoints.length === 0 && attribution.customerJourney.length === 0 && (
        <div className="mt-10">
          <EmptyState
            title="Pas encore de données d'attribution"
            detail="L'attribution se construit à partir des touchpoints UTM et des conversions mesurés par la balise Trace."
          />
        </div>
      )}
    </StudioAppShell>
  );
}
