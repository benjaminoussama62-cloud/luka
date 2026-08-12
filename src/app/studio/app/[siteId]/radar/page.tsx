"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import type {
  RadarInspectResult,
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
  const [inspectUrl, setInspectUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [inspection, setInspection] = useState<RadarInspectResult | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      setSitemapUrl(data.site.sitemapUrl || `https://${data.site.domain}/sitemap.xml`);
      setInspectUrl(`https://${data.site.domain}/`);
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

  async function onInspect(e: FormEvent, enqueue = false) {
    e.preventDefault();
    setBusy(true);
    setActionMsg(null);
    const res = await fetch(`/api/studio/radar/${siteId}/inspect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: inspectUrl, enqueue }),
    });
    const data = (await res.json()) as {
      inspection?: RadarInspectResult;
      enqueued?: { url: string };
      error?: string;
    };
    setBusy(false);
    if (!res.ok) {
      setActionMsg(data.error || "Inspection impossible");
      return;
    }
    setInspection(data.inspection || null);
    if (data.enqueued) {
      setActionMsg(`Crawl priorisé : ${data.enqueued.url}`);
      void load();
    }
  }

  async function onSitemap(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setActionMsg(null);
    const res = await fetch(`/api/studio/radar/${siteId}/sitemap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sitemapUrl }),
    });
    const data = (await res.json()) as { urlsEnqueued?: number; error?: string };
    setBusy(false);
    if (!res.ok) {
      setActionMsg(data.error || "Sitemap refusé");
      return;
    }
    setActionMsg(`${data.urlsEnqueued ?? 0} URL(s) mises en file depuis le sitemap.`);
    void load();
  }

  if (!site || !overview) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--muted)]">Chargement Radar…</p>
      </StudioAppShell>
    );
  }

  return (
    <StudioAppShell siteId={siteId} siteDomain={site.domain}>
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
        {actionMsg ? <p className="mt-3 text-sm text-[var(--accent)]">{actionMsg}</p> : null}
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

      <section className="mt-12 grid gap-12 lg:grid-cols-2">
        <form onSubmit={(e) => void onSitemap(e)}>
          <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">Sitemap</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Soumettez la carte de votre site pour accélérer l’indexation.
          </p>
          <input
            className="ayeba-input mt-4 h-11 w-full px-3 text-sm"
            value={sitemapUrl}
            onChange={(e) => setSitemapUrl(e.target.value)}
            placeholder="https://exemple.com/sitemap.xml"
          />
          <button type="submit" className="ayeba-cta mt-3 h-10 px-5 text-xs" disabled={busy}>
            Soumettre le sitemap
          </button>
        </form>

        <form onSubmit={(e) => void onInspect(e, false)}>
          <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">
            Inspection d’URL
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Statut d’indexation, crawl, clics et file d’attente.
          </p>
          <input
            className="ayeba-input mt-4 h-11 w-full px-3 text-sm"
            value={inspectUrl}
            onChange={(e) => setInspectUrl(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" className="ayeba-ghost h-10 px-4 text-xs" disabled={busy}>
              Inspecter
            </button>
            <button
              type="button"
              className="ayeba-cta h-10 px-4 text-xs"
              disabled={busy}
              onClick={() => {
                const fake = { preventDefault() {} } as FormEvent;
                void onInspect(fake, true);
              }}
            >
              Inspecter + prioriser crawl
            </button>
          </div>
          {inspection ? (
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Pair k="Indexée" v={inspection.indexed ? "Oui" : "Non"} />
              <Pair k="File" v={inspection.queueStatus || "—"} />
              <Pair k="Clics 30j" v={String(inspection.clicks30d)} />
              <Pair k="Impressions 30j" v={String(inspection.impressions30d)} />
              <Pair k="Titre" v={inspection.title || "—"} />
              <Pair k="Crawl" v={inspection.crawledAt?.slice(0, 19) || "—"} />
            </dl>
          ) : null}
        </form>
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

function Pair({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]">{k}</dt>
      <dd className="mt-1 text-[var(--ink)]">{v}</dd>
    </div>
  );
}
