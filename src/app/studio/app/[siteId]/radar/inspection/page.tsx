"use client";
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { DataTable, ModuleNav, SectionTitle } from "@/components/studio/ui";
import { RADAR_NAV } from "@/components/studio/radar-nav";
import type { RadarInspectResult, StudioSite } from "@/lib/studio/types";

type InspectionRow = {
  url: string; indexed: number; title: string | null; crawled_at: string | null;
  in_queue: number; queue_status: string | null; seo_score: number | null;
  word_count: number; internal_links: number; external_links: number; last_updated: string;
};

export default function RadarInspectionPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [history, setHistory] = useState<InspectionRow[]>([]);
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<RadarInspectResult | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/radar/${siteId}/inspections`);
    if (res.ok) {
      const d = await res.json();
      setSite(d.site); setHistory(d.inspections || []);
      setUrl((prev) => prev || `https://${d.site.domain}/`);
    }
  }, [siteId]);

  useEffect(() => { if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/radar/inspection`); }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  const inspect = async (e: FormEvent, enqueue = false) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const res = await fetch(`/api/studio/radar/${siteId}/inspect`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, enqueue }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Inspection impossible");
      setResult(d.inspection || null);
      if (d.enqueued) setMsg(`Crawl priorisé : ${d.enqueued.url}`);
      void load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erreur");
    } finally { setBusy(false); }
  };

  return (
    <StudioAppShell siteId={siteId} siteDomain={site?.domain}>
      <ModuleNav siteId={siteId} module="radar" items={RADAR_NAV} />
      <div>
        <p className="ayeba-kicker ayeba-kicker-accent">Radar · Inspection d'URL</p>
        <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          Inspecter une URL
        </h1>
      </div>

      <form onSubmit={(e) => void inspect(e, false)} className="ayeba-panel mt-8 p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="ayeba-input h-11 flex-1 px-3 text-sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={`https://${site?.domain || "exemple.com"}/page`}
          />
          <div className="flex gap-2">
            <button type="submit" className="ayeba-ghost h-11 px-4 text-xs" disabled={busy}>
              Inspecter
            </button>
            <button
              type="button"
              className="ayeba-cta h-11 px-4 text-xs"
              disabled={busy}
              onClick={(e) => void inspect(e as unknown as FormEvent, true)}
            >
              Inspecter + crawl
            </button>
          </div>
        </div>
        {msg ? <p className="mt-3 text-sm text-[var(--accent)]">{msg}</p> : null}
      </form>

      {result ? (
        <section className="ayeba-panel mt-6 p-6">
          <div className="flex items-center gap-3">
            <span className={`inline-block h-3 w-3 rounded-full ${result.indexed ? "bg-[var(--accent)]" : "bg-[var(--danger,#c0392b)]"}`} />
            <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">
              {result.indexed ? "L'URL est indexée" : "L'URL n'est pas indexée"}
            </h2>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Pair k="URL" v={result.url} />
            <Pair k="Titre indexé" v={result.title || "—"} />
            <Pair k="Dernier crawl" v={result.crawledAt?.slice(0, 19).replace("T", " ") || "Jamais"} />
            <Pair k="File de crawl" v={result.queueStatus || "—"} />
            <Pair k="Clics (30j)" v={String(result.clicks30d)} />
            <Pair k="Impressions (30j)" v={String(result.impressions30d)} />
          </dl>
          {result.snippet ? (
            <p className="mt-4 border-t border-[var(--line)] pt-4 text-sm text-[var(--muted)]">
              Extrait indexé : {result.snippet}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="mt-10">
        <SectionTitle title="Historique des inspections" />
        <div className="mt-4">
          <DataTable
            columns={["URL", "Indexée", "Dernier crawl", "File", "Score SEO", "Liens int./ext."]}
            rows={history.map((h) => [
              <span key="u" className="block max-w-[280px] truncate" title={h.url}>{h.url}</span>,
              h.indexed ? "Oui" : "Non",
              h.crawled_at?.slice(0, 10) || "—",
              h.queue_status || "—",
              h.seo_score != null ? String(Math.round(h.seo_score)) : "—",
              `${h.internal_links}/${h.external_links}`,
            ])}
            empty="Aucune inspection enregistrée"
          />
        </div>
      </section>
    </StudioAppShell>
  );
}

function Pair({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]">{k}</dt>
      <dd className="mt-1 truncate text-[var(--ink)]" title={v}>{v}</dd>
    </div>
  );
}
