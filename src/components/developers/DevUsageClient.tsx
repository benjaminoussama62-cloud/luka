"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { DeveloperProject } from "@/lib/developers/console";

type Usage = {
  totals: { calls: number; errors: number; avgLatencyMs: number };
  daily: { day: string; calls: number; errors: number; avg_latency: number }[];
  byEndpoint: { endpoint: string; calls: number }[];
  byKey: { name: string; key_prefix: string; calls: number }[];
};

export function DevUsageClient() {
  const [projects, setProjects] = useState<DeveloperProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [days, setDays] = useState(30);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/developers/projects").then(async (r) => {
      if (r.status === 401) return setError("login");
      if (r.ok) setProjects(((await r.json()) as { projects: DeveloperProject[] }).projects);
    });
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/developers/usage?days=${days}${projectId ? `&projectId=${projectId}` : ""}`);
    if (res.ok) setUsage((await res.json()) as Usage);
  }, [days, projectId]);

  useEffect(() => { void load(); }, [load]);

  if (error === "login") {
    return (
      <div className="dev-console-login ayeba-panel">
        <h2>Connexion requise</h2>
        <Link href="/?auth=login" className="ayeba-cta inline-block px-5 py-2.5 text-sm">Se connecter</Link>
      </div>
    );
  }

  const maxDay = usage ? Math.max(1, ...usage.daily.map((d) => d.calls)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <select className="ayeba-input w-auto" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">Tous les projets</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="ayeba-input w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>7 jours</option>
          <option value={30}>30 jours</option>
          <option value={90}>90 jours</option>
        </select>
      </div>

      {!usage ? <p className="dev-console-muted">Chargement…</p> : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="ayeba-panel p-5">
              <p className="dev-console-muted text-xs">Requêtes</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">{usage.totals.calls.toLocaleString("fr")}</p>
            </div>
            <div className="ayeba-panel p-5">
              <p className="dev-console-muted text-xs">Erreurs (4xx/5xx)</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">{usage.totals.errors.toLocaleString("fr")}</p>
            </div>
            <div className="ayeba-panel p-5">
              <p className="dev-console-muted text-xs">Latence moyenne</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">{usage.totals.avgLatencyMs} ms</p>
            </div>
          </section>

          <section className="ayeba-panel p-5">
            <h2 className="mb-4 text-base font-semibold text-[var(--ink)]">Appels par jour</h2>
            {usage.daily.length === 0 ? (
              <p className="dev-console-muted">Aucun appel sur la période.</p>
            ) : (
              <div className="flex h-40 items-end gap-1">
                {usage.daily.map((d) => (
                  <div
                    key={d.day}
                    title={`${d.day} — ${d.calls} appels · ${d.errors} erreurs · ${Math.round(d.avg_latency)} ms`}
                    className="flex-1 rounded-t bg-[var(--accent)] opacity-80"
                    style={{ height: `${Math.max(4, (d.calls / maxDay) * 100)}%` }}
                  />
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="ayeba-panel p-5">
              <h2 className="mb-3 text-base font-semibold text-[var(--ink)]">Par endpoint</h2>
              {usage.byEndpoint.length === 0 ? <p className="dev-console-muted">—</p> : (
                <ul className="space-y-2 text-sm">
                  {usage.byEndpoint.map((e) => (
                    <li key={e.endpoint} className="flex justify-between border-b border-[var(--line)] pb-2">
                      <code className="dev-console-code">/api/v1/{e.endpoint}</code>
                      <span>{e.calls.toLocaleString("fr")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="ayeba-panel p-5">
              <h2 className="mb-3 text-base font-semibold text-[var(--ink)]">Par clé</h2>
              {usage.byKey.length === 0 ? <p className="dev-console-muted">—</p> : (
                <ul className="space-y-2 text-sm">
                  {usage.byKey.map((k) => (
                    <li key={k.key_prefix} className="flex justify-between border-b border-[var(--line)] pb-2">
                      <span>{k.name} <code className="dev-console-code">{k.key_prefix}…</code></span>
                      <span>{k.calls.toLocaleString("fr")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
