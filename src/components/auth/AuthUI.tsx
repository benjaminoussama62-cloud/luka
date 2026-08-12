"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const providerLabel =
    user.provider === "google"
      ? "Google"
      : user.provider === "github"
        ? "GitHub"
        : user.provider === "microsoft"
          ? "Microsoft"
          : "Email";

  return (
    <div className="ayeba-profile" ref={rootRef}>
      <button
        type="button"
        className={`ayeba-profile-btn ${open ? "is-open" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menu profil"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void loadHistory();
        }}
      >
        <span
          className="ayeba-profile-avatar"
          style={{ background: `linear-gradient(145deg, ${user.avatarColor}, #0a0a0c)` }}
          aria-hidden
        >
          {initial}
        </span>
        <span className="ayeba-profile-meta">
          <span className="ayeba-profile-name">{firstName}</span>
          <span className="ayeba-profile-chevron" aria-hidden>
            ▾
          </span>
        </span>
      </button>

      {open ? (
        <div className="ayeba-profile-panel" role="menu">
          <div className="ayeba-profile-panel-head">
            <span
              className="ayeba-profile-avatar ayeba-profile-avatar-lg"
              style={{ background: `linear-gradient(145deg, ${user.avatarColor}, #0a0a0c)` }}
              aria-hidden
            >
              {initial}
            </span>
            <div className="ayeba-profile-panel-id">
              <p className="ayeba-profile-panel-name">{user.name}</p>
              <p className="ayeba-profile-panel-email">{user.email}</p>
              <p className="ayeba-profile-panel-via">Via {providerLabel}</p>
            </div>
          </div>

          <div className="ayeba-profile-panel-actions">
            <a href="/studio/app" className="ayeba-profile-link" role="menuitem">
              Ayeba Studio
            </a>
            <a href="/telecharger" className="ayeba-profile-link" role="menuitem">
              Télécharger AYEBA
            </a>
          </div>

          {history.length > 0 ? (
            <div className="ayeba-profile-history">
              <p className="ayeba-profile-history-label">Recherches récentes</p>
              <ul>
                {history.slice(0, 6).map((h) => (
                  <li key={h}>
                    <span className="ayeba-profile-history-item">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <button
            type="button"
            role="menuitem"
            className="ayeba-profile-logout"
            onClick={() => {
              void logout();
              setOpen(false);
            }}
          >
            Déconnexion
          </button>
        </div>
      ) : null}
    </div>
  );
}
