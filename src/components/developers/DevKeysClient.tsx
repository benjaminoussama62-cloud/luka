"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { DeveloperApiKey } from "@/lib/developers/console";
import { API_SCOPES } from "@/lib/developers/catalog";
import { Chip, EmptyState, QuotaGauge, useProject } from "@/components/developers/DevShell";

export function DevKeysClient() {
  const { current, currentRole } = useProject();
  const [keys, setKeys] = useState<DeveloperApiKey[]>([]);
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    quotaPerDay: 1000,
    referrers: "",
    ips: "",
  });
  const [scopes, setScopes] = useState<string[]>(["search"]);
  const [msg, setMsg] = useState<string | null>(null);

  const canManage = currentRole === "owner" || currentRole === "editor";

  const load = useCallback(async () => {
    if (!current) return;
    const res = await fetch(`/api/developers/keys?projectId=${current.id}`);
    if (res.ok) setKeys(((await res.json()) as { keys: DeveloperApiKey[] }).keys);
  }, [current]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return;
    setMsg(null);
    const res = await fetch("/api/developers/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: current.id,
        name: form.name,
        quotaPerDay: form.quotaPerDay,
        scopes,
        restrictions: {
          referrers: form.referrers.split(",").map((s) => s.trim()).filter(Boolean),
          ips: form.ips.split(",").map((s) => s.trim()).filter(Boolean),
        },
      }),
    });
    const data = (await res.json()) as { secret?: string; error?: string };
    if (!res.ok) return setMsg(data.error || "Erreur");
    setNewSecret(data.secret || null);
    setCreating(false);
    setForm({ name: "", quotaPerDay: 1000, referrers: "", ips: "" });
    setScopes(["search"]);
    void load();
  }

  async function setStatus(id: string, status: "active" | "disabled") {
    await fetch(`/api/developers/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    void load();
  }

  async function revoke(id: string, name: string) {
    if (!confirm(`Révoquer définitivement « ${name} » ? Les appels échoueront immédiatement.`)) return;
    await fetch(`/api/developers/keys/${id}`, { method: "DELETE" });
    void load();
  }

  if (!current) {
    return (
      <EmptyState
        title="Sélectionnez un projet"
        hint="Les clés API sont rattachées à un projet."
        action={<Link href="/developers/console" className="dcw-link">Tableau de bord →</Link>}
      />
    );
  }

  return (
    <div className="dcw-stack">
      {newSecret && (
        <div className="dev-console-secret-banner">
          <p className="mb-1 font-semibold">
            Clé créée — copiez-la maintenant, elle ne sera plus jamais affichée.
          </p>
          <code className="dev-console-code break-all">{newSecret}</code>
          <div className="mt-2">
            <button
              type="button"
              className="ayeba-ghost px-3 py-1 text-xs"
              onClick={() => {
                void navigator.clipboard.writeText(newSecret);
                setNewSecret(null);
              }}
            >
              Copier et fermer
            </button>
          </div>
        </div>
      )}

      <section className="ayeba-panel p-5">
        <div className="dcw-section-head">
          <div>
            <h3>Clés API — {current.name}</h3>
            <p className="dev-console-muted">
              Authentifient les appels <code className="dev-console-code">/api/v1/*</code>. Le secret
              n&rsquo;est stocké que sous forme de hash.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              className="ayeba-cta px-3 py-1.5 text-xs"
              onClick={() => setCreating((v) => !v)}
            >
              + Créer une clé
            </button>
          )}
        </div>

        {creating && (
          <form onSubmit={create} className="dcw-form-card">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="dev-console-field">
                <span className="dev-console-field-head">Nom</span>
                <input
                  className="dcw-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Serveur de production, app mobile…"
                  required
                />
              </label>
              <label className="dev-console-field">
                <span className="dev-console-field-head">Quota quotidien</span>
                <input
                  className="dcw-input"
                  type="number"
                  min={1}
                  max={1000000}
                  value={form.quotaPerDay}
                  onChange={(e) => setForm({ ...form, quotaPerDay: Number(e.target.value) })}
                />
              </label>
              <label className="dev-console-field">
                <span className="dev-console-field-head">
                  Référents autorisés (optionnel, séparés par virgules)
                </span>
                <input
                  className="dcw-input"
                  value={form.referrers}
                  onChange={(e) => setForm({ ...form, referrers: e.target.value })}
                  placeholder="monsite.cd, app.monsite.cd"
                />
              </label>
              <label className="dev-console-field">
                <span className="dev-console-field-head">
                  IPs autorisées (optionnel, séparées par virgules)
                </span>
                <input
                  className="dcw-input"
                  value={form.ips}
                  onChange={(e) => setForm({ ...form, ips: e.target.value })}
                  placeholder="41.243.x.x"
                />
              </label>
            </div>
            <fieldset className="dcw-fieldset">
              <legend>Portées</legend>
              {API_SCOPES.map((s) => (
                <label key={s.id} className="dcw-check">
                  <input
                    type="checkbox"
                    checked={scopes.includes(s.id)}
                    onChange={(e) =>
                      setScopes(
                        e.target.checked
                          ? [...scopes, s.id]
                          : scopes.filter((x) => x !== s.id),
                      )
                    }
                  />
                  <span>
                    <strong>{s.label}</strong> — {s.desc}
                  </span>
                </label>
              ))}
            </fieldset>
            <div>
              <button type="submit" className="ayeba-cta px-4 py-2 text-sm">Créer la clé</button>
            </div>
          </form>
        )}
        {msg && <p className="dcw-error">{msg}</p>}

        {keys.length === 0 ? (
          <EmptyState
            title="Aucune clé"
            hint="Créez une clé pour authentifier vos appels API."
          />
        ) : (
          <table className="dcw-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Clé</th>
                <th>Portées</th>
                <th>Quota du jour</th>
                <th>Statut</th>
                <th>Dernier usage</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td className="font-medium">{k.name}</td>
                  <td><code className="dev-console-code">{k.prefix}…</code></td>
                  <td>
                    <div className="dcw-chips">
                      {k.scopes.map((s) => (
                        <Chip key={s} tone="blue">{s}</Chip>
                      ))}
                    </div>
                  </td>
                  <td><QuotaGauge used={k.usedToday} quota={k.quotaPerDay} /></td>
                  <td>
                    <Chip
                      tone={k.status === "active" ? "green" : k.status === "disabled" ? "amber" : "red"}
                    >
                      {k.status === "active" ? "Active" : k.status === "disabled" ? "Désactivée" : "Révoquée"}
                    </Chip>
                  </td>
                  <td className="dev-console-muted">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString("fr") : "—"}
                  </td>
                  <td className="text-right">
                    {canManage && k.status !== "revoked" && (
                      <span className="dcw-row-actions">
                        <button
                          type="button"
                          className="ayeba-ghost px-2 py-1 text-xs"
                          onClick={() => setStatus(k.id, k.status === "active" ? "disabled" : "active")}
                        >
                          {k.status === "active" ? "Désactiver" : "Réactiver"}
                        </button>
                        <button
                          type="button"
                          className="dcw-danger px-2 py-1 text-xs"
                          onClick={() => revoke(k.id, k.name)}
                        >
                          Révoquer
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
