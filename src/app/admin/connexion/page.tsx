"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, totpCode: totp || undefined }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        totpRequired?: boolean;
      } | null;
      if (!res.ok) {
        if (data?.totpRequired) setNeedsTotp(true);
        setError(data?.error ?? "Connexion impossible.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="ayeba-kicker ayeba-kicker-accent">Ayeba</p>
          <h1 className="mt-2 text-2xl font-semibold">Console d&rsquo;administration</h1>
          <p className="mt-1 text-sm opacity-60">
            Accès restreint — connexions journalisées et surveillées.
          </p>
        </div>

        <form onSubmit={submit} className="ayeba-panel space-y-4 p-6">
          {error ? (
            <div
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: "rgba(239,68,68,0.10)", border: "1px solid #ef444455", color: "#fca5a5" }}
            >
              {error}
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-xs font-medium opacity-70">Email administrateur</label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.03)" }}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium opacity-70">Mot de passe</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.03)" }}
            />
          </div>

          {needsTotp ? (
            <div>
              <label className="mb-1 block text-xs font-medium opacity-70">
                Code de vérification (2FA)
              </label>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-center text-lg tracking-[0.4em] outline-none"
                style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.03)" }}
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-50"
            style={{ background: "#e85d04", color: "#fff" }}
          >
            {busy ? "Vérification…" : "Accéder au back office"}
          </button>

          <p className="text-center text-[11px] opacity-40">
            Session de 8 h · 5 tentatives max par 15 min · toutes les actions sont auditées
          </p>
        </form>
      </div>
    </main>
  );
}
