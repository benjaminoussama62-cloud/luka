"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { Badge, EmptyState, SectionTitle } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type Cohorts = {
  cohorts: Array<{
    cohort: string;
    size: number;
    retention: number[];
    churnRate: number;
    ltv: number;
  }>;
  insights: Array<{ type: string; description: string; recommendation: string }>;
};

export default function TraceCohortesPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<{ site: StudioSite; cohorts: Cohorts } | null>(null);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/trace/${siteId}/analytics?section=cohorts`);
    if (res.ok) setData(await res.json());
  }, [siteId]);

  useEffect(() => {
    if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/trace/cohortes`);
  }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  if (!data) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--muted)]">Chargement Cohortes…</p>
      </StudioAppShell>
    );
  }

  const { site, cohorts } = data;

  return (
    <StudioAppShell siteId={siteId} siteDomain={site.domain}>
      <p className="ayeba-kicker ayeba-kicker-accent">Trace · Cohortes</p>
      <h1 className="mt-2 font-[family-name:var(--font-brand)] text-[clamp(2rem,5vw,3rem)] font-semibold tracking-[-0.04em] text-[var(--ink)]">
        Rétention par cohorte
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
        Chaque ligne = les visiteurs arrivés la même semaine, et le % qui reviennent les semaines
        suivantes. Mesuré sur les sessions réelles, jamais simulé.
      </p>

      {cohorts.cohorts.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Pas encore de cohortes"
            detail="Les cohortes se construisent après plusieurs semaines de mesure — installez la balise Trace et laissez les sessions s'accumuler."
          />
        </div>
      ) : (
        <>
          <section className="mt-10">
            <SectionTitle title="Rétention hebdomadaire" />
            <div className="ayeba-panel mt-4 overflow-x-auto p-5">
              <table className="dcw-table">
                <thead>
                  <tr>
                    <th>Cohorte</th>
                    <th className="text-right">Taille</th>
                    {cohorts.cohorts[0].retention.map((_, i) => (
                      <th key={i} className="text-center">S{i}</th>
                    ))}
                    <th className="text-right">Churn</th>
                  </tr>
                </thead>
                <tbody>
                  {cohorts.cohorts.map((c) => (
                    <tr key={c.cohort}>
                      <td className="font-medium">{c.cohort}</td>
                      <td className="text-right">{c.size}</td>
                      {c.retention.map((r, i) => (
                        <td key={i} className="text-center">
                          <span
                            className="st-cohort-cell"
                            style={{
                              background: `rgba(232, 93, 4, ${Math.min(0.9, r / 100)})`,
                              color: r > 45 ? "#fff" : "var(--ink)",
                            }}
                          >
                            {Math.round(r)}%
                          </span>
                        </td>
                      ))}
                      <td className="text-right">{Math.round(c.churnRate)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {cohorts.insights.length > 0 && (
            <section className="mt-10">
              <SectionTitle title="Lecture automatique" />
              <ul className="mt-4 space-y-3">
                {cohorts.insights.map((ins, i) => (
                  <li key={i} className="ayeba-panel p-4">
                    <Badge tone={ins.type === "warning" ? "warn" : ins.type === "positive" ? "good" : "neutral"}>
                      {ins.type}
                    </Badge>
                    <p className="mt-2 text-sm text-[var(--ink)]">{ins.description}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{ins.recommendation}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </StudioAppShell>
  );
}
