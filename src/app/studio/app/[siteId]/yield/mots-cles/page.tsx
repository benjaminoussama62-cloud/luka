"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { Badge, DataTable, ModuleNav, SectionTitle } from "@/components/studio/ui";
import { YIELD_NAV } from "@/components/studio/yield-nav";
import type { StudioSite } from "@/lib/studio/types";

type Keyword = {
  id: string; campaignId: string; campaignName: string; keyword: string;
  matchType: string; maxCpc: number | null; status: string;
  impressions: number; clicks: number; cost: number; ctr: number;
};
type CampaignOpt = { id: string; name: string };

const MATCH: Record<string, string> = { broad: "Large", phrase: "Expression", exact: "Exact" };

export default function YieldMotsClesPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOpt[]>([]);
  const [filterCampaign, setFilterCampaign] = useState("");
  const [form, setForm] = useState({ campaignId: "", keyword: "", matchType: "broad", maxCpc: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    const [k, c] = await Promise.all([
      fetch(`/api/studio/yield/${siteId}/keywords${filterCampaign ? `?campaign=${filterCampaign}` : ""}`),
      fetch(`/api/studio/yield/${siteId}/campaigns`),
    ]);
    if (k.ok) { const d = await k.json(); setSite(d.site); setKeywords(d.keywords || []); }
    if (c.ok) {
      const d = await c.json();
      const opts = (d.campaigns || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name }));
      setCampaigns(opts);
      setForm((f) => (f.campaignId || !opts.length ? f : { ...f, campaignId: opts[0].id }));
    }
  }, [siteId, filterCampaign]);

  useEffect(() => { if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/yield/mots-cles`); }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/studio/yield/${siteId}/keywords`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Erreur");
    void load();
  };

  const add = async () => {
    setBusy(true); setMsg("");
    try {
      await post({
        action: "add", campaignId: form.campaignId, keyword: form.keyword,
        matchType: form.matchType, maxCpc: form.maxCpc ? Number(form.maxCpc) : undefined,
      });
      setForm({ ...form, keyword: "", maxCpc: "" });
    } catch (e) { setMsg(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  };

  return (
    <StudioAppShell siteId={siteId} siteDomain={site?.domain}>
      <ModuleNav siteId={siteId} module="yield" items={YIELD_NAV} />
      <div>
        <p className="ayeba-kicker ayeba-kicker-accent">Yield · Mots-clés</p>
        <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          Mots-clés
        </h1>
      </div>

      <section className="ayeba-panel mt-8 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <select className="ayeba-input" value={form.campaignId} onChange={(e) => setForm({ ...form, campaignId: e.target.value })}>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          {!campaigns.length ? <option value="">— créez une campagne d'abord —</option> : null}
        </select>
        <input className="ayeba-input" placeholder="Mot-clé" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} />
        <select className="ayeba-input" value={form.matchType} onChange={(e) => setForm({ ...form, matchType: e.target.value })}>
          <option value="broad">Requête large</option>
          <option value="phrase">Expression exacte</option>
          <option value="exact">Mot-clé exact</option>
        </select>
        <input className="ayeba-input" type="number" min="0" placeholder="CPC max (CDF)" value={form.maxCpc} onChange={(e) => setForm({ ...form, maxCpc: e.target.value })} />
        <button type="button" className="ayeba-btn px-4 py-2 text-xs" disabled={busy || !form.keyword.trim() || !form.campaignId} onClick={() => void add()}>
          {busy ? "Ajout…" : "Ajouter"}
        </button>
      </section>
      {msg ? <p className="mt-4 text-sm text-[var(--accent)]">{msg}</p> : null}

      <section className="mt-10">
        <SectionTitle
          title="Tous les mots-clés"
          aside={
            <select className="ayeba-input h-9 px-2 text-xs" value={filterCampaign} onChange={(e) => setFilterCampaign(e.target.value)}>
              <option value="">Toutes les campagnes</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          }
        />
        <div className="mt-4">
          <DataTable
            columns={["Mot-clé", "Campagne", "Correspondance", "CPC max", "Statut", "Impr.", "Clics", "CTR", "Coût", "Actions"]}
            rows={keywords.map((k) => [
              <span key="k" className="font-medium text-[var(--ink)]">{k.keyword}</span>,
              k.campaignName,
              MATCH[k.matchType] || k.matchType,
              k.maxCpc != null ? `${k.maxCpc.toLocaleString("fr-FR")} CDF` : "—",
              <Badge key="s" tone={k.status === "enabled" ? "good" : "neutral"}>{k.status === "enabled" ? "Actif" : "En pause"}</Badge>,
              k.impressions.toLocaleString("fr-FR"),
              k.clicks.toLocaleString("fr-FR"),
              `${k.ctr}%`,
              `${k.cost.toLocaleString("fr-FR")} CDF`,
              <span key="a" className="flex gap-3">
                <button
                  type="button"
                  className="text-xs text-[var(--accent)] hover:underline"
                  onClick={() => void post({ action: "update", id: k.id, status: k.status === "enabled" ? "paused" : "enabled" }).catch((e: Error) => setMsg(e.message))}
                >
                  {k.status === "enabled" ? "Suspendre" : "Activer"}
                </button>
                <button
                  type="button"
                  className="text-xs text-[var(--danger,#c0392b)] hover:underline"
                  onClick={() => { if (confirm(`Supprimer "${k.keyword}" ?`)) void post({ action: "delete", id: k.id }).catch((e: Error) => setMsg(e.message)); }}
                >
                  Supprimer
                </button>
              </span>,
            ])}
            empty="Aucun mot-clé — ajoutez des mots-clés pour cibler les recherches Ayeba"
          />
        </div>
      </section>
    </StudioAppShell>
  );
}
