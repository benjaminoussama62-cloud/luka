"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import type { StudioSite, YieldOverview, YieldPlacement } from "@/lib/studio/types";

export default function StudioYieldPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [overview, setOverview] = useState<YieldOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/yield/${siteId}/overview`);
    if (!res.ok) return;
    const data = (await res.json()) as { overview: YieldOverview; site: StudioSite };
    setOverview(data.overview);
    setSite(data.site);
  }, [siteId]);

  useEffect(() => {
    if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/yield`);
  }, [ready, user, router, siteId]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function toggleEnabled() {
    if (!overview) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/studio/yield/${siteId}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !overview.enabled }),
    });
    setBusy(false);
    if (res.ok) {
      const data = (await res.json()) as { overview: YieldOverview };
      setOverview(data.overview);
      setMsg(data.overview.enabled ? "Yield activé." : "Yield désactivé.");
    }
  }

  async function togglePlacement(p: YieldPlacement) {
    if (!overview) return;
    setBusy(true);
    const placements = overview.placements.map((x) =>
      x.id === p.id ? { id: x.id, enabled: !x.enabled } : { id: x.id, enabled: x.enabled },
    );
    const res = await fetch(`/api/studio/yield/${siteId}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placements }),
    });
    setBusy(false);
    if (res.ok) {
      const data = (await res.json()) as { overview: YieldOverview };
      setOverview(data.overview);
    }
  }

  if (!site || !overview) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--muted)]">Chargement Yield…</p>
      </StudioAppShell>
    );
  }

  return (
    <StudioAppShell siteId={siteId} siteDomain={site.domain}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Yield</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-[clamp(2rem,5vw,3.2rem)] font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Monétisation native
          </h1>
        </div>
        <button
          type="button"
          className={overview.enabled ? "ayeba-ghost px-3 py-2 text-xs" : "ayeba-cta px-3 py-2 text-xs"}
          disabled={busy}
          onClick={() => void toggleEnabled()}
        >
          {overview.enabled ? "Désactiver Yield" : "Activer Yield"}
        </button>
      </div>

      {msg ? <p className="mt-4 text-sm text-[var(--accent)]">{msg}</p> : null}

      <section className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
        <Metric label="Statut" value={overview.enabled ? "Actif" : "Off"} />
        <Metric label="Impressions 30j" value={String(overview.impressions30d)} />
        <Metric label="Clics 30j" value={String(overview.clicks30d)} />
        <Metric label="CTR 30j" value={`${overview.ctr30d}%`} />
        <Metric label="Revenus 30j" value={`${overview.revenue30dCdf.toLocaleString("fr-FR")} FC`} />
        <Metric label="eCPM" value={`${overview.ecpmCdf.toLocaleString("fr-FR")} FC`} />
      </section>

      <section className="mt-14">
        <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">Emplacements</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Formats natifs Ayeba — performance par slot.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]">
              <tr>
                <th className="pb-3 font-normal">Emplacement</th>
                <th className="pb-3 font-normal">Slot</th>
                <th className="pb-3 font-normal">Actif</th>
                <th className="pb-3 font-normal">Impr.</th>
                <th className="pb-3 font-normal">CTR</th>
                <th className="pb-3 font-normal">Revenus</th>
              </tr>
            </thead>
            <tbody>
              {overview.placements.map((p) => (
                <tr key={p.id} className="border-t border-[var(--line)]">
                  <td className="py-3 text-[var(--ink)]">{p.label}</td>
                  <td className="py-3 text-[var(--muted)]">{p.slot}</td>
                  <td className="py-3">
                    <button
                      type="button"
                      className="ayeba-ghost px-2 py-1 text-[10px]"
                      disabled={busy || !overview.enabled}
                      onClick={() => void togglePlacement(p)}
                    >
                      {p.enabled ? "Oui" : "Non"}
                    </button>
                  </td>
                  <td className="py-3 text-[var(--muted)]">{p.impressions30d}</td>
                  <td className="py-3 text-[var(--muted)]">{p.ctr30d}%</td>
                  <td className="py-3 text-[var(--muted)]">
                    {p.revenue30dCdf.toLocaleString("fr-FR")} FC
                  </td>
                </tr>
              ))}
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
