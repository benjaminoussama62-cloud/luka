"use client";
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { DataTable, SectionTitle } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type Segment = {
  id: string; name: string; description?: string;
  rules: Array<{ field: string; operator: string; value: string | string[] | number }>;
  size?: number | null; updated_at?: string; updatedAt?: string;
};

export default function YieldAudiencesPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "remarketing", countries: "", ageMin: "", ageMax: "", interests: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/yield/${siteId}/audiences`);
    if (res.ok) { const d = await res.json(); setSite(d.site); setSegments(d.audiences || []); }
  }, [siteId]);

  useEffect(() => { if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/yield/audiences`); }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  const create = async () => {
    setBusy(true); setMsg("");
    try {
      const criteria: Record<string, unknown> = {};
      if (form.countries.trim()) criteria.countries = form.countries.split(",").map((s) => s.trim()).filter(Boolean);
      if (form.interests.trim()) criteria.interests = form.interests.split(",").map((s) => s.trim()).filter(Boolean);
      if (form.ageMin || form.ageMax) {
        criteria.ageRange = { min: Number(form.ageMin) || 18, max: Number(form.ageMax) || 65 };
      }
      const res = await fetch(`/api/studio/yield/${siteId}/audiences`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, type: form.type, criteria }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Erreur");
      setShowForm(false); setForm({ ...form, name: "", countries: "", interests: "" });
      setMsg("Segment créé — il pourra être ciblé depuis vos campagnes.");
      void load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  };

  const TYPES: Record<string, string> = {
    remarketing: "Remarketing", affinity: "Affinité", in_market: "Intention d'achat",
    custom: "Personnalisée", similar: "Similaire",
  };
  const FIELD_LABEL: Record<string, string> = {
    demographic: "Démographie", interest: "Intérêts", behavior: "Comportement", custom: "Personnalisé",
  };
  const ruleStr = (s: Segment) => {
    if (!Array.isArray(s.rules) || !s.rules.length) return s.description || "—";
    return s.rules
      .map((r) => `${FIELD_LABEL[r.field] || r.field}: ${Array.isArray(r.value) ? r.value.join(", ") : r.value}`)
      .join(" · ");
  };

  return (
    <StudioAppShell siteId={siteId} siteDomain={site?.domain}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ayeba-kicker ayeba-kicker-accent">Yield · Audiences</p>
          <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Segments d'audience
          </h1>
        </div>
        <button type="button" className="ayeba-cta px-4 py-2 text-xs" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Annuler" : "+ Nouveau segment"}
        </button>
      </div>

      {showForm ? (
        <section className="ayeba-panel mt-6 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <input className="ayeba-input" placeholder="Nom du segment" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="ayeba-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input className="ayeba-input" placeholder="Pays (CD, FR, BE…)" value={form.countries} onChange={(e) => setForm({ ...form, countries: e.target.value })} />
          <input className="ayeba-input" type="number" placeholder="Âge min" value={form.ageMin} onChange={(e) => setForm({ ...form, ageMin: e.target.value })} />
          <input className="ayeba-input" type="number" placeholder="Âge max" value={form.ageMax} onChange={(e) => setForm({ ...form, ageMax: e.target.value })} />
          <input className="ayeba-input" placeholder="Centres d'intérêt (sport, tech…)" value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} />
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="button" className="ayeba-btn px-4 py-2 text-xs" disabled={busy || !form.name.trim()} onClick={() => void create()}>
              {busy ? "Création…" : "Créer le segment"}
            </button>
          </div>
        </section>
      ) : null}
      {msg ? <p className="mt-4 text-sm text-[var(--accent)]">{msg}</p> : null}

      <section className="mt-10">
        <SectionTitle title="Vos segments" />
        <div className="mt-4">
          <DataTable
            columns={["Segment", "Description", "Règles", "Estimation"]}
            rows={segments.map((s) => [
              <span key="n" className="font-medium text-[var(--ink)]">{s.name}</span>,
              <span key="d" className="block max-w-[200px] truncate text-xs text-[var(--muted)]" title={s.description}>{s.description || "—"}</span>,
              <span key="c" className="block max-w-[280px] truncate text-xs text-[var(--muted)]" title={ruleStr(s)}>{ruleStr(s)}</span>,
              s.size != null ? s.size.toLocaleString("fr-FR") : "—",
            ])}
            empty="Aucun segment — créez des audiences pour cibler vos campagnes"
          />
        </div>
      </section>
    </StudioAppShell>
  );
}
