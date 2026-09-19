"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ApiLogEntry, DeveloperProject } from "@/lib/developers/console";

export function DevLogsClient() {
  const [projects, setProjects] = useState<DeveloperProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [logs, setLogs] = useState<ApiLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/developers/projects").then(async (r) => {
      if (r.status === 401) return setError("login");
      if (r.ok) setProjects(((await r.json()) as { projects: DeveloperProject[] }).projects);
    });
  }, []);

  useEffect(() => {
    void fetch(`/api/developers/logs?limit=200${projectId ? `&projectId=${projectId}` : ""}`)
      .then(async (r) => { if (r.ok) setLogs(((await r.json()) as { logs: ApiLogEntry[] }).logs); });
  }, [projectId]);

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
      <div className="flex flex-wrap gap-3">
        <select className="ayeba-input w-auto" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">Tous les projets</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <section className="ayeba-panel p-5">
        <h2 className="mb-4 text-base font-semibold text-[var(--ink)]">Requêtes API récentes</h2>
        {!logs ? <p className="dev-console-muted">Chargement…</p> : logs.length === 0 ? (
          <p className="dev-console-muted">Aucune requête enregistrée.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="dev-console-muted text-xs">
                <th className="pb-2">Date</th>
                <th className="pb-2">Endpoint</th>
                <th className="pb-2">Clé</th>
                <th className="pb-2">Statut</th>
                <th className="pb-2">Latence</th>
                <th className="pb-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-[var(--line)]">
                  <td className="py-2 dev-console-muted text-xs">{new Date(l.createdAt).toLocaleString("fr")}</td>
                  <td className="py-2"><code className="dev-console-code">/api/v1/{l.endpoint}</code></td>
                  <td className="py-2 text-xs">{l.keyName}</td>
                  <td className="py-2">
                    <span className={`dev-console-badge ${l.statusCode >= 400 ? "opacity-60" : ""}`}>{l.statusCode}</span>
                  </td>
                  <td className="py-2 text-xs">{l.latencyMs} ms</td>
                  <td className="py-2 dev-console-muted text-xs">{l.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
