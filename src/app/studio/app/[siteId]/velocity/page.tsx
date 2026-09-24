"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import {
  Badge, DataTable, LineChart, Metric, MetricGrid, ScoreGauge, SectionTitle,
} from "@/components/studio/ui";
import type { StudioSite, VelocityOverview } from "@/lib/studio/types";

type PsiHistoryItem = {
  id: string;
  url: string;
  timestamp: string;
  strategy: string;
  scores: {
    overall: number;
    performance: number | null;
    accessibility: number | null;
    bestPractices: number | null;
    seo: number | null;
  };
  metrics: {
    firstContentfulPaintMs: number | null;
    largestContentfulPaintMs: number | null;
    totalBlockingTimeMs: number | null;
    cumulativeLayoutShift: number | null;
    speedIndexMs: number | null;
    timeToInteractiveMs: number | null;
    serverResponseTimeMs: number | null;
    totalByteWeightBytes: number | null;
  } | null;
  opportunities: Array<{ id: string; title: string; savingsMs: number | null; savingsBytes: number | null }> | null;
};


export default function StudioVelocityPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [overview, setOverview] = useState<VelocityOverview | null>(null);
  const [history, setHistory] = useState<PsiHistoryItem[]>([]);
  const [auditUrl, setAuditUrl] = useState("");
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/velocity/${siteId}/overview`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      overview: VelocityOverview;
      history: PsiHistoryItem[];
      site: StudioSite;
    };
    setOverview(data.overview);
    setHistory(data.history || []);
    setSite(data.site);
    setAuditUrl((prev) => prev || `https://${data.site.domain}/`);
  }, [siteId]);

  useEffect(() => {
    if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/velocity`);
  }, [ready, user, router, siteId]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function onAudit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/studio/velocity/${siteId}/audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: auditUrl, strategy }),
    });
    const data = (await res.json()) as {
      history?: PsiHistoryItem[];
      overview?: VelocityOverview;
      source?: string;
      error?: string;
    };
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Audit impossible");
      return;
    }
    if (data.history) setHistory(data.history);
    if (data.overview) setOverview(data.overview);
    setMsg(data.source === "pagespeed_insights" ? "Audit Lighthouse terminé." : "Audit direct terminé (PageSpeed indisponible).");
  }

  if (!site || !overview) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--muted)]">Chargement Velocity…</p>
      </StudioAppShell>
    );
  }

  const latest = history[0];
  const m = latest?.metrics;

  return (
    <StudioAppShell siteId={siteId} siteDomain={site.domain}>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Velocity</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-[clamp(2rem,5vw,3.2rem)] font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Performance & Core Web Vitals
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Audits Lighthouse réels via PageSpeed Insights — données mesurées, jamais simulées.
          </p>
        </div>
        <button type="button" className="ayeba-ghost px-3 py-2 text-xs" onClick={() => void load()}>
          Actualiser
        </button>
      </div>

      {/* Lancer un audit */}
      <form onSubmit={(e) => void onAudit(e)} className="ayeba-panel mt-8 p-5">
        <SectionTitle title="Analyser une page" />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            className="ayeba-input h-11 min-w-[240px] flex-1 px-3 text-sm"
            value={auditUrl}
            onChange={(e) => setAuditUrl(e.target.value)}
            placeholder={`https://${site.domain}/`}
          />
          <div className="flex overflow-hidden rounded-md border border-[var(--line)]">
            {(["mobile", "desktop"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStrategy(s)}
                className={`px-3 py-2 text-xs capitalize ${strategy === s ? "bg-[var(--accent)] text-[var(--bg)]" : "text-[var(--muted)]"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <button type="submit" className="ayeba-cta h-10 px-5 text-xs" disabled={busy}>
            {busy ? "Analyse Lighthouse…" : "Analyser"}
          </button>
        </div>
        {msg ? <p className="mt-3 text-sm text-[var(--accent)]">{msg}</p> : null}
      </form>

      {/* Dernier audit Lighthouse */}
      {latest ? (
        <section className="mt-10">
          <SectionTitle
            kicker="Dernier audit"
            title={`${latest.url} · ${latest.strategy}`}
            aside={<Badge tone="neutral">{latest.timestamp.slice(0, 16).replace("T", " ")}</Badge>}
          />
          <div className="ayeba-panel mt-4 flex flex-wrap items-center justify-around gap-6 p-6">
            <ScoreGauge score={latest.scores.performance} label="Performance" />
            <ScoreGauge score={latest.scores.accessibility} label="Accessibilité" />
            <ScoreGauge score={latest.scores.bestPractices} label="Bonnes pratiques" />
            <ScoreGauge score={latest.scores.seo} label="SEO" />
          </div>

          {m ? (
            <MetricGrid>
              <Metric label="FCP" value={m.firstContentfulPaintMs != null ? `${(m.firstContentfulPaintMs / 1000).toFixed(1)} s` : "—"} hint="First Contentful Paint" />
              <Metric label="LCP" value={m.largestContentfulPaintMs != null ? `${(m.largestContentfulPaintMs / 1000).toFixed(1)} s` : "—"} hint="Largest Contentful Paint" />
              <Metric label="TBT" value={m.totalBlockingTimeMs != null ? `${m.totalBlockingTimeMs} ms` : "—"} hint="Total Blocking Time" />
              <Metric label="CLS" value={m.cumulativeLayoutShift != null ? String(m.cumulativeLayoutShift) : "—"} hint="Cumulative Layout Shift" />
              <Metric label="Speed Index" value={m.speedIndexMs != null ? `${(m.speedIndexMs / 1000).toFixed(1)} s` : "—"} />
              <Metric label="TTI" value={m.timeToInteractiveMs != null ? `${(m.timeToInteractiveMs / 1000).toFixed(1)} s` : "—"} hint="Time to Interactive" />
              <Metric label="Réponse serveur" value={m.serverResponseTimeMs != null ? `${m.serverResponseTimeMs} ms` : "—"} hint="TTFB" />
              <Metric label="Poids total" value={m.totalByteWeightBytes != null ? `${Math.round(m.totalByteWeightBytes / 1024)} Ko` : "—"} />
            </MetricGrid>
          ) : null}

          {latest.opportunities?.length ? (
            <div className="mt-8">
              <SectionTitle title="Opportunités" aside={<Badge tone="warn">{latest.opportunities.length} optimisations</Badge>} />
              <div className="ayeba-panel mt-4 divide-y divide-[var(--line)]">
                {latest.opportunities.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div>
                      <p className="text-sm text-[var(--ink)]">{o.title}</p>
                      <p className="text-xs text-[var(--faint)]">{o.id}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {o.savingsMs != null ? <Badge tone="bad">−{(o.savingsMs / 1000).toFixed(2)} s</Badge> : null}
                      {o.savingsBytes != null && o.savingsBytes > 1024 ? (
                        <p className="mt-1 text-[11px] text-[var(--muted)]">{Math.round(o.savingsBytes / 1024)} Ko</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Plan d'action (audits directs v1) */}
      {overview.actionPlan.length ? (
        <section className="mt-10">
          <SectionTitle title="Plan d'action priorisé" />
          <ul className="mt-4 space-y-4">
            {overview.actionPlan.map((f) => (
              <li key={f.id} className="border-l-2 border-[var(--line)] pl-4">
                <p className="text-sm text-[var(--ink)]">
                  <span className="mr-2"><Badge tone={f.severity === "critical" ? "bad" : f.severity === "warn" ? "warn" : "neutral"}>{f.severity}</Badge></span>
                  {f.title}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">{f.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Historique */}
      <section className="mt-10">
        <SectionTitle title="Historique des audits" />
        {history.length > 1 && (
          <div className="ayeba-panel mt-4 p-5">
            <p className="mb-3 text-xs text-[var(--muted)]">
              Évolution des scores Lighthouse — les points sont les audits réels.
            </p>
            <LineChart
              height={150}
              series={[
                {
                  name: "Performance",
                  points: [...history].reverse().map((a) => ({
                    x: a.timestamp.slice(5, 16).replace("T", " "),
                    y: a.scores.performance,
                  })),
                },
                {
                  name: "SEO",
                  points: [...history].reverse().map((a) => ({
                    x: a.timestamp.slice(5, 16).replace("T", " "),
                    y: a.scores.seo,
                  })),
                },
                {
                  name: "Accessibilité",
                  points: [...history].reverse().map((a) => ({
                    x: a.timestamp.slice(5, 16).replace("T", " "),
                    y: a.scores.accessibility,
                  })),
                },
              ]}
            />
            <div className="mt-2 flex gap-4 text-[11px] text-[var(--muted)]">
              <span style={{ color: "var(--accent)" }}>— Performance</span>
              <span style={{ color: "#93c5fd" }}>— SEO</span>
              <span style={{ color: "#34d399" }}>— Accessibilité</span>
            </div>
          </div>
        )}
        <div className="mt-4">
          <DataTable
            columns={["URL", "Perf.", "A11y", "BP", "SEO", "Mode", "Date"]}
            rows={history.map((a) => [
              <span key="u" className="block max-w-[220px] truncate" title={a.url}>{a.url}</span>,
              String(a.scores.performance ?? "—"),
              String(a.scores.accessibility ?? "—"),
              String(a.scores.bestPractices ?? "—"),
              String(a.scores.seo ?? "—"),
              a.strategy,
              a.timestamp.slice(0, 16).replace("T", " "),
            ])}
            empty="Aucun audit Lighthouse — lancez votre première analyse ci-dessus."
          />
        </div>
        {overview.audits.length ? (
          <div className="mt-6">
            <SectionTitle title="Audits directs (fetch)" />
            <div className="mt-4">
              <DataTable
                columns={["URL", "Score", "TTFB", "HTML", "Date"]}
                rows={overview.audits.map((a) => [
                  <span key="u" className="block max-w-[220px] truncate" title={a.url}>{a.url}</span>,
                  `${a.score}/100`,
                  `${a.ttfbMs} ms`,
                  `${Math.round(a.htmlBytes / 1024)} Ko`,
                  a.createdAt.slice(0, 16).replace("T", " "),
                ])}
                empty=""
              />
            </div>
          </div>
        ) : null}
      </section>
    </StudioAppShell>
  );
}
