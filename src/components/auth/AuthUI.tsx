"use client";

import { FormEvent, useEffect, useState } from "react";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { OAuthButton } from "@/components/auth/OAuthLogos";
import { useAuth } from "@/lib/auth";

type Provider = {
  id: string;
  label: string;
  authPath: string;
  configured: boolean;
  brandColor: string;
};

const OAUTH_UI: { id: string; label: string; variant?: "google" | "default" }[] = [
  { id: "google", label: "Se connecter avec Google", variant: "google" },
  { id: "github", label: "Continuer avec GitHub" },
  { id: "microsoft", label: "Continuer avec Microsoft" },
];

const DEFAULT_PROVIDERS: Provider[] = OAUTH_UI.map((p) => ({
  id: p.id,
  label: p.label,
  authPath: `/api/auth/${p.id}`,
  configured: false,
  brandColor: "#fff",
}));

export function LoginModal() {
  const { loginOpen, setLoginOpen, loginWithEmail, loginWithProvider } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>(DEFAULT_PROVIDERS);
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    if (!loginOpen) return;
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((d: { providers: Provider[] }) => {
        if (d.providers?.length) setProviders(d.providers);
      })
      .catch(() => {});
  }, [loginOpen]);

  useEffect(() => {
    if (!loginOpen || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (auth === "failed") setError("Connexion sociale refusée. Réessayez ou utilisez l’email.");
    if (auth === "config") setError("OAuth mal configuré (clés / redirect URI).");
  }, [loginOpen]);

  if (!loginOpen) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const err = await loginWithEmail(email, password, mode === "register" ? name : undefined);
    setLoading(false);
    if (err) setError(err);
  }

  const configuredMap = Object.fromEntries(providers.map((p) => [p.id, p.configured]));

  function onProvider(id: string) {
    setError(null);
    if (!configuredMap[id]) {
      setError(
        "OAuth non branché sur le serveur. Ajoutez GOOGLE_CLIENT_ID/SECRET, GITHUB_* et MICROSOFT_* sur Vercel, avec les callbacks https://ayeba.app/api/auth/{google|github|microsoft}/callback — ou utilisez l’email ci-dessous.",
      );
      return;
    }
    loginWithProvider(id);
  }

  return (
    <div className="ayeba-overlay z-[80]">
      <div className="ayeba-modal max-w-[400px] p-6 sm:p-8 animate-rise">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <AyebaWordmark size="md" />
            <p className="mt-2 font-[family-name:var(--font-mono)] text-[10px] tracking-[0.2em] text-[var(--muted)]">
              SESSION
            </p>
          </div>
          <button type="button" onClick={() => setLoginOpen(false)} className="text-[var(--faint)] hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-2">
          {OAUTH_UI.map((p) => (
            <OAuthButton
              key={p.id}
              id={p.id}
              label={p.label}
              variant={p.variant}
              onClick={() => onProvider(p.id)}
            />
          ))}
          {error && !showEmail ? <p className="text-sm text-[var(--bad)]">{error}</p> : null}
        </div>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--line)]" />
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--faint)]">EMAIL</span>
          <div className="h-px flex-1 bg-[var(--line)]" />
        </div>

        {!showEmail ? (
          <button type="button" onClick={() => setShowEmail(true)} className="ayeba-ghost w-full py-3 text-sm">
            Continuer avec email
          </button>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "register" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom"
                className="ayeba-glass w-full rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--line-bright)]"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="ayeba-glass w-full rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--line-bright)]"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              required
              className="ayeba-glass w-full rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--line-bright)]"
            />
            {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
            <button type="submit" disabled={loading} className="ayeba-cta w-full py-3">
              {loading ? "…" : mode === "login" ? "Entrer" : "Créer le compte"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          {mode === "login" ? (
            <>
              Pas de compte ?{" "}
              <button type="button" className="text-[var(--orange)]" onClick={() => setMode("register")}>
                S&apos;inscrire
              </button>
            </>
          ) : (
            <>
              Déjà inscrit ?{" "}
              <button type="button" className="text-[var(--orange)]" onClick={() => setMode("login")}>
                Connexion
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export function ProfileMenu() {
  const { user, setLoginOpen, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  async function loadHistory() {
    try {
      const res = await fetch("/api/history");
      if (!res.ok) return;
      const data = (await res.json()) as { history: string[] };
      setHistory(data.history ?? []);
    } catch {
      setHistory([]);
    }
  }

  if (!user) {
    return (
      <button type="button" onClick={() => setLoginOpen(true)} className="ayeba-cta px-4 py-2">
        Connexion
      </button>
    );
  }

  const initial = user.name.slice(0, 1).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void loadHistory();
        }}
        className="grid h-9 w-9 place-items-center border border-[var(--line)] text-xs font-semibold text-white"
        style={{ background: `linear-gradient(135deg, ${user.avatarColor}, #111)` }}
        aria-label="Profil"
      >
        {initial}
      </button>
      {open && (
        <div className="ayeba-modal absolute right-0 z-50 mt-2 w-72 overflow-hidden">
          <div className="border-b border-[var(--line)] px-4 py-3">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--muted)]">{user.email}</p>
            <p className="mt-1 font-[family-name:var(--font-mono)] text-[10px] uppercase text-[var(--faint)]">
              via {user.provider}
            </p>
          </div>
          {history.length > 0 && (
            <div className="max-h-40 overflow-y-auto border-b border-[var(--line)] px-4 py-2">
              <p className="hud-label mb-2">Historique</p>
              {history.slice(0, 8).map((h) => (
                <p key={h} className="truncate py-1 text-xs text-[var(--muted)]">
                  {h}
                </p>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              void logout();
              setOpen(false);
            }}
            className="w-full px-4 py-3 text-left text-xs text-[var(--muted)] hover:bg-white/5"
          >
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
