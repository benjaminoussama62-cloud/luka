"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import type {
  StudioSite,
  TraceOverview,
  TracePageRow,
  TraceReferrerRow,
} from "@/lib/studio/types";

export default function StudioTracePage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [overview, setOverview] = useState<TraceOverview | null>(null);
  const [pages, setPages] = useState<TracePageRow[]>([]);
  const [referrers, setReferrers] = useState<TraceReferrerRow[]>([]);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    const [o, p, r] = await Promise.all([
      fetch(`/api/studio/trace/${siteId}/overview`),
      fetch(`/api/studio/trace/${siteId}/pages`),
      fetch(`/api/studio/trace/${siteId}/referrers`),
    ]);
    if (o.ok) {
      const data = (await o.json()) as { overview: TraceOverview; site: StudioSite };
      setOverview(data.overview);
      setSite(data.site);
    }
    if (p.ok) {
      const data = (await p.json()) as { pages: TracePageRow[] };
      setPages(data.pages);
    }
    if (r.ok) {
      const data = (await r.json()) as { referrers: TraceReferrerRow[] };
      setReferrers(data.referrers);
    }
  }, [siteId]);

  useEffect(() => {
    if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/trace`);
  }, [ready, user, router, siteId]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const snippet = overview
    ? `<script async src="https://ayeba.app/api/studio/trace/script?k=${overview.traceKey}"></script>`
    : "";

  async function copySnippet() {
    if (!snippet) return;
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!site || !overview) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--muted)]">Chargement Trace…</p>
      </StudioAppShell>
    );
  }

  return (
    <StudioAppShell siteId={siteId} siteDomain={site.domain}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Trace</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-[clamp(2rem,5vw,3.2rem)] font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Audience sur votre site
          </h1>
        </div>
        <button type="button" className="ayeba-ghost px-3 py-2 text-xs" onClick={() => void load()}>
          Actualiser
        </button>
      </div>

      <section className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
        <Metric label="Sessions 7j" value={String(overview.sessions7d)} />
        <Metric label="Pages vues 7j" value={String(overview.pageviews7d)} />
        <Metric label="Chemins uniques" value={String(overview.uniquePaths7d)} />
        <Metric label="Clics Ayeba 7j" value={String(overview.searchReferrals7d)} />
        <Metric label="Pages / session" value={String(overview.avgPagesPerSession)} />
        <Metric
          label="Snippet"
          value={overview.snippetInstalled ? "Actif" : "À installer"}
        />
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">
          Snippet de suivi
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Collez avant <code className="text-[var(--ink)]">&lt;/head&gt;</code> sur {site.domain}.
        </p>
        <pre className="mt-4 overflow-x-auto rounded border border-[var(--line)] p-4 text-xs text-[var(--muted)]">
          {snippet}
        </pre>
        <button type="button" className="ayeba-cta mt-3 h-10 px-5 text-xs" onClick={() => void copySnippet()}>
          {copied ? "Copié" : "Copier le snippet"}
        </button>
      </section>

      <section className="mt-14 grid gap-12 lg:grid-cols-2">
        <div>
          <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">Top pages</h2>
          <Table
            headers={["Chemin", "Vues", "Sessions"]}
            rows={pages.map((p) => [p.path, String(p.pageviews), String(p.sessions)])}
            empty="Installez le snippet pour voir les pages visitées."
          />
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">Referrers</h2>
          <Table
            headers={["Source", "Sessions", "Vues"]}
            rows={referrers.map((r) => [r.referrer, String(r.sessions), String(r.pageviews)])}
            empty="Pas encore de referrers — le trafic Ayeba Search apparaîtra ici."
          />
        </div>
      </section>
    </StudioAppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-brand)] text-3xl tracking-[-0.03em] text-[var(--ink)]">
        {value}
      </p>
    </div>
  );
}

function Table({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[320px] text-left text-sm">
        <thead className="text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]">
          <tr>
            {headers.map((h) => (
              <th key={h} className="pb-3 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("-")} className="border-t border-[var(--line)]">
              {row.map((cell, i) => (
                <td key={i} className="max-w-[200px] truncate py-3 text-[var(--muted)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan={headers.length} className="py-6 text-[var(--muted)]">
                {empty}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
