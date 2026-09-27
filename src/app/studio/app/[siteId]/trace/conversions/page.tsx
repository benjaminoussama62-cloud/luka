"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { DataTable, Metric, MetricGrid, SectionTitle } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type Goal = {
  id: string;
  name: string;
  event_type: string;
  value: number;
  status: string;
  fires: number;
  total_value: number;
  created_at: string;
};

type ConvData = {
  conversions: {
    funnel: Array<{ step: string; users: number; rate: number }>;
    attributed: { conversions: number; value: number };
  };
  site: StudioSite;
};

const EVENT_PRESETS = [
  "conversion", "purchase", "signup", "lead", "add_to_cart",
  "begin_checkout", "generate_lead", "click", "event",
];

export default function TraceConversionsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ConvData | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [days, setDays] = useState(28);
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState("conversion");
  const [value, setValue] = useState("0");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!siteId) return;
    const [convRes, goalsRes] = await Promise.all([
      fetch(`/api/studio/trace/${siteId}/analytics?section=conversions&days=${days}`),
      fetch(`/api/studio/trace/${siteId}/goals?days=${days}`),
    ]);
    if (convRes.ok) setData(await convRes.json());
    if (goalsRes.ok) {
      const g = await goalsRes.json();
      setGoals(g.goals || []);
    }
  }, [siteId, days]);

  useEffect(() => {
    if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/trace/conversions`);
  }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  const createGoal = async () => {
    if (!name.trim() || !eventType.trim()) return setMsg("Nom et type d'événement requis.");
    setBusy(true); setMsg("");
    try {
      const res = await fetch(`/api/studio/trace/${siteId}/goals`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: name.trim(),
          eventType: eventType.trim(),
          value: Number(value) || 0,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Erreur");
      setName(""); setValue("0"); setMsg("Objectif créé.");
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const mutateGoal = async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/studio/trace/${siteId}/goals`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: patch.delete ? "delete" : "update", id, ...patch }),
    });
    if (res.ok) void load();
  };

  if (!data) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--muted)]">Chargement…</p>
      </StudioAppShell>
    );
  }
  const c = data.conversions;
  const maxUsers = Math.max(1, ...c.funnel.map((f) => f.users));
  const goalFires = goals.reduce((s, g) => s + g.fires, 0);
  const goalValue = goals.reduce((s, g) => s + g.total_value, 0);

  return (
    <StudioAppShell siteId={siteId} siteDomain={data.site.domain}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Trace · Conversions</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Objectifs & conversions
          </h1>
        </div>
        <select className="ayeba-input h-9 px-2 text-xs" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 14, 28, 90].map((d) => <option key={d} value={d}>{d} jours</option>)}
        </select>
      </div>

      <div className="mt-8">
        <MetricGrid>
          <Metric label="Objectifs déclenchés" value={String(goalFires)} hint={`${goals.length} objectif(s)`} />
          <Metric label="Valeur objectifs" value={goalValue.toLocaleString("fr")} />
          <Metric label="Conversions attribuées" value={String(c.attributed.conversions)} />
          <Metric label="Valeur attribuée" value={String(c.attributed.value)} hint="points de contact convertis" />
        </MetricGrid>
      </div>

      <section className="mt-10">
        <SectionTitle title="Nouvel objectif de conversion" />
        <p className="mt-2 text-sm text-[var(--muted)]">
          Un objectif compte les événements Trace dont le <code className="text-[var(--ink)]">event_type</code> correspond
          (ex. <code className="text-[var(--ink)]">conversion</code>, <code className="text-[var(--ink)]">purchase</code>).
          Déclenchez-les via <code className="text-[var(--ink)]">ayebaTrack(&quot;purchase&quot;, {"{ value: 50 }"})</code> ou une balise de type Conversion.
        </p>
        <div className="ayeba-panel mt-4 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className="ayeba-input"
            placeholder="Nom (ex. Achat)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="ayeba-input"
            list="trace-event-types"
            placeholder="Type d'événement"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
          />
          <datalist id="trace-event-types">
            {EVENT_PRESETS.map((t) => <option key={t} value={t} />)}
          </datalist>
          <input
            className="ayeba-input"
            type="number"
            min={0}
            step="0.01"
            placeholder="Valeur par défaut"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="button" className="ayeba-btn px-4 py-2 text-xs" disabled={busy} onClick={() => void createGoal()}>
              {busy ? "Création…" : "Créer l'objectif"}
            </button>
            {msg ? <span className="ml-3 text-xs text-[var(--muted)]">{msg}</span> : null}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle title="Objectifs configurés" />
        <div className="mt-4">
          <DataTable
            columns={["Nom", "Événement", "Valeur", "Déclenchements", "Total", "Statut", "Actions"]}
            rows={goals.map((g) => [
              <span key="n" className="font-medium text-[var(--ink)]">{g.name}</span>,
              <code key="e" className="text-xs">{g.event_type}</code>,
              String(g.value),
              String(g.fires),
              g.total_value.toLocaleString("fr"),
              <span key="s" className={`text-[10px] uppercase ${g.status === "active" ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                {g.status === "active" ? "Actif" : "En pause"}
              </span>,
              <span key="a" className="flex gap-3">
                <button
                  type="button"
                  className="text-xs text-[var(--accent)] hover:underline"
                  onClick={() => void mutateGoal(g.id, { status: g.status === "active" ? "paused" : "active" })}
                >
                  {g.status === "active" ? "Suspendre" : "Activer"}
                </button>
                <button
                  type="button"
                  className="text-xs text-[var(--danger,#c0392b)] hover:underline"
                  onClick={() => {
                    if (confirm(`Supprimer l'objectif « ${g.name} » ?`)) void mutateGoal(g.id, { delete: true });
                  }}
                >
                  Supprimer
                </button>
              </span>,
            ])}
            empty="Aucun objectif — créez-en un pour compter les conversions depuis les événements Trace."
          />
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle title="Entonnoir d'engagement" />
        <div className="ayeba-panel mt-4 space-y-3 p-6">
          {c.funnel.map((f) => (
            <div key={f.step} className="flex items-center gap-4">
              <span className="w-36 shrink-0 text-sm text-[var(--ink)]">{f.step}</span>
              <div className="h-6 flex-1 rounded-sm bg-[var(--line)]">
                <div
                  className="h-full rounded-sm bg-[var(--accent)] opacity-80 transition-all"
                  style={{ width: `${Math.max(1, (f.users / maxUsers) * 100)}%` }}
                />
              </div>
              <span className="w-28 shrink-0 text-right text-sm text-[var(--muted)]">
                {f.users} <span className="text-[var(--faint)]">({f.rate}%)</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle title="Détail entonnoir" />
        <div className="mt-4 max-w-2xl">
          <DataTable
            columns={["Étape", "Utilisateurs", "Taux"]}
            rows={c.funnel.map((f) => [f.step, String(f.users), `${f.rate}%`])}
            empty="Aucune donnée"
          />
        </div>
      </section>
    </StudioAppShell>
  );
}
