"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { DataTable, SectionTitle } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type TagRule = {
  id: string; name: string; tag_type: string; trigger_type: string;
  trigger_value: string; status: string; created_at: string;
};

const TAG_TYPES: Array<[string, string]> = [
  ["pageview", "Vue de page"], ["event", "Événement"], ["scroll", "Profondeur de scroll"],
  ["click", "Clic"], ["conversion", "Conversion"], ["custom", "Personnalisé"],
];
const TRIGGERS: Array<[string, string]> = [
  ["all_pages", "Toutes les pages"], ["path_contains", "Chemin contient"],
  ["event_name", "Nom d'événement"], ["scroll_depth", "Profondeur de scroll"],
  ["click_element", "Élément cliqué (sélecteur CSS)"],
];

export default function TraceTagsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [traceKey, setTraceKey] = useState("");
  const [rules, setRules] = useState<TagRule[]>([]);
  const [name, setName] = useState("");
  const [tagType, setTagType] = useState("event");
  const [triggerType, setTriggerType] = useState("all_pages");
  const [triggerValue, setTriggerValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/trace/${siteId}/tags`);
    if (res.ok) {
      const d = await res.json();
      setSite(d.site); setRules(d.rules || []); setTraceKey(d.traceKey || "");
    }
  }, [siteId]);

  useEffect(() => { if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/trace/tags`); }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  const snippet = traceKey
    ? `<script async src="${typeof window !== "undefined" ? window.location.origin : ""}/api/studio/trace/script?k=${traceKey}"></script>`
    : "";

  const create = async () => {
    if (!name.trim()) return setMsg("Nom requis.");
    setBusy(true); setMsg("");
    try {
      const res = await fetch(`/api/studio/trace/${siteId}/tags`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", name: name.trim(), tagType, triggerType, triggerValue }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Erreur");
      setName(""); setTriggerValue(""); setMsg("Balise créée."); void load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  };

  const mutate = async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/studio/trace/${siteId}/tags`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: patch.delete ? "delete" : "update", id, ...patch }),
    });
    if (res.ok) void load();
  };

  return (
    <StudioAppShell siteId={siteId} siteDomain={site?.domain}>
      <div>
        <p className="ayeba-kicker ayeba-kicker-accent">Trace · Tag Manager</p>
        <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          Balises & installation
        </h1>
      </div>

      <section className="mt-8">
        <SectionTitle title="Snippet d'installation" />
        <div className="ayeba-panel mt-4 p-5">
          <p className="text-sm text-[var(--muted)]">
            Collez ce script dans le <code className="text-[var(--ink)]">&lt;head&gt;</code> de votre site.
            Il collecte automatiquement les pages vues, sessions, événements et les balises configurées ci-dessous.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <code className="ayeba-panel-soft block flex-1 overflow-x-auto p-3 text-xs text-[var(--ink)]">{snippet}</code>
            <button
              type="button"
              className="ayeba-ghost shrink-0 px-3 py-2 text-xs"
              onClick={async () => { await navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            >
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle title="Nouvelle balise" />
        <div className="ayeba-panel mt-4 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <input className="ayeba-input" placeholder="Nom de la balise" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="ayeba-input" value={tagType} onChange={(e) => setTagType(e.target.value)}>
            {TAG_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="ayeba-input" value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
            {TRIGGERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input
            className="ayeba-input"
            placeholder={triggerType === "all_pages" ? "Valeur (optionnel)" : "Valeur du déclencheur"}
            value={triggerValue}
            onChange={(e) => setTriggerValue(e.target.value)}
          />
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="button" className="ayeba-btn px-4 py-2 text-xs" disabled={busy} onClick={() => void create()}>
              {busy ? "Création…" : "Créer la balise"}
            </button>
            {msg ? <span className="ml-3 text-xs text-[var(--muted)]">{msg}</span> : null}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle title="Balises configurées" />
        <div className="mt-4">
          <DataTable
            columns={["Nom", "Type", "Déclencheur", "Statut", "Actions"]}
            rows={rules.map((r) => [
              <span key="n" className="font-medium text-[var(--ink)]">{r.name}</span>,
              TAG_TYPES.find(([v]) => v === r.tag_type)?.[1] || r.tag_type,
              `${TRIGGERS.find(([v]) => v === r.trigger_type)?.[1] || r.trigger_type}${r.trigger_value ? ` · ${r.trigger_value}` : ""}`,
              <span key="s" className={`text-[10px] uppercase ${r.status === "active" ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                {r.status === "active" ? "Active" : "En pause"}
              </span>,
              <span key="a" className="flex gap-3">
                <button
                  type="button"
                  className="text-xs text-[var(--accent)] hover:underline"
                  onClick={() => void mutate(r.id, { status: r.status === "active" ? "paused" : "active" })}
                >
                  {r.status === "active" ? "Suspendre" : "Activer"}
                </button>
                <button
                  type="button"
                  className="text-xs text-[var(--danger,#c0392b)] hover:underline"
                  onClick={() => { if (confirm(`Supprimer la balise "${r.name}" ?`)) void mutate(r.id, { delete: true }); }}
                >
                  Supprimer
                </button>
              </span>,
            ])}
            empty="Aucune balise — les données de base (pageviews, sessions) sont collectées quand même"
          />
        </div>
      </section>
    </StudioAppShell>
  );
}
