"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export function OmegaEntrerPage() {
  const params = useSearchParams();
  const returnTo = params.get("return") || "";
  const formOnly = params.get("form") === "1";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!returnTo || formOnly) return;
    window.location.replace(`/api/auth/omega/handoff?return=${encodeURIComponent(returnTo)}`);
  }, [returnTo, formOnly]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!returnTo) {
      setError("Lien Omega manquant.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/omega/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        name: mode === "register" ? name : undefined,
        mode: mode === "register" ? "register" : "login",
      }),
    });
    const data = (await res.json()) as { token?: string; error?: string };
    setLoading(false);
    if (!res.ok || !data.token) {
      setError(data.error ?? "Connexion refusée.");
      return;
    }
    const dest = new URL(returnTo);
    dest.searchParams.set("ayeba_token", data.token);
    window.location.href = dest.toString();
  }

  return (
    <div className="min-h-screen bg-[#07080A] px-4 py-16 text-white">
      <div className="mx-auto max-w-md">
        <p className="text-xs tracking-[0.3em] text-white/50">AYEBA</p>
        <h1 className="mt-3 text-3xl font-light">Ouvrir Omega</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          Connectez-vous avec votre compte Ayeba. Ce n’est pas Google : e-mail et mot de passe Ayeba, ou un compte déjà
          ouvert sur ce navigateur.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          {mode === "register" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail Ayeba"
            required
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            required
            minLength={4}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3"
          />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-white py-3 text-sm font-semibold tracking-wide text-black"
          >
            {loading ? "…" : mode === "register" ? "Créer le compte Ayeba" : "Entrer dans Omega"}
          </button>
        </form>
        <button
          type="button"
          className="mt-4 text-sm text-white/60"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Pas encore de compte Ayeba" : "J’ai déjà un compte Ayeba"}
        </button>
      </div>
    </div>
  );
}
