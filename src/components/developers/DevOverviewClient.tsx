"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { DeveloperApiKey } from "@/lib/developers/console";
import {
  Chip,
  DailyChart,
  EmptyState,
  QuotaGauge,
  useProject,
} from "@/components/developers/DevShell";

type Usage = {
  totals: { calls: number; errors: number; avgLatencyMs: number };
  daily: { day: string; calls: number; errors: number; avg_latency: number }[];
  byEndpoint: { endpoint: string; calls: number }[];
  byStatus: { code: number; calls: number }[];
};

export function DevOverviewClient() {
  const { current, projects, memberProjects, reload } = useProject();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [keys, setKeys] = useState<DeveloperApiKey[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!current) return;
    const [u, k] = await Promise.all([
      fetch(`/api/developers/usage?projectId=${current.id}&days=30`),
      fetch(`/api/developers/keys?projectId=${current.id}`),
    ]);
    if (u.ok) setUsage((await u.json()) as Usage);
    if (k.ok) setKeys(((await k.json()) as { keys: DeveloperApiKey[] }).keys);
  }, [current]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/developers/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) return setMsg(data.error || "Erreur");
    setName("");
    setCreating(false);
    reload();
  }

  const all = [...projects, ...memberProjects];

  if (all.length === 0) {
    return (
      <div className="dcw-stack">
        <EmptyState
          title="Aucun projet"
          hint="Un projet regroupe vos clés API, applications OAuth et quotas. Créez le vôtre pour commencer."
        />
        <form onSubmit={createProject} className="dcw-form-inline">
          <input
            className="dcw-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du projet (ex. Mon application mobile)"
            maxLength={80}
            required
          />
          <button type="submit" className="ayeba-cta px-4 py-2 text-sm">
            Créer le projet
          </button>
        </form>
        {msg && <p className="dcw-error">{msg}</p>}
      </div>
    );
  }

  if (!current) return <p className="dev-console-muted">Sélectionnez un projet…</p>;

  const t = usage?.totals;
  const successRate =
    t && t.calls > 0 ? Math.round(((t.calls - t.errors) / t.calls) * 1000) / 10 : null;
  const activeKeys = keys.filter((k) => k.status === "active");

  return (
    <div className="dcw-stack">
      {/* En-tête projet */}
      <div className="dcw-head">
        <div>
          <h2 className="dcw-title">{current.name}</h2>
          <p className="dev-console-muted">
            ID : <code className="dev-console-code">{current.id}</code> · créé le{" "}
            {new Date(current.createdAt).toLocaleDateString("fr")}
          </p>
        </div>
        <button
          type="button"
          className="ayeba-ghost px-3 py-1.5 text-xs"
          onClick={() => setCreating((v) => !v)}
        >
          + Nouveau projet
        </button>
      </div>

      {creating && (
        <form onSubmit={createProject} className="dcw-form-inline">
          <input
            className="dcw-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du projet"
            maxLength={80}
            required
          />
          <button type="submit" className="ayeba-cta px-4 py-2 text-sm">Créer</button>
        </form>
      )}
      {msg && <p className="dcw-error">{msg}</p>}

      {/* KPIs — données réelles uniquement */}
      <div className="dcw-kpis">
        <div className="dcw-kpi">
          <p className="dcw-kpi-label">Requêtes (30 j)</p>
          <p className="dcw-kpi-value">{t ? t.calls.toLocaleString("fr") : "—"}</p>
        </div>
        <div className="dcw-kpi">
          <p className="dcw-kpi-label">Erreurs</p>
          <p className="dcw-kpi-value">{t ? t.errors.toLocaleString("fr") : "—"}</p>
        </div>
        <div className="dcw-kpi">
          <p className="dcw-kpi-label">Taux de succès</p>
          <p className="dcw-kpi-value">{successRate !== null ? `${successRate} %` : "—"}</p>
        </div>
        <div className="dcw-kpi">
          <p className="dcw-kpi-label">Latence moyenne</p>
          <p className="dcw-kpi-value">{t ? `${t.avgLatencyMs} ms` : "—"}</p>
        </div>
      </div>

      {/* Trafic */}
      <section className="ayeba-panel p-5">
        <div className="dcw-section-head">
          <h3>Trafic — 30 derniers jours</h3>
          <Link href="/developers/console/utilisation" className="dcw-link">
            Rapport détaillé →
          </Link>
        </div>
        {usage && usage.daily.length > 0 ? (
          <DailyChart data={usage.daily} />
        ) : (
          <EmptyState
            title="Aucun trafic"
            hint="Les appels à /api/v1/* avec les clés de ce projet apparaîtront ici."
            action={
              <Link href="/developers/console/apis" className="dcw-link">
                Tester dans l&rsquo;explorateur →
              </Link>
            }
          />
        )}
      </section>

      <div className="dcw-grid-2">
        {/* Quotas des clés */}
        <section className="ayeba-panel p-5">
          <div className="dcw-section-head">
            <h3>Quotas du jour — clés API</h3>
            <Link href="/developers/console/cles" className="dcw-link">Gérer →</Link>
          </div>
          {activeKeys.length === 0 ? (
            <EmptyState
              title="Aucune clé active"
              hint="Créez une clé API pour appeler les services Ayeba."
              action={<Link href="/developers/console/cles" className="dcw-link">Créer une clé →</Link>}
            />
          ) : (
            <ul className="dcw-list">
              {activeKeys.map((k) => (
                <li key={k.id} className="dcw-list-row">
                  <div>
                    <p className="dcw-list-name">{k.name}</p>
                    <code className="dev-console-code">{k.prefix}…</code>
                  </div>
                  <QuotaGauge used={k.usedToday} quota={k.quotaPerDay} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Répartition par endpoint */}
        <section className="ayeba-panel p-5">
          <div className="dcw-section-head">
            <h3>Endpoints — 30 j</h3>
            <Link href="/developers/console/journaux" className="dcw-link">Journaux →</Link>
          </div>
          {usage && usage.byEndpoint.length > 0 ? (
            <table className="dcw-table">
              <thead>
                <tr><th>Endpoint</th><th className="text-right">Appels</th></tr>
              </thead>
              <tbody>
                {usage.byEndpoint.map((e) => (
                  <tr key={e.endpoint}>
                    <td><code className="dev-console-code">{e.endpoint}</code></td>
                    <td className="text-right">{e.calls.toLocaleString("fr")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="Aucune donnée" hint="—" />
          )}
        </section>
      </div>

      {/* Codes de statut */}
      {usage && usage.byStatus.length > 0 && (
        <section className="ayeba-panel p-5">
          <h3 className="mb-3">Codes de statut — 30 j</h3>
          <div className="dcw-chips">
            {usage.byStatus.map((s) => (
              <Chip
                key={s.code}
                tone={s.code < 300 ? "green" : s.code < 500 ? "amber" : "red"}
              >
                {s.code} · {s.calls.toLocaleString("fr")}
              </Chip>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
