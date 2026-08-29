"use client";

import { useState } from "react";
import type { OAuthClient } from "@/lib/oauth-provider/types";
import { buildAuthorizeUrl } from "@/lib/oauth-provider/endpoints";
import { CopyField } from "./CopyField";

export function DeveloperAppDetail({
  app,
  newSecret,
  onRotate,
  onUpdated,
  onDeleted,
}: {
  app: OAuthClient;
  newSecret: string | null;
  onRotate: () => void;
  onUpdated: (app: OAuthClient) => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(app.name);
  const [description, setDescription] = useState(app.description);
  const [redirectUris, setRedirectUris] = useState(app.redirectUris.join("\n"));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/developers/apps/${app.clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        redirectUris: redirectUris.split("\n").map((s) => s.trim()).filter(Boolean),
      }),
    });
    const data = (await res.json()) as { app?: OAuthClient; error?: string };
    setBusy(false);
    if (data.app) {
      onUpdated(data.app);
      setMsg("Enregistré");
    } else setMsg(data.error || "Erreur");
  }

  async function remove() {
    if (!confirm(`Supprimer ${app.name} ?`)) return;
    await fetch(`/api/developers/apps/${app.clientId}`, { method: "DELETE" });
    onDeleted();
  }

  const authUrl = buildAuthorizeUrl({
    clientId: app.clientId,
    redirectUri: app.redirectUris[0] || "https://example.com/callback",
    state: "RANDOM_STATE",
  });

  return (
    <div className="dev-console-detail ayeba-panel">
      <div className="dev-console-detail-head">
        <div>
          <h2>{app.name}</h2>
          <p className="dev-console-muted">{app.description || "Application OAuth Ayeba"}</p>
        </div>
        <span className="dev-console-badge">Confidentielle</span>
      </div>

      <CopyField label="Client ID" value={app.clientId} />

      {newSecret ? (
        <div className="dev-console-secret-banner">
          <strong>Client secret — copiez maintenant, affiché une seule fois</strong>
          <code className="dev-console-code mt-2 block">{newSecret}</code>
        </div>
      ) : (
        <button type="button" className="ayeba-ghost text-sm" onClick={onRotate}>
          Régénérer le client secret
        </button>
      )}

      <div className="dev-console-field">
        <label>Nom affiché (écran consentement)</label>
        <input className="ayeba-input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="dev-console-field">
        <label>Description</label>
        <input
          className="ayeba-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="dev-console-field">
        <label>Redirect URIs autorisées (une par ligne, HTTPS)</label>
        <textarea
          className="ayeba-input dev-console-textarea"
          rows={4}
          value={redirectUris}
          onChange={(e) => setRedirectUris(e.target.value)}
        />
      </div>

      <CopyField label="URL d’autorisation (exemple)" value={authUrl} mono={false} />

      <div className="dev-console-actions">
        <button type="button" className="ayeba-cta px-4 py-2 text-sm" disabled={busy} onClick={() => void save()}>
          Enregistrer
        </button>
        <button type="button" className="ayeba-ghost px-4 py-2 text-sm text-red-300" onClick={() => void remove()}>
          Supprimer
        </button>
      </div>
      {msg ? <p className="dev-console-msg">{msg}</p> : null}
    </div>
  );
}
