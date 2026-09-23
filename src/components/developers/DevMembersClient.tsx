"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ProjectMember } from "@/lib/developers/console";
import { Chip, EmptyState, useProject } from "@/components/developers/DevShell";

export function DevMembersClient() {
  const { current, currentRole } = useProject();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [msg, setMsg] = useState<string | null>(null);

  const isOwner = currentRole === "owner";

  const load = useCallback(async () => {
    if (!current) return;
    const res = await fetch(`/api/developers/members?projectId=${current.id}`);
    if (res.ok) setMembers(((await res.json()) as { members: ProjectMember[] }).members);
  }, [current]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return;
    setMsg(null);
    const res = await fetch("/api/developers/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: current.id, email, role }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) return setMsg(data.error || "Erreur");
    setEmail("");
    void load();
  }

  async function remove(userId: string, name: string) {
    if (!current || !confirm(`Retirer ${name} du projet ?`)) return;
    await fetch("/api/developers/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: current.id, userId }),
    });
    void load();
  }

  if (!current) {
    return (
      <EmptyState
        title="Sélectionnez un projet"
        hint="Les membres se gèrent par projet."
        action={<Link href="/developers/console" className="dcw-link">Tableau de bord →</Link>}
      />
    );
  }

  return (
    <div className="dcw-stack">
      <div className="dcw-head">
        <div>
          <h2 className="dcw-title">Membres — {current.name}</h2>
          <p className="dev-console-muted">
            Donnez accès au projet à d&rsquo;autres comptes Ayeba. Les rôles s&rsquo;appliquent côté serveur.
          </p>
        </div>
      </div>

      <section className="ayeba-panel p-5">
        <h3 className="mb-1">Propriétaire</h3>
        <p className="dev-console-muted mb-4">
          Vous{isOwner ? "" : " (via un membre de l'équipe)"} — contrôle total : membres, clés,
          suppression du projet.
        </p>

        <h3 className="mb-2">Membres invités</h3>
        {members.length === 0 ? (
          <EmptyState
            title="Aucun membre"
            hint="Invitez des collaborateurs par email — ils doivent avoir un compte Ayeba."
          />
        ) : (
          <table className="dcw-table">
            <thead>
              <tr><th>Utilisateur</th><th>Rôle</th><th>Ajouté le</th><th></th></tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.userId}>
                  <td>
                    <p className="font-medium">{m.name || m.email}</p>
                    <p className="dev-console-muted text-xs">{m.email}</p>
                  </td>
                  <td>
                    <Chip tone={m.role === "editor" ? "blue" : "gray"}>
                      {m.role === "editor" ? "Éditeur" : "Lecteur"}
                    </Chip>
                  </td>
                  <td className="dev-console-muted">
                    {new Date(m.createdAt).toLocaleDateString("fr")}
                  </td>
                  <td className="text-right">
                    {isOwner && (
                      <button
                        type="button"
                        className="dcw-danger px-2 py-1 text-xs"
                        onClick={() => remove(m.userId, m.name || m.email)}
                      >
                        Retirer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {isOwner && (
          <form onSubmit={add} className="dcw-form-inline mt-4">
            <input
              className="dcw-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@ayeba.app"
              required
            />
            <select
              className="dcw-input dcw-input-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as "viewer" | "editor")}
            >
              <option value="viewer">Lecteur — consulte métriques et journaux</option>
              <option value="editor">Éditeur — gère aussi clés et APIs</option>
            </select>
            <button type="submit" className="ayeba-cta px-4 py-2 text-sm">Inviter</button>
          </form>
        )}
        {msg && <p className="dcw-error">{msg}</p>}
      </section>
    </div>
  );
}
