"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import type { StudioSite, VelocityOverview } from "@/lib/studio/types";

export default function StudioVelocityPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [overview, setOverview] = useState<VelocityOverview | null>(null);
  const [auditUrl, setAuditUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/velocity/${siteId}/overview`);
    if (!res.ok) return;
    const data = (await res.json()) as { overview: VelocityOverview; site: StudioSite };
    setOverview(data.overview);
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
      body: JSON.stringify({ url: auditUrl }),
    });
    const data = (await res.json()) as { overview?: VelocityOverview; error?: string };
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Audit impossible");
      return;
    }
    if (data.overview) setOverview(data.overview);
    setMsg("Audit terminé.");
  }

  if (!site || !overview) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--muted)]">Chargement Velocity…</p>
      </StudioAppShell>
    );
  }

  return (
    <StudioAppShell siteId={siteId} siteDomain={site.domain}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Velocity</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-[clamp(2rem,5vw,3.2rem)] font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Vitesse & performance
          </h1>
        </div>
        <button type="button" className="ayeba-ghost px-3 py-2 text-xs" onClick={() => void load()}>
          Actualiser
        </button>
      </div>

      <section className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
        <Metric
          label="Score"
          value={overview.latestScore != null ? `${overview.latestScore}/100` : "—"}
        />
        <Metric
          label="TTFB dernier audit"
          value={overview.latestTtfbMs != null ? `${overview.latestTtfbMs} ms` : "—"}
        />
        <Metric label="Audits" value={String(overview.audits.length)} />
      </section>

      <form onSubmit={(e) => void onAudit(e)} className="mt-12">
        <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">
          Lancer un audit
        </h2>
        <input
          className="ayeba-input mt-4 h-11 w-full max-w-xl px-3 text-sm"
          value={auditUrl}
          onChange={(e) => setAuditUrl(e.target.value)}
          placeholder={`https://${site.domain}/`}
        />
        <button type="submit" className="ayeba-cta mt-3 h-10 px-5 text-xs" disabled={busy}>
          {busy ? "Audit…" : "Auditer l’URL"}
        </button>
        {msg ? <p className="mt-3 text-sm text-[var(--accent)]">{msg}</p> : null}
      </form>

      {overview.actionPlan.length ? (
        <section className="mt-14">
          <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">
            Plan d’action priorisé
          </h2>
          <ul className="mt-4 space-y-4">
            {overview.actionPlan.map((f) => (
              <li key={f.id} className="border-l-2 border-[var(--line)] pl-4">
                <p className="text-sm text-[var(--ink)]">
                  <span className="mr-2 text-[10px] uppercase tracking-wider text-[var(--faint)]">
                    {f.severity}
                  </span>
                  {f.title}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">{f.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-14">
        <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">
          Historique des audits
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]">
              <tr>
                <th className="pb-3 font-normal">URL</th>
                <th className="pb-3 font-normal">Score</th>
                <th className="pb-3 font-normal">TTFB</th>
                <th className="pb-3 font-normal">HTML</th>
                <th className="pb-3 font-normal">Date</th>
              </tr>
            </thead>
            <tbody>
              {overview.audits.map((a) => (
                <tr key={a.id} className="border-t border-[var(--line)]">
                  <td className="max-w-[240px] truncate py-3 text-[var(--ink)]" title={a.url}>
                    {a.url}
                  </td>
                  <td className="py-3 text-[var(--muted)]">{a.score}/100</td>
                  <td className="py-3 text-[var(--muted)]">{a.ttfbMs} ms</td>
                  <td className="py-3 text-[var(--muted)]">{Math.round(a.htmlBytes / 1024)} Ko</td>
                  <td className="py-3 text-[var(--muted)]">{a.createdAt.slice(0, 16).replace("T", " ")}</td>
                </tr>
              ))}
              {!overview.audits.length ? (
                <tr>
                  <td colSpan={5} className="py-6 text-[var(--muted)]">
                    Aucun audit — lancez le premier sur votre page d’accueil.
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
