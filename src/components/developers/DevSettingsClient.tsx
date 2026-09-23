"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState, useProject } from "@/components/developers/DevShell";

export function DevSettingsClient() {
  const { current, currentRole, reload } = useProject();
  const router = useRouter();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");

  const isOwner = currentRole === "owner";

  if (!current) {
    return (
      <EmptyState
        title="Sélectionnez un projet"
        hint="Les paramètres sont propres à chaque projet."
        action={<Link href="/developers/console" className="dcw-link">Tableau de bord →</Link>}
      />
    );
  }

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return;
    setMsg(null);
    const res = await fetch(`/api/developers/projects/${current.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) return setMsg(data.error || "Erreur");
    setName("");
    reload();
    setMsg("Projet renommé.");
  }

  async function remove() {
    if (!current || confirmName !== current.name) return;
    const res = await fetch(`/api/developers/projects/${current.id}`, { method: "DELETE" });
    if (res.ok) {
      reload();
      router.push("/developers/console");
    }
  }

  return (
    <div className="dcw-stack">
      <div className="dcw-head">
        <div>
          <h2 className="dcw-title">Paramètres — {current.name}</h2>
          <p className="dev-console-muted">
            ID projet : <code className="dev-console-code">{current.id}</code>
          </p>
        </div>
      </div>

      <section className="ayeba-panel p-5">
        <h3 className="mb-3">Général</h3>
        <dl className="dcw-api-meta mb-4">
          <div><dt>Créé le</dt><dd>{new Date(current.createdAt).toLocaleString("fr")}</dd></div>
          <div><dt>Clés API</dt><dd>{current.apiKeys}</dd></div>
          <div><dt>Applications OAuth</dt><dd>{current.oauthClients}</dd></div>
        </dl>
        {isOwner ? (
          <form onSubmit={rename} className="dcw-form-inline">
            <input
              className="dcw-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={current.name}
              maxLength={80}
              required
            />
            <button type="submit" className="ayeba-cta px-4 py-2 text-sm">Renommer</button>
          </form>
        ) : (
          <p className="dev-console-muted">Seul le propriétaire peut modifier le projet.</p>
        )}
        {msg && <p className={msg.startsWith("Projet") ? "dcw-ok" : "dcw-error"}>{msg}</p>}
      </section>

      {isOwner && (
        <section className="ayeba-panel dcw-danger-zone p-5">
          <h3 className="mb-2">Zone de danger</h3>
          <p className="dev-console-muted mb-3">
            La suppression révoque toutes les clés API du projet et détache les applications
            OAuth. Les journaux sont conservés pour audit. Irréversible.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void remove();
            }}
            className="dcw-form-inline"
          >
            <input
              className="dcw-input"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={`Saisissez « ${current.name} » pour confirmer`}
            />
            <button
              type="submit"
              className="dcw-danger px-4 py-2 text-sm"
              disabled={confirmName !== current.name}
            >
              Supprimer le projet
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
