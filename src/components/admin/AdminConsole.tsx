"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = { role: string; email: string };
type Overview = { stats: Record<string, number>; users: Array<{ id: string; name: string; email: string; role: string }>; tickets: Array<{ id: string; subject: string; status: string; priority: string; email: string }>; audit: Array<{ action: string; targetId: string; createdAt: string }> };

export function AdminConsole({ role, email }: Props) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [form, setForm] = useState({ name: "", email: "", role: "moderator" });
  useEffect(() => {
    fetch("/api/admin/overview").then(async (response) => {
      if (!response.ok) throw new Error("Accès refusé");
      setData(await response.json() as Overview);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Erreur"));
  }, []);

  async function createStaff() {
    const response = await fetch("/api/admin/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, password, action: "create" }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) return setError(result.error || "Création impossible");
    setPassword("");
    setData(null);
    window.location.reload();
  }

  return (
    <main className="min-h-dvh bg-[var(--bg)] px-4 py-8 text-[var(--ink)]">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="ayeba-kicker ayeba-kicker-accent">AYEBA CONTROL PLANE</p><h1 className="mt-2 text-4xl font-semibold">Back office</h1><p className="mt-2 text-sm text-[var(--muted)]">{email} · {role}</p></div>
          <Link href="/" className="ayeba-ghost px-4 py-2 text-sm">Retour à Ayeba</Link>
        </header>
        {error ? <p className="mb-4 rounded-xl border border-red-500/40 p-3 text-red-300">{error}</p> : null}
        {data ? <><section className="grid gap-4 sm:grid-cols-4">{Object.entries(data.stats).map(([key, value]) => <div className="ayeba-panel p-5" key={key}><p className="text-xs uppercase text-[var(--muted)]">{key}</p><p className="mt-2 text-3xl">{value}</p></div>)}</section>
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]"><div className="ayeba-panel p-5"><h2 className="text-xl font-semibold">Utilisateurs et responsabilités</h2><div className="mt-4 space-y-2">{data.users.map((item) => <div className="flex items-center justify-between border-b border-[var(--line)] py-3" key={item.id}><div><p>{item.name}</p><p className="text-xs text-[var(--muted)]">{item.email}</p></div><span className="rounded-full border px-3 py-1 text-xs">{item.role}</span></div>)}</div></div>
            <div className="ayeba-panel p-5"><h2 className="text-xl font-semibold">Ajouter un responsable</h2><p className="mt-2 text-xs text-[var(--muted)]">Superadmin uniquement · mot de passe minimum 16 caractères.</p><div className="mt-4 space-y-3"><input className="w-full rounded-lg border bg-transparent p-3" placeholder="Nom" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><input className="w-full rounded-lg border bg-transparent p-3" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><input className="w-full rounded-lg border bg-transparent p-3" placeholder="Mot de passe temporaire" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /><select className="w-full rounded-lg border bg-transparent p-3" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="moderator">Modérateur</option><option value="admin">Administrateur</option><option value="support">Support</option></select><button className="ayeba-cta w-full px-4 py-3" type="button" onClick={() => void createStaff()}>Créer le responsable</button></div></div></section>
            <section className="mt-6 grid gap-6 lg:grid-cols-2"><div className="ayeba-panel p-5"><h2 className="text-xl font-semibold">Support</h2>{data.tickets.map((ticket) => <div className="border-b border-[var(--line)] py-3" key={ticket.id}><p>{ticket.subject}</p><p className="text-xs text-[var(--muted)]">{ticket.email} · {ticket.status} · {ticket.priority}</p></div>)}</div><div className="ayeba-panel p-5"><h2 className="text-xl font-semibold">Journal de sécurité</h2>{data.audit.map((entry, index) => <div className="border-b border-[var(--line)] py-3 text-sm" key={`${entry.action}-${index}`}><p>{entry.action}</p><p className="text-xs text-[var(--muted)]">{entry.targetId} · {entry.createdAt}</p></div>)}</div></section>
        </> : <p>Chargement du contrôle central…</p>}
      </div>
    </main>
  );
}
