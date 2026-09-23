"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Chip, EmptyState, useProject } from "@/components/developers/DevShell";

type ApiEntry = {
  id: string;
  name: string;
  scope: string;
  description: string;
  endpoint: string;
  method: string;
  params: { name: string; required: boolean; desc: string }[];
  quotaDefault: number;
  status: "ga" | "beta";
  docsAnchor: string;
  enabled: boolean;
};

type ExplorerResult = {
  status: number;
  latencyMs: number;
  body: unknown;
};

export function DevApisClient() {
  const { current, currentRole } = useProject();
  const [apis, setApis] = useState<ApiEntry[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Explorateur
  const [testing, setTesting] = useState<ApiEntry | null>(null);
  const [params, setParams] = useState<Record<string, string>>({ q: "", limit: "10" });
  const [result, setResult] = useState<ExplorerResult | null>(null);
  const [running, setRunning] = useState(false);

  const canManage = currentRole === "owner" || currentRole === "editor";

  const load = useCallback(async () => {
    if (!current) return;
    const res = await fetch(`/api/developers/apis?projectId=${current.id}`);
    if (res.ok) setApis(((await res.json()) as { apis: ApiEntry[] }).apis);
  }, [current]);

  useEffect(() => {
    setApis([]);
    setTesting(null);
    setResult(null);
    void load();
  }, [load]);

  async function toggle(api: ApiEntry) {
    if (!current) return;
    setMsg(null);
    setBusy(api.id);
    const res = await fetch("/api/developers/apis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: current.id, apiId: api.id, enabled: !api.enabled }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) setMsg(data.error || "Erreur");
    setBusy(null);
    void load();
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !testing) return;
    setRunning(true);
    setResult(null);
    const res = await fetch("/api/developers/explorer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: current.id, apiId: testing.id, params }),
    });
    const data = (await res.json().catch(() => null)) as
      | ExplorerResult
      | { error: string }
      | null;
    setRunning(false);
    if (!res.ok || !data || !("status" in data)) {
      setResult({
        status: res.status,
        latencyMs: 0,
        body: data || { error: "Réponse invalide" },
      });
    } else {
      setResult(data);
    }
  }

  if (!current) {
    return (
      <EmptyState
        title="Sélectionnez un projet"
        hint="La bibliothèque d'APIs s'active par projet. Créez d'abord un projet dans le tableau de bord."
        action={<Link href="/developers/console" className="dcw-link">Tableau de bord →</Link>}
      />
    );
  }

  return (
    <div className="dcw-stack">
      <div className="dcw-head">
        <div>
          <h2 className="dcw-title">Bibliothèque d&rsquo;APIs</h2>
          <p className="dev-console-muted">
            APIs disponibles sur la plateforme Ayeba — projet{" "}
            <strong>{current.name}</strong>
          </p>
        </div>
      </div>
      {msg && <p className="dcw-error">{msg}</p>}

      <div className="dcw-api-grid">
        {apis.map((api) => (
          <article key={api.id} className="dcw-api-card">
            <div className="dcw-api-head">
              <h3>{api.name}</h3>
              <div className="dcw-chips">
                <Chip tone={api.status === "ga" ? "green" : "blue"}>
                  {api.status === "ga" ? "Disponible" : "Bêta"}
                </Chip>
                <Chip tone={api.enabled ? "green" : "gray"}>
                  {api.enabled ? "Activée" : "Désactivée"}
                </Chip>
              </div>
            </div>
            <p className="dcw-api-desc">{api.description}</p>
            <dl className="dcw-api-meta">
              <div>
                <dt>Endpoint</dt>
                <dd>
                  <code className="dev-console-code">
                    {api.method} {api.endpoint}
                  </code>
                </dd>
              </div>
              <div>
                <dt>Portée requise</dt>
                <dd>
                  <code className="dev-console-code">{api.scope}</code>
                </dd>
              </div>
              <div>
                <dt>Quota par défaut</dt>
                <dd>{api.quotaDefault.toLocaleString("fr")} requêtes/jour</dd>
              </div>
            </dl>
            <div className="dcw-api-actions">
              {canManage ? (
                <button
                  type="button"
                  className={api.enabled ? "ayeba-ghost px-3 py-1.5 text-xs" : "ayeba-cta px-3 py-1.5 text-xs"}
                  onClick={() => toggle(api)}
                  disabled={busy === api.id}
                >
                  {busy === api.id ? "…" : api.enabled ? "Désactiver" : "Activer"}
                </button>
              ) : (
                <span className="dev-console-muted text-xs">Lecture seule</span>
              )}
              {api.enabled && (
                <button
                  type="button"
                  className="ayeba-ghost px-3 py-1.5 text-xs"
                  onClick={() => {
                    setTesting(api);
                    setResult(null);
                    setParams({ q: "", limit: "10" });
                  }}
                >
                  Tester
                </button>
              )}
              <Link href={`/developers/docs#${api.docsAnchor}`} className="dcw-link">
                Documentation →
              </Link>
            </div>
          </article>
        ))}
      </div>

      {/* Explorateur — exécution réelle côté serveur, journalisée */}
      {testing && (
        <section className="ayeba-panel p-5">
          <div className="dcw-section-head">
            <h3>Explorateur — {testing.name}</h3>
            <button
              type="button"
              className="ayeba-ghost px-3 py-1.5 text-xs"
              onClick={() => setTesting(null)}
            >
              Fermer
            </button>
          </div>
          <p className="dev-console-muted mb-3">
            Requête réelle exécutée par la console au nom du projet{" "}
            <strong>{current.name}</strong> — elle est comptabilisée dans les journaux
            (endpoint <code className="dev-console-code">explorer:{testing.id}</code>).
          </p>
          <form onSubmit={run} className="dcw-explorer-form">
            <code className="dev-console-code dcw-explorer-method">
              {testing.method} {testing.endpoint}
            </code>
            {testing.params.map((p) => (
              <label key={p.name} className="dev-console-field">
                <span className="dev-console-field-head">
                  {p.name}
                  {p.required ? " *" : ""} — {p.desc}
                </span>
                <input
                  className="dcw-input"
                  value={params[p.name] || ""}
                  onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
                  required={p.required}
                />
              </label>
            ))}
            <button type="submit" className="ayeba-cta px-4 py-2 text-sm" disabled={running}>
              {running ? "Exécution…" : "Exécuter"}
            </button>
          </form>
          {result && (
            <div className="dcw-explorer-result">
              <div className="dcw-chips mb-2">
                <Chip tone={result.status < 300 ? "green" : result.status < 500 ? "amber" : "red"}>
                  HTTP {result.status}
                </Chip>
                {result.latencyMs > 0 && <Chip tone="gray">{result.latencyMs} ms</Chip>}
              </div>
              <pre className="dcw-pre">{JSON.stringify(result.body, null, 2)}</pre>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
