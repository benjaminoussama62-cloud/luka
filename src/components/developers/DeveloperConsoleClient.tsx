"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { OAuthClient } from "@/lib/oauth-provider/types";
import { OAUTH_PATHS, oauthEndpoint } from "@/lib/oauth-provider/endpoints";
import { DeveloperAppDetail } from "./DeveloperAppDetail";
import { DeveloperCreateAppModal } from "./DeveloperCreateAppModal";

type AppWithSecret = OAuthClient & { clientSecret?: string };

export function DeveloperConsoleClient() {
  const [apps, setApps] = useState<OAuthClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<AppWithSecret | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/developers/apps");
      if (res.status === 401) {
        setError("login");
        return;
      }
      const data = (await res.json()) as { apps?: OAuthClient[]; error?: string };
      if (data.error) {
        setError(data.error);
        return;
      }
      setApps(data.apps || []);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openApp(clientId: string) {
    setNewSecret(null);
    const res = await fetch(`/api/developers/apps/${clientId}`);
    const data = (await res.json()) as { app?: OAuthClient };
    if (data.app) setSelected(data.app);
  }

  async function rotateSecret(clientId: string) {
    if (!confirm("Régénérer le client secret ? L’ancien ne fonctionnera plus.")) return;
    const res = await fetch(`/api/developers/apps/${clientId}/rotate-secret`, { method: "POST" });
    const data = (await res.json()) as { clientSecret?: string };
    if (data.clientSecret) setNewSecret(data.clientSecret);
  }

  if (error === "login") {
    return (
      <div className="dev-console-login ayeba-panel">
        <h2>Connexion requise</h2>
        <p>Connectez-vous avec votre compte Ayeba pour enregistrer et gérer vos applications OAuth.</p>
        <Link href="/?auth=login" className="ayeba-cta inline-block px-5 py-2.5 text-sm">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="dev-console-grid">
      <aside className="dev-console-sidebar ayeba-panel">
        <div className="dev-console-sidebar-head">
          <h2>Mes applications</h2>
          <button type="button" className="ayeba-cta px-3 py-1.5 text-xs" onClick={() => setShowCreate(true)}>
            + Créer
          </button>
        </div>
        {loading ? <p className="dev-console-muted">Chargement…</p> : null}
        {error && error !== "login" ? <p className="oauth-consent-error">{error}</p> : null}
        <ul className="dev-console-app-list">
          {apps.map((app) => (
            <li key={app.clientId}>
              <button
                type="button"
                className={selected?.clientId === app.clientId ? "active" : ""}
                onClick={() => void openApp(app.clientId)}
              >
                <span className="dev-console-app-name">{app.name}</span>
                <span className="dev-console-app-id">{app.clientId}</span>
              </button>
            </li>
          ))}
        </ul>
        {!loading && apps.length === 0 ? (
          <p className="dev-console-muted">Aucune app. Créez-en une pour obtenir client_id et secret.</p>
        ) : null}
      </aside>

      <main className="dev-console-main">
        {selected ? (
          <DeveloperAppDetail
            app={selected}
            newSecret={newSecret}
            onRotate={() => void rotateSecret(selected.clientId)}
            onUpdated={(app) => {
              setSelected(app);
              void load();
            }}
            onDeleted={() => {
              setSelected(null);
              void load();
            }}
          />
        ) : (
          <div className="dev-console-empty ayeba-panel">
            <h2>Identifiants OAuth 2.0 / OpenID Connect</h2>
            <p>
              Sélectionnez une application ou créez-en une. Les endpoints publics Ayeba sont listés
              ci-dessous — identiques pour toutes les apps sœurs.
            </p>
            <dl className="dev-console-endpoints">
              {(Object.keys(OAUTH_PATHS) as (keyof typeof OAUTH_PATHS)[]).map((key) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>
                    <code>{oauthEndpoint(key)}</code>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </main>

      {showCreate ? (
        <DeveloperCreateAppModal
          onClose={() => setShowCreate(false)}
          onCreated={(app) => {
            setShowCreate(false);
            setSelected(app);
            setNewSecret(app.clientSecret || null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
