"use client";

import { FormEvent, useState } from "react";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { useAuth } from "@/lib/auth";

export function LoginModal() {
  const { loginOpen, setLoginOpen, loginWithEmail, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!loginOpen) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const err = await loginWithEmail(email, password, mode === "register" ? name : undefined);
    setLoading(false);
    if (err) setError(err);
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="hud-frame w-full max-w-[400px] p-8 animate-rise">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <AyebaWordmark size="md" accentLast />
            <p className="mt-2 font-[family-name:var(--font-mono)] text-[11px] tracking-wider text-[var(--muted)]">
              {mode === "login" ? "AUTH // SESSION" : "AUTH // REGISTER"}
            </p>
          </div>
          <button type="button" onClick={() => setLoginOpen(false)} className="text-[var(--faint)] hover:text-white">
            ✕
          </button>
        </div>

        <button
          type="button"
          onClick={() => loginWithGoogle()}
          className="ayeba-ghost mb-5 flex w-full items-center justify-center gap-2 py-3"
        >
          Google OAuth
        </button>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "register" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom"
              className="w-full border border-[var(--line)] bg-black/50 px-4 py-3 text-white outline-none focus:border-[var(--orange)]"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full border border-[var(--line)] bg-black/50 px-4 py-3 text-white outline-none focus:border-[var(--orange)]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            required
            className="w-full border border-[var(--line)] bg-black/50 px-4 py-3 text-white outline-none focus:border-[var(--orange)]"
          />
          {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
          <button type="submit" disabled={loading} className="ayeba-cta w-full py-3">
            {loading ? "…" : mode === "login" ? "Entrer" : "Créer"}
          </button>
        </form>

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
        <div className="hud-frame absolute right-0 z-50 mt-2 w-72 overflow-hidden">
          <div className="border-b border-[var(--line)] px-4 py-3">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--muted)]">{user.email}</p>
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
