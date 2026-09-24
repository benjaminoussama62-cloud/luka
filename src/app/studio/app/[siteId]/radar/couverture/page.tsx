"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { DataTable, Metric, MetricGrid } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type Coverage = {
  totals: { indexed: number; pending: number; failed: number; submitted: number; discoveredNotIndexed: number };
  pages: Array<{ url: string; title: string; crawledAt: string; linkCount: number; credibility: number }>;
  pending: Array<{ url: string; priority: number; scheduledAt: string }>;
  failed: Array<{ url: string; attempts: number; error: string; scheduledAt: string }>;
  submitted: Array<{ url: string; source: string; submittedAt: string; indexed: boolean }>;
};

type Tab = "pages" | "pending" | "failed" | "submitted";

export default function RadarCouverturePage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [cov, setCov] = useState<Coverage | null>(null);
  const [tab, setTab] = useState<Tab>("pages");

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/radar/${siteId}/coverage`);
    if (res.ok) { const d = await res.json(); setSite(d.site); setCov(d.coverage); }
  }, [siteId]);

  useEffect(() => { if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/radar/couverture`); }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  if (!cov) {
    return <StudioAppShell siteId={siteId}><p className="text-sm text-[var(--muted)]">Chargement…</p></StudioAppShell>;
  }
  const t = cov.totals;
  const TABS: Array<[Tab, string, number]> = [
    ["pages", "Indexées", t.indexed],
    ["pending", "En file", t.pending],
    ["failed", "Erreurs", t.failed],
    ["submitted", "Soumises", t.submitted],
  ];

  return (
    <StudioAppShell siteId={siteId} siteDomain={site?.domain}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Radar · Couverture</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Indexation du site
          </h1>
        </div>
        <button type="button" className="ayeba-ghost px-3 py-2 text-xs" onClick={() => void load()}>Actualiser</button>
      </div>

      <div className="mt-8">
        <MetricGrid>
          <Metric label="Pages indexées" value={String(t.indexed)} />
          <Metric label="En file de crawl" value={String(t.pending)} />
          <Metric label="Échecs de crawl" value={String(t.failed)} />
          <Metric label="Découvertes non indexées" value={String(t.discoveredNotIndexed)} hint={`${t.submitted} soumises au total`} />
        </MetricGrid>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap gap-1 border-b border-[var(--line)]">
          {TABS.map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              className={`px-4 py-2 text-xs ${tab === key ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}
              style={tab === key ? { boxShadow: "inset 0 -2px 0 var(--accent)" } : undefined}
              onClick={() => setTab(key)}
            >
              {label} <span className="text-[var(--faint)]">({count})</span>
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === "pages" ? (
            <DataTable
              columns={["Page", "Titre", "Crawlée le", "Liens sortants", "Crédibilité"]}
              rows={cov.pages.map((p) => [
                <span key="u" className="block max-w-[260px] truncate" title={p.url}>{p.url}</span>,
                <span key="t" className="block max-w-[200px] truncate" title={p.title}>{p.title}</span>,
                p.crawledAt?.slice(0, 10) || "—",
                String(p.linkCount),
                `${p.credibility}%`,
              ])}
              empty="Aucune page indexée — soumettez un sitemap ou demandez l'indexation"
            />
          ) : null}
          {tab === "pending" ? (
            <DataTable
              columns={["URL", "Priorité", "Planifiée"]}
              rows={cov.pending.map((p) => [
                <span key="u" className="block max-w-[320px] truncate" title={p.url}>{p.url}</span>,
                String(p.priority),
                p.scheduledAt?.slice(0, 10) || "—",
              ])}
              empty="File de crawl vide pour ce domaine"
            />
          ) : null}
          {tab === "failed" ? (
            <DataTable
              columns={["URL", "Tentatives", "Erreur", "Date"]}
              rows={cov.failed.map((f) => [
                <span key="u" className="block max-w-[260px] truncate" title={f.url}>{f.url}</span>,
                String(f.attempts),
                <span key="e" className="block max-w-[200px] truncate text-[var(--danger,#c0392b)]" title={f.error}>{f.error || "—"}</span>,
                f.scheduledAt?.slice(0, 10) || "—",
              ])}
              empty="Aucun échec de crawl — bon signe"
            />
          ) : null}
          {tab === "submitted" ? (
            <DataTable
              columns={["URL", "Source", "Soumise le", "Indexée"]}
              rows={cov.submitted.map((s) => [
                <span key="u" className="block max-w-[320px] truncate" title={s.url}>{s.url}</span>,
                s.source,
                s.submittedAt?.slice(0, 10) || "—",
                s.indexed ? "Oui" : "Non",
              ])}
              empty="Aucune URL soumise"
            />
          ) : null}
        </div>
      </section>
    </StudioAppShell>
  );
}
