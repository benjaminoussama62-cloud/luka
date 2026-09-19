"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { DeveloperApiKey, DeveloperProject } from "@/lib/developers/console";

type Overview = {
  projects: DeveloperProject[];
  keys: DeveloperApiKey[];
  month: {
    totals: { calls: number; errors: number; avgLatencyMs: number };
    daily: { day: string; calls: number; errors: number; avg_latency: number }[];
    byEndpoint: { endpoint: string; calls: number }[];
    byKey: { name: string; key_prefix: string; calls: number }[];
  };
  audit: { event_type: string; client_id: string; detail: string; created_at: string }[];
};

export function DevOverviewClient() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/developers/usage?overview=1");
    if (res.status === 401) return setError("login");
    if (!res.ok) return setError("Erreur de chargement");
    setData((await res.json()) as Overview);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await fetch("/api/developers/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    setCreating(false);
    void load();
  }

  async function removeProject(id: string, n: string) {
    if (!confirm(`Supprimer le projet « ${n} » ? Les clés seront révoquées et les clients OAuth détachés.`)) return;
    await fetch(`/api/developers/projects/${id}`, { method: "DELETE" });
    void load();
  }

  if (error === "login") {
    return (
      <div className="dev-console-login ayeba-panel">
        <h2>Connexion requise</h2>
        <p>Connectez-vous avec votre compte Ayeba pour gérer vos projets et identifiants.</p>
        <Link href="/?auth=login" className="ayeba-cta inline-block px-5 py-2.5 text-sm">Se connecter</Link>
      </div>
    );
  }
  if (!data) return <p className="dev-console-muted">Chargement…</p>;

  const t = data.month.totals;
  const maxDay = Math.max(1, ...data.month.daily.map((d) => d.calls));

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="ayeba-panel p-5">
          <p className="dev-console-muted text-xs">Requêtes API (30 j)</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">{t.calls.toLocaleString("fr")}</p>
        </div>
        <div className="ayeba-panel p-5">
          <p className="dev-console-muted text-xs">Erreurs</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">{t.errors.toLocaleString("fr")}</p>
        </div>
        <div className="ayeba-panel p-5">
          <p className="dev-console-muted text-xs">Latence moyenne</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">{t.avgLatencyMs} ms</p>
        </div>
      </section>

      <section className="ayeba-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--ink)]">Projets</h2>
          <button type="button" className="ayeba-cta px-3 py-1.5 text-xs" onClick={() => setCreating((v) => !v)}>
            + Nouveau projet
          </button>
        </div>
        {creating ? (
          <form onSubmit={createProject} className="mb-4 flex gap-2">
            <input
              className="ayeba-input flex-1"
              placeholder="Nom du projet (ex. Backend JEMSA)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoFocus
            />
            <button type="submit" className="ayeba-cta px-4 py-2 text-xs">Créer</button>
          </form>
        ) : null}
        {data.projects.length === 0 ? (
          <p className="dev-console-muted">
            Aucun projet. Un projet regroupe vos clés API et clients OAuth — comme un projet Google Cloud.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="dev-console-muted text-xs">
                <th className="pb-2">Projet</th>
                <th className="pb-2">ID</th>
                <th className="pb-2">Clés API</th>
                <th className="pb-2">Clients OAuth</th>
                <th className="pb-2">Créé</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {data.projects.map((p) => (
                <tr key={p.id} className="border-t border-[var(--line)]">
                  <td className="py-2.5 font-medium text-[var(--ink)]">{p.name}</td>
                  <td className="py-2.5"><code className="dev-console-code">{p.id}</code></td>
                  <td className="py-2.5">{p.apiKeys}</td>
                  <td className="py-2.5">{p.oauthClients}</td>
                  <td className="py-2.5 dev-console-muted">{new Date(p.createdAt).toLocaleDateString("fr")}</td>
                  <td className="py-2.5 text-right">
                    <button type="button" className="ayeba-ghost px-2 py-1 text-xs" onClick={() => void removeProject(p.id, p.name)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="ayeba-panel p-5">
        <h2 className="mb-4 text-base font-semibold text-[var(--ink)]">Trafic API — 30 derniers jours</h2>
        {data.month.daily.length === 0 ? (
          <p className="dev-console-muted">
            Aucun appel pour l&rsquo;instant. Créez une clé API puis appelez <code className="dev-console-code">GET /api/v1/search?q=…</code>.
          </p>
        ) : (
          <div className="flex h-32 items-end gap-1">
            {data.month.daily.map((d) => (
              <div
                key={d.day}
                title={`${d.day} — ${d.calls} appels, ${d.errors} erreurs`}
                className="flex-1 rounded-t bg-[var(--accent)] opacity-80"
                style={{ height: `${Math.max(4, (d.calls / maxDay) * 100)}%` }}
              />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="ayeba-panel p-5">
          <h2 className="mb-3 text-base font-semibold text-[var(--ink)]">Clés API actives</h2>
          {data.keys.length === 0 ? (
            <p className="dev-console-muted">
              Aucune clé. <Link href="/developers/console/cles" className="underline">Créer une clé</Link>
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.keys.slice(0, 8).map((k) => (
                <li key={k.id} className="flex items-center justify-between border-b border-[var(--line)] pb-2">
                  <span>
                    <span className="font-medium text-[var(--ink)]">{k.name}</span>{" "}
                    <code className="dev-console-code">{k.prefix}…</code>
                  </span>
                  <span className="dev-console-muted text-xs">{k.usedToday}/{k.quotaPerDay} aujourd&rsquo;hui</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="ayeba-panel p-5">
          <h2 className="mb-3 text-base font-semibold text-[var(--ink)]">Activité OAuth récente</h2>
          {data.audit.length === 0 ? (
            <p className="dev-console-muted">Aucune activité (autorisations, jetons, connexions).</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.audit.slice(0, 8).map((a, i) => (
                <li key={i} className="flex items-center justify-between border-b border-[var(--line)] pb-2">
                  <span className="text-[var(--ink)]">{a.event_type}</span>
                  <span className="dev-console-muted text-xs">{new Date(a.created_at).toLocaleString("fr")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
