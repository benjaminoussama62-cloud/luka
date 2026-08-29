"use client";

import { useState } from "react";
import type { OAuthClient } from "@/lib/oauth-provider/types";

type AppWithSecret = OAuthClient & { clientSecret?: string };

export function DeveloperCreateAppModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (app: AppWithSecret) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [redirectUris, setRedirectUris] = useState(
    "https://votre-domaine.com/api/ayeba/callback\nhttp://localhost:3000/api/ayeba/callback",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/developers/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        redirectUris: redirectUris.split("\n").map((s) => s.trim()).filter(Boolean),
      }),
    });
    const data = (await res.json()) as { app?: AppWithSecret; error?: string };
    setBusy(false);
    if (data.app) onCreated(data.app);
    else setError(data.error || "Erreur");
  }

  return (
    <div className="dev-console-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dev-console-modal ayeba-panel"
        role="dialog"
        aria-labelledby="create-app-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="create-app-title">Nouvelle application OAuth</h2>
        <p className="dev-console-muted">
          Comme dans Google Cloud Console : identifiants OAuth pour « Se connecter avec Ayeba ».
        </p>
        <div className="dev-console-field">
          <label>Nom de l’application</label>
          <input className="ayeba-input" placeholder="Omega Web" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="dev-console-field">
          <label>Description (visible par l’utilisateur)</label>
          <input
            className="ayeba-input"
            placeholder="Plateforme sœur Omega…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="dev-console-field">
          <label>Redirect URIs</label>
          <textarea
            className="ayeba-input dev-console-textarea"
            rows={3}
            value={redirectUris}
            onChange={(e) => setRedirectUris(e.target.value)}
          />
        </div>
        {error ? <p className="oauth-consent-error">{error}</p> : null}
        <div className="dev-console-actions">
          <button type="button" className="ayeba-ghost px-4 py-2 text-sm" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="ayeba-cta px-4 py-2 text-sm" disabled={busy} onClick={() => void create()}>
            Créer l’application
          </button>
        </div>
      </div>
    </div>
  );
}
