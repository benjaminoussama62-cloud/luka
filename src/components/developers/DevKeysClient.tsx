"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { DeveloperApiKey, DeveloperProject } from "@/lib/developers/console";

export function DevKeysClient() {
  const [projects, setProjects] = useState<DeveloperProject[]>([]);
  const [keys, setKeys] = useState<DeveloperApiKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [form, setForm] = useState({
    projectId: "",
    name: "",
    quotaPerDay: 1000,
    referrers: "",
    ips: "",
  });
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, k] = await Promise.all([
      fetch("/api/developers/projects"),
      fetch("/api/developers/keys"),
    ]);
    if (p.status === 401 || k.status === 401) return setError("login");
    if (p.ok) setProjects(((await p.json()) as { projects: DeveloperProject[] }).projects);
    if (k.ok) setKeys(((await k.json()) as { keys: DeveloperApiKey[] }).keys);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/developers/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: form.projectId,
        name: form.name,
        quotaPerDay: form.quotaPerDay,
        scopes: ["search"],
        restrictions: {
          referrers: form.referrers.split(",").map((s) => s.trim()).filter(Boolean),
          ips: form.ips.split(",").map((s) => s.trim()).filter(Boolean),
        },
      }),
    });
    const data = (await res.json()) as { secret?: string; error?: string };
    if (!res.ok) return setMsg(data.error || "Erreur");
    setNewSecret(data.secret || null);
    setCreating(false);
    setForm({ projectId: "", name: "", quotaPerDay: 1000, referrers: "", ips: "" });
    void load();
  }

  async function setStatus(id: string, status: "active" | "disabled") {
    await fetch(`/api/developers/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    void load();
  }

  async function revoke(id: string, name: string) {
    if (!confirm(`Révoquer définitivement la clé « ${name} » ? Les appels échoueront immédiatement.`)) return;
    await fetch(`/api/developers/keys/${id}`, { method: "DELETE" });
    void load();
  }

  if (error === "login") {
    return (
      <div className="dev-console-login ayeba-panel">
        <h2>Connexion requise</h2>
        <Link href="/?auth=login" className="ayeba-cta inline-block px-5 py-2.5 text-sm">Se connecter</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {newSecret ? (
        <div className="dev-console-secret-banner">
          <p className="mb-1 font-semibold">Clé créée — copiez-la maintenant, elle ne sera plus jamais affichée.</p>
          <code className="dev-console-code break-all">{newSecret}</code>
          <div className="mt-2">
            <button type="button" className="ayeba-ghost px-3 py-1 text-xs" onClick={() => { void navigator.clipboard.writeText(newSecret); setNewSecret(null); }}>
              Copier et fermer
            </button>
          </div>
        </div>
      ) : null}

      <section className="ayeba-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--ink)]">Clés API</h2>
          <button
            type="button"
            className="ayeba-cta px-3 py-1.5 text-xs"
            onClick={() => setCreating((v) => !v)}
            disabled={projects.length === 0}
          >
            + Créer une clé
          </button>
        </div>

        {projects.length === 0 ? (
          <p className="dev-console-muted">
            Créez d&rsquo;abord un projet dans <Link href="/developers/console" className="underline">l&rsquo;aperçu</Link> — les clés sont rattachées à un projet.
          </p>
        ) : null}

        {creating ? (
          <form onSubmit={create} className="mb-5 grid gap-3 rounded-lg border border-[var(--line)] p-4 sm:grid-cols-2">
            <label className="dev-console-field">
              <span className="dev-console-field-head">Projet</span>
              <select className="ayeba-input" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} required>
                <option value="">— Choisir —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="dev-console-field">
              <span className="dev-console-field-head">Nom de la clé</span>
              <input className="ayeba-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Backend production" required maxLength={60} />
            </label>
            <label className="dev-console-field">
              <span className="dev-console-field-head">Quota / jour</span>
              <input className="ayeba-input" type="number" min={1} max={1000000} value={form.quotaPerDay} onChange={(e) => setForm({ ...form, quotaPerDay: Number(e.target.value) })} />
            </label>
            <label className="dev-console-field">
              <span className="dev-console-field-head">Référents autorisés (optionnel)</span>
              <input className="ayeba-input" value={form.referrers} onChange={(e) => setForm({ ...form, referrers: e.target.value })} placeholder="jemsa.app, tala.cd" />
            </label>
            <label className="dev-console-field sm:col-span-2">
              <span className="dev-console-field-head">IPs autorisées (optionnel)</span>
              <input className="ayeba-input" value={form.ips} onChange={(e) => setForm({ ...form, ips: e.target.value })} placeholder="41.243.x.x, 102.64.x.x" />
            </label>
            <div className="flex items-end gap-2 sm:col-span-2">
              <button type="submit" className="ayeba-cta px-4 py-2 text-xs">Créer la clé</button>
              {msg ? <span className="oauth-consent-error">{msg}</span> : null}
            </div>
          </form>
        ) : null}

        {keys.length === 0 && !creating ? (
          <p className="dev-console-muted">Aucune clé pour l&rsquo;instant.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="dev-console-muted text-xs">
                <th className="pb-2">Nom</th>
                <th className="pb-2">Clé</th>
                <th className="pb-2">Quota aujourd&rsquo;hui</th>
                <th className="pb-2">Restrictions</th>
                <th className="pb-2">Statut</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-t border-[var(--line)]">
                  <td className="py-2.5 font-medium text-[var(--ink)]">{k.name}</td>
                  <td className="py-2.5"><code className="dev-console-code">{k.prefix}…</code></td>
                  <td className="py-2.5">{k.usedToday} / {k.quotaPerDay}</td>
                  <td className="py-2.5 dev-console-muted text-xs">
                    {k.restrictions.referrers?.length ? `Réf: ${k.restrictions.referrers.join(", ")} ` : ""}
                    {k.restrictions.ips?.length ? `IP: ${k.restrictions.ips.join(", ")}` : ""}
                    {!k.restrictions.referrers?.length && !k.restrictions.ips?.length ? "—" : ""}
                  </td>
                  <td className="py-2.5">
                    <span className={`dev-console-badge ${k.status === "active" ? "" : "opacity-50"}`}>{k.status}</span>
                  </td>
                  <td className="py-2.5 text-right">
                    {k.status === "active" ? (
                      <button type="button" className="ayeba-ghost px-2 py-1 text-xs" onClick={() => void setStatus(k.id, "disabled")}>Désactiver</button>
                    ) : k.status === "disabled" ? (
                      <button type="button" className="ayeba-ghost px-2 py-1 text-xs" onClick={() => void setStatus(k.id, "active")}>Réactiver</button>
                    ) : null}
                    <button type="button" className="ayeba-ghost ml-1 px-2 py-1 text-xs" onClick={() => void revoke(k.id, k.name)}>Révoquer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="ayeba-panel p-5">
        <h2 className="mb-2 text-base font-semibold text-[var(--ink)]">Utiliser votre clé</h2>
        <pre className="dev-console-pre">{`curl "https://ayeba.app/api/v1/search?q=kinshasa&limit=10" \\
  -H "Authorization: Bearer ayb_live_VOTRE_CLE"`}</pre>
      </section>
    </div>
  );
}
