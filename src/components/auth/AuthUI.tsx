"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { useAuth } from "@/lib/auth";

// Compte unique Ayeba sur tous les produits Ayeba (modèle Google) —
// aucun bouton tiers : on se connecte ou on crée son compte Ayeba ici.

export function LoginModal() {
  const { loginOpen, setLoginOpen, loginWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loginOpen || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (auth === "failed" || auth === "config") {
      setError("Connexion refusée ou indisponible. Réessayez ou utilisez l’email.");
    }
  }, [loginOpen]);

  if (!loginOpen) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const err = await loginWithEmail(email, password);
    setLoading(false);
    if (err) setError(err);
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

        <form onSubmit={onSubmit} className="space-y-3">
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
            {loading ? "…" : "Entrer"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          Pas de compte Ayeba ?{" "}
          <button
            type="button"
            className="text-[var(--orange)]"
            onClick={() => {
              window.location.href = "/mail/signup";
            }}
          >
            S&apos;inscrire
          </button>
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

  const displayName = user.name?.trim() || user.email.split("@")[0];
  const initial = displayName.slice(0, 1).toUpperCase();
  const firstName = displayName.split(/\s+/)[0] || displayName;
  const providerLabel =
    user.provider === "google"
      ? "Google"
      : user.provider === "github"
        ? "GitHub"
        : user.provider === "microsoft"
          ? "Microsoft"
          : user.provider === "mail"
            ? "AYEBA Mail"
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
        <span className="ayeba-profile-avatar" aria-hidden>
          <span className="ayeba-profile-avatar-glow" />
          <span className="ayeba-profile-avatar-letter">{initial}</span>
        </span>
        <span className="ayeba-profile-meta">
          <span className="ayeba-profile-name">{firstName}</span>
          <span className="ayeba-profile-chevron" aria-hidden />
        </span>
      </button>

      {open ? (
        <div className="ayeba-profile-panel" role="menu">
          <div className="ayeba-profile-panel-head">
            <p className="ayeba-kicker ayeba-kicker-accent">Compte</p>
            <p className="ayeba-profile-panel-name">{displayName}</p>
            <p className="ayeba-profile-panel-email">{user.email}</p>
            <p className="ayeba-profile-panel-via">Via {providerLabel}</p>
          </div>

          <div className="ayeba-profile-panel-actions">
            <a href="/compte/applications" className="ayeba-profile-link" role="menuitem">
              <span className="ayeba-profile-link-label">Compte Ayeba</span>
              <span className="ayeba-profile-link-hint">Apps connectées · 2FA</span>
            </a>
            <a href="/studio/app" className="ayeba-profile-link" role="menuitem">
              <span className="ayeba-profile-link-label">Ayeba Studio</span>
              <span className="ayeba-profile-link-hint">Webmaster · Radar</span>
            </a>
            <a href="/telecharger" className="ayeba-profile-link" role="menuitem">
              <span className="ayeba-profile-link-label">Télécharger AYEBA</span>
              <span className="ayeba-profile-link-hint">Navigateur Windows</span>
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
