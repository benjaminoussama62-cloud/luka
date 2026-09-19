"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { Badge, DataTable, ModuleNav, SectionTitle } from "@/components/studio/ui";
import { YIELD_NAV } from "@/components/studio/yield-nav";
import type { StudioSite } from "@/lib/studio/types";

type Creative = {
  id: string; campaignId: string; campaignName: string; format: string; size: string;
  title: string; description: string; imageUrl: string | null; landingUrl: string;
  displayUrl: string; status: string; rejectedReason: string | null;
  impressions: number; clicks: number; ctr: number;
};
type CampaignOpt = { id: string; name: string };

const STATUS: Record<string, [string, "good" | "warn" | "bad" | "neutral"]> = {
  pending: ["En révision", "warn"],
  approved: ["Approuvée", "good"],
  rejected: ["Refusée", "bad"],
  active: ["Active", "good"],
  paused: ["En pause", "neutral"],
};

export default function YieldAnnoncesPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOpt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ campaignId: "", title: "", description: "", landingUrl: "", imageUrl: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    const [c, k] = await Promise.all([
      fetch(`/api/studio/yield/${siteId}/creatives`),
      fetch(`/api/studio/yield/${siteId}/campaigns`),
    ]);
    if (c.ok) { const d = await c.json(); setSite(d.site); setCreatives(d.creatives || []); }
    if (k.ok) {
      const d = await k.json();
      setCampaigns((d.campaigns || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })));
    }
  }, [siteId]);

  useEffect(() => { if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/yield/annonces`); }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);
  useEffect(() => { if (!form.campaignId && campaigns.length) setForm((f) => ({ ...f, campaignId: campaigns[0].id })); }, [campaigns, form.campaignId]);

  const create = async () => {
    setBusy(true); setMsg("");
    try {
      const res = await fetch(`/api/studio/yield/${siteId}/creatives`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: form.campaignId, title: form.title, description: form.description,
          landingUrl: form.landingUrl, imageUrl: form.imageUrl || undefined,
          format: "display", size: "responsive",
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Erreur");
      setShowForm(false);
      setForm({ ...form, title: "", description: "", landingUrl: "", imageUrl: "" });
      setMsg("Annonce soumise — elle sera diffusée après validation.");
      void load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  };

  return (
    <StudioAppShell siteId={siteId} siteDomain={site?.domain}>
      <ModuleNav siteId={siteId} module="yield" items={YIELD_NAV} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Yield · Annonces</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Annonces
          </h1>
        </div>
        <button type="button" className="ayeba-cta px-4 py-2 text-xs" disabled={!campaigns.length} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Annuler" : "+ Nouvelle annonce"}
        </button>
      </div>
      {!campaigns.length ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Créez d'abord une campagne dans l'onglet Campagnes.</p>
      ) : null}

      {showForm ? (
        <section className="ayeba-panel mt-6 grid gap-3 p-5 sm:grid-cols-2">
          <select className="ayeba-input" value={form.campaignId} onChange={(e) => setForm({ ...form, campaignId: e.target.value })}>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="ayeba-input" placeholder="URL de destination (landing)" value={form.landingUrl} onChange={(e) => setForm({ ...form, landingUrl: e.target.value })} />
          <input className="ayeba-input sm:col-span-2" placeholder="Titre de l'annonce" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="ayeba-input sm:col-span-2" rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="ayeba-input sm:col-span-2" placeholder="URL de l'image (optionnel)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          <div className="sm:col-span-2">
            <button type="button" className="ayeba-btn px-4 py-2 text-xs" disabled={busy || !form.title.trim() || !form.landingUrl.trim()} onClick={() => void create()}>
              {busy ? "Envoi…" : "Créer l'annonce"}
            </button>
          </div>
        </section>
      ) : null}
      {msg ? <p className="mt-4 text-sm text-[var(--accent)]">{msg}</p> : null}

      <section className="mt-10">
        <SectionTitle title="Toutes les annonces" />
        <div className="mt-4">
          <DataTable
            columns={["Annonce", "Campagne", "Statut", "Impr.", "Clics", "CTR"]}
            rows={creatives.map((cr) => [
              <span key="t">
                <span className="block max-w-[240px] truncate font-medium text-[var(--ink)]" title={cr.title}>{cr.title}</span>
                <span className="block max-w-[240px] truncate text-xs text-[var(--faint)]" title={cr.landingUrl}>{cr.displayUrl || cr.landingUrl}</span>
                {cr.rejectedReason ? <span className="text-xs text-[var(--danger,#c0392b)]">{cr.rejectedReason}</span> : null}
              </span>,
              cr.campaignName,
              <Badge key="s" tone={STATUS[cr.status]?.[1] || "neutral"}>{STATUS[cr.status]?.[0] || cr.status}</Badge>,
              cr.impressions.toLocaleString("fr-FR"),
              cr.clicks.toLocaleString("fr-FR"),
              `${cr.ctr}%`,
            ])}
            empty="Aucune annonce"
          />
        </div>
      </section>
    </StudioAppShell>
  );
}
