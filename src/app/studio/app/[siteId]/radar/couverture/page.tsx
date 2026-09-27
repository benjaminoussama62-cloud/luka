"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { DataTable, Metric, MetricGrid, SectionTitle } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type IndexRequest = {
  id?: string;
  url: string;
  status: string;
  reason?: string;
  requestedAt?: string;
  createdAt?: string;
  queueStatus?: string | null;
};

type Coverage = {
  totals: {
    indexed: number;
    pending: number;
    failed: number;
    submitted: number;
    discoveredNotIndexed: number;
  };
  pages: Array<{
    url: string;
    title: string;
    crawledAt: string;
    linkCount: number;
    credibility: number;
  }>;
  pending: Array<{ url: string; priority: number; scheduledAt: string }>;
  failed: Array<{ url: string; attempts: number; error: string; scheduledAt: string }>;
  submitted: Array<{ url: string; source: string; submittedAt: string; indexed: boolean }>;
  indexRequests?: IndexRequest[];
};

type Tab = "pages" | "pending" | "failed" | "submitted";

export default function RadarCouverturePage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [cov, setCov] = useState<Coverage | null>(null);
  const [tab, setTab] = useState<Tab>("pages");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [history, setHistory] = useState<IndexRequest[]>([]);

  const load = useCallback(async () => {
    if (!siteId) return;
    const [covRes, histRes] = await Promise.all([
      fetch(`/api/studio/radar/${siteId}/coverage`),
      fetch(`/api/studio/radar/${siteId}/request-indexing`),
    ]);
    if (covRes.ok) {
      const d = await covRes.json();
      setSite(d.site);
      setCov(d.coverage);
      if (d.coverage?.indexRequests?.length) setHistory(d.coverage.indexRequests);
    }
    if (histRes.ok) {
      const d = await histRes.json();
      if (Array.isArray(d.requests)) setHistory(d.requests);
    }
  }, [siteId]);

  useEffect(() => {
    if (ready && !user)
      router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/radar/couverture`);
  }, [ready, user, router, siteId]);
  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  function toggle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  async function requestIndexing(urls: string[]) {
    if (!urls.length) {
      setMsg("Sélectionnez au moins une URL.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/studio/radar/${siteId}/request-indexing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    const data = (await res.json()) as { queued?: number; rejected?: string[]; error?: string };
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Demande impossible");
      return;
    }
    setMsg(
      `${data.queued ?? 0} URL(s) mises en file d'indexation` +
        (data.rejected?.length ? ` · ${data.rejected.length} rejetée(s)` : ""),
    );
    setSelected(new Set());
    setManualUrl("");
    void load();
  }

  if (!cov) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--muted)]">Chargement…</p>
      </StudioAppShell>
    );
  }
  const t = cov.totals;
  const TABS: Array<[Tab, string, number]> = [
    ["pages", "Indexées", t.indexed],
    ["pending", "En file", t.pending],
    ["failed", "Erreurs", t.failed],
    ["submitted", "Soumises", t.submitted],
  ];

  const selectable =
    tab === "failed"
      ? cov.failed.map((f) => f.url)
      : tab === "submitted"
        ? cov.submitted.filter((s) => !s.indexed).map((s) => s.url)
        : [];

  return (
    <StudioAppShell siteId={siteId} siteDomain={site?.domain}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Radar · Couverture</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Indexation du site
          </h1>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Demande d&apos;indexation réelle (file de crawl Ayeba) — équivalent « Demander
            l&apos;indexation » GSC.
          </p>
        </div>
        <button type="button" className="ayeba-ghost px-3 py-2 text-xs" onClick={() => void load()}>
          Actualiser
        </button>
      </div>

      <div className="mt-8">
        <MetricGrid>
          <Metric label="Pages indexées" value={String(t.indexed)} />
          <Metric label="En file de crawl" value={String(t.pending)} />
          <Metric label="Échecs de crawl" value={String(t.failed)} />
          <Metric
            label="Découvertes non indexées"
            value={String(t.discoveredNotIndexed)}
            hint={`${t.submitted} soumises au total`}
          />
        </MetricGrid>
      </div>

      <form
        className="ayeba-panel mt-8 flex flex-wrap items-center gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void requestIndexing(manualUrl ? [manualUrl] : [...selected]);
        }}
      >
        <input
          className="ayeba-input h-10 min-w-[220px] flex-1 px-3 text-sm"
          placeholder={`https://${site?.domain || "exemple.com"}/page`}
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
        />
        <button type="submit" className="ayeba-cta h-10 px-4 text-xs" disabled={busy}>
          {busy ? "Envoi…" : "Demander l'indexation"}
        </button>
        {selectable.length > 0 ? (
          <button
            type="button"
            className="ayeba-ghost h-10 px-3 text-xs"
            disabled={busy || selected.size === 0}
            onClick={() => void requestIndexing([...selected])}
          >
            Indexer la sélection ({selected.size})
          </button>
        ) : null}
        {msg ? <p className="w-full text-sm text-[var(--accent)]">{msg}</p> : null}
      </form>

      <section className="mt-10">
        <div className="flex flex-wrap gap-1 border-b border-[var(--line)]">
          {TABS.map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              className={`px-4 py-2 text-xs ${tab === key ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}
              style={tab === key ? { boxShadow: "inset 0 -2px 0 var(--accent)" } : undefined}
              onClick={() => {
                setTab(key);
                setSelected(new Set());
              }}
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
                <span key="u" className="block max-w-[260px] truncate" title={p.url}>
                  {p.url}
                </span>,
                <span key="t" className="block max-w-[200px] truncate" title={p.title}>
                  {p.title}
                </span>,
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
                <span key="u" className="block max-w-[320px] truncate" title={p.url}>
                  {p.url}
                </span>,
                String(p.priority),
                p.scheduledAt?.slice(0, 10) || "—",
              ])}
              empty="File de crawl vide pour ce domaine"
            />
          ) : null}
          {tab === "failed" ? (
            <DataTable
              columns={["", "URL", "Tentatives", "Erreur", "Date"]}
              rows={cov.failed.map((f) => [
                <input
                  key="c"
                  type="checkbox"
                  checked={selected.has(f.url)}
                  onChange={() => toggle(f.url)}
                />,
                <span key="u" className="block max-w-[260px] truncate" title={f.url}>
                  {f.url}
                </span>,
                String(f.attempts),
                <span
                  key="e"
                  className="block max-w-[200px] truncate text-[var(--danger,#c0392b)]"
                  title={f.error}
                >
                  {f.error || "—"}
                </span>,
                f.scheduledAt?.slice(0, 10) || "—",
              ])}
              empty="Aucun échec de crawl — bon signe"
            />
          ) : null}
          {tab === "submitted" ? (
            <DataTable
              columns={["", "URL", "Source", "Soumise le", "Indexée"]}
              rows={cov.submitted.map((s) => [
                s.indexed ? (
                  ""
                ) : (
                  <input
                    key="c"
                    type="checkbox"
                    checked={selected.has(s.url)}
                    onChange={() => toggle(s.url)}
                  />
                ),
                <span key="u" className="block max-w-[320px] truncate" title={s.url}>
                  {s.url}
                </span>,
                s.source,
                s.submittedAt?.slice(0, 10) || "—",
                s.indexed ? "Oui" : "Non",
              ])}
              empty="Aucune URL soumise"
            />
          ) : null}
        </div>
      </section>

      <section className="mt-12">
        <SectionTitle title="Historique des demandes d'indexation" />
        <div className="mt-4">
          <DataTable
            columns={["URL", "Statut", "Raison", "Demandée le", "File"]}
            rows={history.map((h) => [
              <span key="u" className="block max-w-[320px] truncate" title={h.url}>
                {h.url}
              </span>,
              h.status,
              h.reason || "request_indexing",
              (h.requestedAt || h.createdAt || "").slice(0, 19).replace("T", " ") || "—",
              h.queueStatus || "—",
            ])}
            empty="Aucune demande d'indexation pour l'instant"
          />
        </div>
      </section>
    </StudioAppShell>
  );
}
