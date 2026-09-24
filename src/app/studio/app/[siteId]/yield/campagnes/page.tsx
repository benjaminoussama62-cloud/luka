"use client";
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { Badge, BarChart, DataTable, Metric, MetricGrid, SectionTitle } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type Campaign = {
  id: string; name: string; type: string; status: string;
  dailyBudget: number; totalBudget: number; budgetSpent: number;
  biddingStrategy: string; maxCpc: number | null;
  impressions: number; clicks: number; ctr: number; conversions: number; cost: number;
  creativesCount: number; startDate: string; endDate: string;
};

const STATUS_LABEL: Record<string, [string, "good" | "warn" | "bad" | "neutral"]> = {
  draft: ["Brouillon", "neutral"],
  active: ["Active", "good"],
  paused: ["En pause", "warn"],
  completed: ["Terminée", "neutral"],
};

export default function YieldCampagnesPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [report, setReport] = useState<Array<{ day: string; impressions: number; clicks: number }>>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", type: "performance", dailyBudget: "10000", totalBudget: "300000",
    biddingStrategy: "manual_cpc", maxCpc: "",
  });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/yield/${siteId}/campaigns?days=30`);
    if (res.ok) {
      const d = await res.json();
      setSite(d.site); setCampaigns(d.campaigns || []); setReport(d.report || []);
    }
  }, [siteId]);

  useEffect(() => { if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/yield/campagnes`); }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  const totals = campaigns.reduce(
    (a, c) => ({
      impressions: a.impressions + c.impressions,
      clicks: a.clicks + c.clicks,
      cost: a.cost + c.cost,
      conversions: a.conversions + c.conversions,
    }),
    { impressions: 0, clicks: 0, cost: 0, conversions: 0 },
  );

  const create = async () => {
    setBusy(true); setMsg("");
    try {
      const res = await fetch(`/api/studio/yield/${siteId}/campaigns`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, type: form.type,
          dailyBudget: Number(form.dailyBudget), totalBudget: Number(form.totalBudget),
          biddingStrategy: form.biddingStrategy,
          maxCpc: form.maxCpc ? Number(form.maxCpc) : undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Erreur");
      setShowForm(false); setForm({ ...form, name: "" });
      setMsg("Campagne créée en brouillon — ajoutez des annonces et des mots-clés, puis activez-la.");
      void load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  };

  const setStatus = async (id: string, status: string) => {
    await fetch(`/api/studio/yield/${siteId}/campaigns`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", id, status }),
    });
    void load();
  };

  return (
    <StudioAppShell siteId={siteId} siteDomain={site?.domain}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Yield · Campagnes</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Campagnes publicitaires
          </h1>
        </div>
        <button type="button" className="ayeba-cta px-4 py-2 text-xs" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Annuler" : "+ Nouvelle campagne"}
        </button>
      </div>

      {showForm ? (
        <section className="ayeba-panel mt-6 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <input className="ayeba-input" placeholder="Nom de la campagne" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="ayeba-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="performance">Performance</option>
            <option value="search">Recherche</option>
            <option value="display">Display</option>
            <option value="video">Vidéo</option>
            <option value="shopping">Shopping</option>
          </select>
          <select className="ayeba-input" value={form.biddingStrategy} onChange={(e) => setForm({ ...form, biddingStrategy: e.target.value })}>
            <option value="manual_cpc">CPC manuel</option>
            <option value="maximize_clicks">Maximiser les clics</option>
            <option value="target_cpa">CPA cible</option>
            <option value="target_roas">ROAS cible</option>
          </select>
          <label className="text-xs text-[var(--muted)]">
            Budget quotidien (CDF)
            <input className="ayeba-input mt-1" type="number" min="0" value={form.dailyBudget} onChange={(e) => setForm({ ...form, dailyBudget: e.target.value })} />
          </label>
          <label className="text-xs text-[var(--muted)]">
            Budget total (CDF)
            <input className="ayeba-input mt-1" type="number" min="0" value={form.totalBudget} onChange={(e) => setForm({ ...form, totalBudget: e.target.value })} />
          </label>
          <label className="text-xs text-[var(--muted)]">
            CPC max (CDF, optionnel)
            <input className="ayeba-input mt-1" type="number" min="0" value={form.maxCpc} onChange={(e) => setForm({ ...form, maxCpc: e.target.value })} />
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="button" className="ayeba-btn px-4 py-2 text-xs" disabled={busy || !form.name.trim()} onClick={() => void create()}>
              {busy ? "Création…" : "Créer la campagne"}
            </button>
          </div>
        </section>
      ) : null}
      {msg ? <p className="mt-4 text-sm text-[var(--accent)]">{msg}</p> : null}

      <div className="mt-8">
        <MetricGrid>
          <Metric label="Dépensé" value={`${totals.cost.toLocaleString("fr-FR")} CDF`} />
          <Metric label="Impressions" value={totals.impressions.toLocaleString("fr-FR")} />
          <Metric label="Clics" value={totals.clicks.toLocaleString("fr-FR")} />
          <Metric label="CTR" value={totals.impressions > 0 ? `${Math.round((totals.clicks / totals.impressions) * 1000) / 10}%` : "—"} />
          <Metric label="Conversions" value={String(totals.conversions)} />
        </MetricGrid>
      </div>

      <section className="mt-10">
        <SectionTitle title="Diffusion quotidienne · 30j" />
        <div className="ayeba-panel mt-4 p-5">
          <BarChart points={report.map((r) => ({ label: r.day.slice(5), value: r.clicks }))} height={120} />
          {!report.length ? <p className="mt-3 text-center text-xs text-[var(--muted)]">Aucune diffusion — activez une campagne avec des annonces approuvées</p> : null}
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle title="Vos campagnes" />
        <div className="mt-4">
          <DataTable
            columns={["Campagne", "Statut", "Budget/jour", "Dépensé", "Impr.", "Clics", "CTR", "Annonces", "Actions"]}
            rows={campaigns.map((c) => [
              <span key="n" className="block max-w-[180px] truncate font-medium text-[var(--ink)]" title={c.name}>{c.name}</span>,
              <Badge key="s" tone={STATUS_LABEL[c.status]?.[1] || "neutral"}>{STATUS_LABEL[c.status]?.[0] || c.status}</Badge>,
              `${c.dailyBudget.toLocaleString("fr-FR")} CDF`,
              `${c.budgetSpent.toLocaleString("fr-FR")} CDF`,
              c.impressions.toLocaleString("fr-FR"),
              c.clicks.toLocaleString("fr-FR"),
              `${c.ctr}%`,
              String(c.creativesCount),
              <span key="a" className="flex gap-3">
                {c.status !== "active" && c.status !== "completed" ? (
                  <button type="button" className="text-xs text-[var(--accent)] hover:underline" onClick={() => void setStatus(c.id, "active")}>Activer</button>
                ) : null}
                {c.status === "active" ? (
                  <button type="button" className="text-xs text-[var(--muted)] hover:underline" onClick={() => void setStatus(c.id, "paused")}>Suspendre</button>
                ) : null}
                {c.status !== "completed" ? (
                  <button type="button" className="text-xs text-[var(--faint)] hover:underline" onClick={() => void setStatus(c.id, "completed")}>Terminer</button>
                ) : null}
              </span>,
            ])}
            empty="Aucune campagne — créez votre première campagne publicitaire"
          />
        </div>
      </section>
    </StudioAppShell>
  );
}
