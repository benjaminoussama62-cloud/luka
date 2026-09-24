"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { Badge, Metric, MetricGrid, SectionTitle } from "@/components/studio/ui";
import type { StudioDashboard } from "@/lib/studio/dashboard";

const fmtInt = (v: number) => v.toLocaleString("fr");
const fmtCdf = (v: number) => `${v.toLocaleString("fr")} CDF`;
const fmtDur = (s: number) =>
  s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`;

export default function SiteDashboardPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [dash, setDash] = useState<StudioDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/sites/${siteId}/dashboard`);
    if (!res.ok) {
      const d = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(d?.error || "Erreur");
      return;
    }
    setDash(((await res.json()) as { dashboard: StudioDashboard }).dashboard);
  }, [siteId]);

  useEffect(() => {
    if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}`);
  }, [ready, user, router, siteId]);
  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (error) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--bad)]">{error}</p>
      </StudioAppShell>
    );
  }
  if (!dash) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--muted)]">Chargement…</p>
      </StudioAppShell>
    );
  }

  const { site, radar, trace, velocity, yield: y, insights } = dash;
  const v = velocity.lastAudit;

  return (
    <StudioAppShell siteId={siteId} siteDomain={site.domain}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Vue d&rsquo;ensemble</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-[clamp(1.8rem,4vw,2.6rem)] font-semibold tracking-[-0.04em] text-[var(--ink)]">
            {site.domain}
          </h1>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Statut :{" "}
            {site.status === "verified" ? (
              <Badge tone="good">Vérifié</Badge>
            ) : (
              <Badge tone="warn">Vérification en attente</Badge>
            )}
          </p>
        </div>
        <button type="button" className="ayeba-ghost px-3 py-2 text-xs" onClick={() => void load()}>
          Actualiser
        </button>
      </div>

      {/* Insights Aether en tête — actions prioritaires */}
      {insights.length > 0 && (
        <section className="mt-8">
          <SectionTitle kicker="Aether" title="Priorités détectées sur vos données" />
          <ul className="mt-4 space-y-3">
            {insights.map((ins) => (
              <li
                key={ins.title}
                className="ayeba-panel flex flex-wrap items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--ink)]">{ins.title}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{ins.detail}</p>
                </div>
                <Link href={ins.href} className="ayeba-ghost shrink-0 px-3 py-1.5 text-xs">
                  Ouvrir
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Radar — visibilité recherche */}
      <section className="mt-10">
        <SectionTitle
          kicker="Radar"
          title="Visibilité dans Ayeba Search — 28 jours"
          aside={
            <Link href={`/studio/app/${siteId}/radar`} className="dcw-link">
              Ouvrir Radar →
            </Link>
          }
        />
        <MetricGrid>
          <Metric label="Impressions" value={fmtInt(radar.impressions28d)} />
          <Metric label="Clics" value={fmtInt(radar.clicks28d)} />
          <Metric label="CTR" value={`${radar.ctr28d} %`} />
          <Metric
            label="Position moy."
            value={radar.avgPosition != null ? String(radar.avgPosition) : "—"}
          />
        </MetricGrid>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge tone="good">{radar.indexedPages} indexée(s)</Badge>
          {radar.errorPages > 0 && <Badge tone="bad">{radar.errorPages} en erreur</Badge>}
          {radar.excludedPages > 0 && (
            <Badge tone="warn">{radar.excludedPages} soumise(s) non indexée(s)</Badge>
          )}
        </div>
      </section>

      {/* Trace — audience */}
      <section className="mt-10">
        <SectionTitle
          kicker="Trace"
          title="Audience — 28 jours"
          aside={
            <Link href={`/studio/app/${siteId}/trace`} className="dcw-link">
              Ouvrir Trace →
            </Link>
          }
        />
        {trace.sessions28d > 0 ? (
          <MetricGrid>
            <Metric label="Sessions" value={fmtInt(trace.sessions28d)} />
            <Metric label="Pages vues" value={fmtInt(trace.pageviews28d)} />
            <Metric label="Utilisateurs" value={fmtInt(trace.users28d)} />
            <Metric label="Rebond" value={`${trace.bounceRate} %`} />
            <Metric label="Durée moy." value={fmtDur(trace.avgSessionDurationSec)} />
          </MetricGrid>
        ) : (
          <div className="ayeba-panel mt-4 p-5">
            <p className="text-sm text-[var(--muted)]">
              Aucune session mesurée — installez la balise Trace pour collecter l&rsquo;audience réelle.
            </p>
            <Link
              href={`/studio/app/${siteId}/trace/tags`}
              className="ayeba-cta mt-3 inline-block px-4 py-2 text-xs"
            >
              Installer la balise
            </Link>
          </div>
        )}
      </section>

      {/* Velocity — performance */}
      <section className="mt-10">
        <SectionTitle
          kicker="Velocity"
          title="Performance — dernier audit Lighthouse"
          aside={
            <Link href={`/studio/app/${siteId}/velocity`} className="dcw-link">
              Ouvrir Velocity →
            </Link>
          }
        />
        {v ? (
          <div className="ayeba-panel mt-4 flex flex-wrap items-center gap-6 p-5">
            <div className="st-verdict">
              Score :{" "}
              <span
                className={
                  (v.scores.performance ?? 0) >= 90
                    ? "st-verdict-ok"
                    : (v.scores.performance ?? 0) >= 50
                      ? "st-verdict-warn"
                      : "st-verdict-bad"
                }
              >
                {v.scores.performance ?? "—"}/100
              </span>
            </div>
            <div className="text-xs text-[var(--muted)]">
              <p>{v.url}</p>
              <p>
                {v.strategy} · {v.timestamp.slice(0, 16).replace("T", " ")} ·{" "}
                {velocity.auditsCount} audit(s) au total
              </p>
            </div>
          </div>
        ) : (
          <div className="ayeba-panel mt-4 p-5">
            <p className="text-sm text-[var(--muted)]">
              Aucun audit — lancez une analyse PageSpeed (réelle, via l&rsquo;API Google PSI).
            </p>
          </div>
        )}
      </section>

      {/* Yield — monétisation */}
      <section className="mt-10">
        <SectionTitle
          kicker="Yield"
          title="Monétisation — 30 jours"
          aside={
            <Link href={`/studio/app/${siteId}/yield`} className="dcw-link">
              Ouvrir Yield →
            </Link>
          }
        />
        <MetricGrid>
          <Metric label="Impressions pubs" value={fmtInt(y.impressions30d)} />
          <Metric label="Clics pubs" value={fmtInt(y.clicks30d)} />
          <Metric label="Revenus" value={fmtCdf(y.revenue30dCdf)} />
          <Metric label="eCPM" value={fmtCdf(y.ecpmCdf)} />
        </MetricGrid>
        {!y.enabled && (
          <p className="mt-3 text-xs text-[var(--muted)]">
            La monétisation est désactivée pour ce site — activez-la dans Yield.
          </p>
        )}
      </section>
    </StudioAppShell>
  );
}
