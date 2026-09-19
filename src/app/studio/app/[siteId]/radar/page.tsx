"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { ModuleNav } from "@/components/studio/ui";
import { RADAR_NAV } from "@/components/studio/radar-nav";
import type {
  RadarOverview,
  RadarPageRow,
  RadarQueryRow,
  StudioSite,
} from "@/lib/studio/types";

export default function StudioRadarPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();

  const [site, setSite] = useState<StudioSite | null>(null);
  const [overview, setOverview] = useState<RadarOverview | null>(null);
  const [queries, setQueries] = useState<RadarQueryRow[]>([]);
  const [pages, setPages] = useState<RadarPageRow[]>([]);

  const load = useCallback(async () => {
    if (!siteId) return;
    const [o, q, p] = await Promise.all([
      fetch(`/api/studio/radar/${siteId}/overview`),
      fetch(`/api/studio/radar/${siteId}/queries`),
      fetch(`/api/studio/radar/${siteId}/pages`),
    ]);
    if (o.ok) {
      const data = (await o.json()) as { overview: RadarOverview; site: StudioSite };
      setOverview(data.overview);
      setSite(data.site);
    }
    if (q.ok) {
      const data = (await q.json()) as { queries: RadarQueryRow[] };
      setQueries(data.queries);
    }
    if (p.ok) {
      const data = (await p.json()) as { pages: RadarPageRow[] };
      setPages(data.pages);
    }
  }, [siteId]);

  useEffect(() => {
    if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/radar`);
  }, [ready, user, router, siteId]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (!site || !overview) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--muted)]">Chargement Radar…</p>
      </StudioAppShell>
    );
  }

  return (
    <StudioAppShell siteId={siteId} siteDomain={site.domain}>
      <ModuleNav siteId={siteId} module="radar" items={RADAR_NAV} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Radar</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-[clamp(2rem,5vw,3.2rem)] font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Présence dans Ayeba
          </h1>
        </div>
        <button type="button" className="ayeba-ghost px-3 py-2 text-xs" onClick={() => void load()}>
          Actualiser
        </button>
      </div>

      {/* Next action — one decision */}
      <section className="mt-8 border-y border-[var(--line)] py-8">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">Prochaine action</p>
        <h2 className="mt-2 font-[family-name:var(--font-brand)] text-2xl text-[var(--ink)]">
          {overview.nextAction.title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{overview.nextAction.detail}</p>
      </section>

      {/* Metrics strip — not cards */}
      <section className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
        <Metric label="Indexées" value={String(overview.indexedPages)} />
        <Metric label="Soumises" value={String(overview.submittedUrls)} />
        <Metric label="Couverture" value={`${overview.coveragePct}%`} />
        <Metric label="CTR 7j" value={`${overview.ctr7d}%`} />
        <Metric label="Clics 7j" value={String(overview.clicks7d)} />
        <Metric label="Impressions 7j" value={String(overview.impressions7d)} />
        <Metric
          label="Position moy."
          value={overview.avgPosition7d != null ? String(overview.avgPosition7d) : "—"}
        />
        <Metric label="File / échecs" value={`${overview.queuePending} / ${overview.queueFailed}`} />
      </section>

      {overview.alerts.length ? (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">Alertes</h2>
          <ul className="mt-4 space-y-3">
            {overview.alerts.map((a) => (
              <li key={a.id} className="border-l-2 border-[var(--line)] pl-4">
                <p className="text-sm text-[var(--ink)]">
                  <span className="mr-2 text-[10px] uppercase tracking-wider text-[var(--faint)]">
                    {a.severity}
                  </span>
                  {a.title}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">{a.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        <Link
          href={`/studio/app/${siteId}/radar/inspection`}
          className="ayeba-panel block p-6 transition hover:border-[var(--accent)]"
        >
          <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">
            Inspection d’URL
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Statut d’indexation, crawl, clics et file d’attente pour n’importe quelle URL du domaine.
          </p>
        </Link>
        <Link
          href={`/studio/app/${siteId}/radar/sitemaps`}
          className="ayeba-panel block p-6 transition hover:border-[var(--accent)]"
        >
          <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">Sitemaps</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Soumettez la carte de votre site pour accélérer l’indexation.
          </p>
        </Link>
      </section>

      <section className="mt-14">
        <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">
          Top requêtes
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]">
              <tr>
                <th className="pb-3 font-normal">Requête</th>
                <th className="pb-3 font-normal">Clics</th>
                <th className="pb-3 font-normal">Impr.</th>
                <th className="pb-3 font-normal">CTR</th>
                <th className="pb-3 font-normal">Pos.</th>
              </tr>
            </thead>
            <tbody>
              {queries.map((r) => (
                <tr key={r.query} className="border-t border-[var(--line)]">
                  <td className="py-3 text-[var(--ink)]">{r.query}</td>
                  <td className="py-3 text-[var(--muted)]">{r.clicks}</td>
                  <td className="py-3 text-[var(--muted)]">{r.impressions}</td>
                  <td className="py-3 text-[var(--muted)]">{r.ctr}%</td>
                  <td className="py-3 text-[var(--muted)]">{r.avgPosition ?? "—"}</td>
                </tr>
              ))}
              {!queries.length ? (
                <tr>
                  <td colSpan={5} className="py-6 text-[var(--muted)]">
                    Pas encore de requêtes — les impressions et clics Ayeba apparaîtront ici.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">Pages</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]">
              <tr>
                <th className="pb-3 font-normal">Page</th>
                <th className="pb-3 font-normal">Index</th>
                <th className="pb-3 font-normal">Clics</th>
                <th className="pb-3 font-normal">Impr.</th>
                <th className="pb-3 font-normal">CTR</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((r) => (
                <tr key={r.url} className="border-t border-[var(--line)]">
                  <td className="max-w-[320px] truncate py-3 text-[var(--ink)]" title={r.url}>
                    {r.title}
                  </td>
                  <td className="py-3 text-[var(--muted)]">{r.indexed ? "Oui" : "Non"}</td>
                  <td className="py-3 text-[var(--muted)]">{r.clicks}</td>
                  <td className="py-3 text-[var(--muted)]">{r.impressions}</td>
                  <td className="py-3 text-[var(--muted)]">{r.ctr}%</td>
                </tr>
              ))}
              {!pages.length ? (
                <tr>
                  <td colSpan={5} className="py-6 text-[var(--muted)]">
                    Aucune page encore visible pour ce domaine dans l’index Ayeba.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
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
