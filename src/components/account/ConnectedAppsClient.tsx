"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ConnectedApp } from "@/lib/oauth-provider/consents";

export function ConnectedAppsClient() {
  const [apps, setApps] = useState<ConnectedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/account/connected-apps");
    if (res.status === 401) {
      setError("login");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { apps?: ConnectedApp[] };
    setApps(data.apps || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function revoke(clientId: string, name: string) {
    if (!confirm(`Retirer l'accès de ${name} à votre compte Ayeba ?`)) return;
    await fetch("/api/account/connected-apps", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId }),
    });
    void load();
  }

  if (error === "login") {
    return (
      <div className="ayeba-panel p-6">
        <p>Connectez-vous pour gérer les applications ayant accès à votre compte.</p>
        <Link href="/?auth=login" className="ayeba-cta mt-4 inline-block px-5 py-2 text-sm">
          Se connecter
        </Link>
      </div>
    );
  }

  if (loading) return <p className="dev-console-muted">Chargement…</p>;

  if (apps.length === 0) {
    return (
      <div className="ayeba-panel p-6">
        <p className="text-[var(--muted)]">
          Aucune application tierce n&apos;a accès à votre compte pour le moment.
        </p>
      </div>
    );
  }

  return (
    <ul className="connected-apps-list">
      {apps.map((app) => (
        <li key={app.clientId} className="connected-apps-item ayeba-panel">
          <div className="connected-apps-item-head">
            <div className="oauth-consent-app-icon" aria-hidden>
              {(app.name[0] || "A").toUpperCase()}
            </div>
            <div>
              <p className="connected-apps-name">
                {app.name}
                {app.verified ? <span className="dev-verified-badge">Vérifiée</span> : null}
              </p>
              <p className="dev-console-muted text-sm">{app.description}</p>
              {app.websiteUrl ? (
                <a href={app.websiteUrl} className="connected-apps-link" target="_blank" rel="noopener noreferrer">
                  {app.websiteUrl.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
            </div>
          </div>
          <p className="connected-apps-scopes text-xs text-[var(--faint)]">
            Accès : {app.scope.replace(/ /g, ", ")} · depuis{" "}
            {new Date(app.grantedAt).toLocaleDateString("fr-FR")}
          </p>
          <button
            type="button"
            className="ayeba-ghost text-sm text-red-300 mt-3"
            onClick={() => void revoke(app.clientId, app.name)}
          >
            Retirer l&apos;accès
          </button>
        </li>
      ))}
    </ul>
  );
}
