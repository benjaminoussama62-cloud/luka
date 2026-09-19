"use client";
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { Badge, DataTable, ModuleNav, SectionTitle } from "@/components/studio/ui";
import { RADAR_NAV } from "@/components/studio/radar-nav";
import type { StudioSite } from "@/lib/studio/types";

type Sitemap = {
  sitemap_url: string; status: string; discovered_count: number;
  last_error: string | null; submitted_at: string; last_read: string | null;
};

export default function RadarSitemapsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [sitemaps, setSitemaps] = useState<Sitemap[]>([]);
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/radar/${siteId}/sitemap`);
    if (res.ok) {
      const d = await res.json();
      setSite(d.site); setSitemaps(d.sitemaps || []);
      setUrl((prev) => prev || d.site.sitemapUrl || `https://${d.site.domain}/sitemap.xml`);
    }
  }, [siteId]);

  useEffect(() => { if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/radar/sitemaps`); }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const res = await fetch(`/api/studio/radar/${siteId}/sitemap`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sitemapUrl: url }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Sitemap refusé");
      setMsg(
        d.status === "success"
          ? `Sitemap lu : ${d.discoveredCount} URL(s) découvertes et mises en file de crawl.`
          : `Sitemap enregistré mais illisible : ${d.error || "erreur"}`,
      );
      void load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erreur");
    } finally { setBusy(false); }
  };

  return (
    <StudioAppShell siteId={siteId} siteDomain={site?.domain}>
      <ModuleNav siteId={siteId} module="radar" items={RADAR_NAV} />
      <div>
        <p className="ayeba-kicker ayeba-kicker-accent">Radar · Sitemaps</p>
        <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          Sitemaps
        </h1>
      </div>

      <form onSubmit={(e) => void submit(e)} className="ayeba-panel mt-8 p-5">
        <p className="text-sm text-[var(--muted)]">
          Le sitemap est téléchargé et analysé immédiatement — les URLs découvertes rejoignent la file de crawl réelle.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            className="ayeba-input h-11 flex-1 px-3 text-sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemple.com/sitemap.xml"
          />
          <button type="submit" className="ayeba-cta h-11 px-5 text-xs" disabled={busy}>
            {busy ? "Lecture…" : "Soumettre"}
          </button>
        </div>
        {msg ? <p className="mt-3 text-sm text-[var(--accent)]">{msg}</p> : null}
      </form>

      <section className="mt-10">
        <SectionTitle title="Sitemaps soumis" />
        <div className="mt-4">
          <DataTable
            columns={["Sitemap", "Statut", "URLs découvertes", "Dernière lecture", "Soumis le"]}
            rows={sitemaps.map((s) => [
              <span key="u" className="block max-w-[320px] truncate" title={s.sitemap_url}>{s.sitemap_url}</span>,
              <Badge key="s" tone={s.status === "success" ? "good" : "bad"}>
                {s.status === "success" ? "Lu" : `Erreur${s.last_error ? ` — ${s.last_error}` : ""}`}
              </Badge>,
              String(s.discovered_count),
              s.last_read?.slice(0, 16).replace("T", " ") || "—",
              s.submitted_at?.slice(0, 10) || "—",
            ])}
            empty="Aucun sitemap soumis"
          />
        </div>
      </section>
    </StudioAppShell>
  );
}
