"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ApiLogEntry } from "@/lib/developers/console";
import { Chip, EmptyState, useProject } from "@/components/developers/DevShell";

export function DevLogsClient() {
  const { current } = useProject();
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "errors">("all");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    const res = await fetch(`/api/developers/logs?projectId=${current.id}&limit=300`);
    if (res.ok) setLogs(((await res.json()) as { logs: ApiLogEntry[] }).logs);
    setLoading(false);
  }, [current]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!current) {
    return (
      <EmptyState
        title="Sélectionnez un projet"
        hint="Les journaux sont propres à chaque projet."
        action={<Link href="/developers/console" className="dcw-link">Tableau de bord →</Link>}
      />
    );
  }

  const shown = filter === "errors" ? logs.filter((l) => l.statusCode >= 400) : logs;

  return (
    <div className="dcw-stack">
      <div className="dcw-head">
        <div>
          <h2 className="dcw-title">Journaux — {current.name}</h2>
          <p className="dev-console-muted">
            {logs.length} entrée(s) — chaque appel API validé ou rejeté est enregistré.
          </p>
        </div>
        <div className="dcw-seg">
          <button
            type="button"
            className={`dcw-seg-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            Tout
          </button>
          <button
            type="button"
            className={`dcw-seg-btn ${filter === "errors" ? "active" : ""}`}
            onClick={() => setFilter("errors")}
          >
            Erreurs
          </button>
          <button type="button" className="dcw-seg-btn" onClick={() => void load()}>
            ↻
          </button>
        </div>
      </div>

      <section className="ayeba-panel p-0">
        {shown.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={loading ? "Chargement…" : "Aucune entrée"}
              hint="Les appels à l'API et à l'explorateur apparaîtront ici."
            />
          </div>
        ) : (
          <div className="dcw-scroll">
            <table className="dcw-table">
              <thead>
                <tr>
                  <th>Horodatage</th>
                  <th>Endpoint</th>
                  <th>Statut</th>
                  <th className="text-right">Latence</th>
                  <th>Clé</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => (
                  <tr key={l.id}>
                    <td className="dev-console-muted whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString("fr")}
                    </td>
                    <td><code className="dev-console-code">{l.endpoint}</code></td>
                    <td>
                      <Chip tone={l.statusCode < 300 ? "green" : l.statusCode < 500 ? "amber" : "red"}>
                        {l.statusCode}
                      </Chip>
                    </td>
                    <td className="text-right">{l.latencyMs} ms</td>
                    <td>{l.keyName}</td>
                    <td className="dev-console-muted">{l.ip || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
