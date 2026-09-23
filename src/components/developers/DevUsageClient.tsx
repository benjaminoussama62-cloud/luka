"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Chip, DailyChart, EmptyState, useProject } from "@/components/developers/DevShell";

type Usage = {
  totals: { calls: number; errors: number; avgLatencyMs: number };
  daily: { day: string; calls: number; errors: number; avg_latency: number }[];
  byEndpoint: { endpoint: string; calls: number }[];
  byKey: { name: string | null; key_prefix: string | null; calls: number }[];
  byStatus: { code: number; calls: number }[];
};

const RANGES = [7, 30, 90];

export function DevUsageClient() {
  const { current } = useProject();
  const [days, setDays] = useState(30);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    const res = await fetch(`/api/developers/usage?projectId=${current.id}&days=${days}`);
    if (res.ok) setUsage((await res.json()) as Usage);
    setLoading(false);
  }, [current, days]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!current) {
    return (
      <EmptyState
        title="Sélectionnez un projet"
        hint="L'utilisation est mesurée par projet."
        action={<Link href="/developers/console" className="dcw-link">Tableau de bord →</Link>}
      />
    );
  }

  const t = usage?.totals;
  const successRate =
    t && t.calls > 0 ? Math.round(((t.calls - t.errors) / t.calls) * 1000) / 10 : null;

  return (
    <div className="dcw-stack">
      <div className="dcw-head">
        <div>
          <h2 className="dcw-title">Utilisation — {current.name}</h2>
          <p className="dev-console-muted">
            Mesurée sur les appels réels <code className="dev-console-code">/api/v1/*</code> et
            l&rsquo;explorateur.
          </p>
        </div>
        <div className="dcw-seg">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={`dcw-seg-btn ${days === r ? "active" : ""}`}
              onClick={() => setDays(r)}
            >
              {r} j
            </button>
          ))}
        </div>
      </div>

      <div className="dcw-kpis">
        <div className="dcw-kpi">
          <p className="dcw-kpi-label">Requêtes</p>
          <p className="dcw-kpi-value">{loading || !t ? "…" : t.calls.toLocaleString("fr")}</p>
        </div>
        <div className="dcw-kpi">
          <p className="dcw-kpi-label">Erreurs (4xx/5xx)</p>
          <p className="dcw-kpi-value">{loading || !t ? "…" : t.errors.toLocaleString("fr")}</p>
        </div>
        <div className="dcw-kpi">
          <p className="dcw-kpi-label">Taux de succès</p>
          <p className="dcw-kpi-value">{successRate !== null ? `${successRate} %` : "—"}</p>
        </div>
        <div className="dcw-kpi">
          <p className="dcw-kpi-label">Latence moyenne</p>
          <p className="dcw-kpi-value">{loading || !t ? "…" : `${t.avgLatencyMs} ms`}</p>
        </div>
      </div>

      <section className="ayeba-panel p-5">
        <h3 className="mb-3">Trafic quotidien</h3>
        {usage && usage.daily.length > 0 ? (
          <>
            <DailyChart data={usage.daily} />
            <p className="dev-console-muted mt-2 text-xs">
              Survolez une barre pour le détail. Rouge = erreurs.
            </p>
          </>
        ) : (
          <EmptyState title="Aucun trafic sur la période" hint="—" />
        )}
      </section>

      <div className="dcw-grid-2">
        <section className="ayeba-panel p-5">
          <h3 className="mb-3">Par endpoint</h3>
          {usage && usage.byEndpoint.length > 0 ? (
            <table className="dcw-table">
              <thead><tr><th>Endpoint</th><th className="text-right">Appels</th></tr></thead>
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
            <EmptyState title="—" hint="—" />
          )}
        </section>

        <section className="ayeba-panel p-5">
          <h3 className="mb-3">Par clé API</h3>
          {usage && usage.byKey.length > 0 ? (
            <table className="dcw-table">
              <thead><tr><th>Clé</th><th className="text-right">Appels</th></tr></thead>
              <tbody>
                {usage.byKey.map((k, i) => (
                  <tr key={i}>
                    <td>
                      {k.name ? (
                        <>
                          {k.name}{" "}
                          <code className="dev-console-code">{k.key_prefix}…</code>
                        </>
                      ) : (
                        <span className="dev-console-muted">Console (explorateur)</span>
                      )}
                    </td>
                    <td className="text-right">{k.calls.toLocaleString("fr")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="—" hint="—" />
          )}
        </section>
      </div>

      {usage && usage.byStatus.length > 0 && (
        <section className="ayeba-panel p-5">
          <h3 className="mb-3">Codes de statut</h3>
          <div className="dcw-chips">
            {usage.byStatus.map((s) => (
              <Chip key={s.code} tone={s.code < 300 ? "green" : s.code < 500 ? "amber" : "red"}>
                {s.code} · {s.calls.toLocaleString("fr")}
              </Chip>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
