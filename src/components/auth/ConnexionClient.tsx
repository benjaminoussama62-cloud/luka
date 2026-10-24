"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { OAuthButton } from "@/components/auth/OAuthLogos";
import { useAuth } from "@/lib/auth";

type Provider = {
  id: string;
  label: string;
  authPath: string;
  configured: boolean;
};

const OAUTH_UI: { id: string; label: string; variant?: "google" | "mail" | "default" }[] = [
  { id: "mail", label: "Se connecter avec AYEBA Mail", variant: "mail" },
  { id: "google", label: "Se connecter avec Google", variant: "google" },
  { id: "github", label: "Continuer avec GitHub" },
  { id: "microsoft", label: "Continuer avec Microsoft" },
];

const DEFAULT_PROVIDERS: Provider[] = OAUTH_UI.map((p) => ({
  id: p.id,
  label: p.label,
  authPath: `/api/auth/${p.id}`,
  configured: false,
}));

/** Chemin interne sûr — refuse les URLs externes / protocol-relative. */
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

const NEXT_LABELS: [string, string][] = [
  ["/mbongo", "Ayeba Mbongo"],
  ["/mail", "Ayeba Mail"],
  ["/studio", "Ayeba Studio"],
  ["/developers", "Ayeba Developers"],
  ["/compte", "Compte Ayeba"],
  ["/ayebi", "Ayebi"],
];

function destinationLabel(next: string): string | null {
  for (const [prefix, label] of NEXT_LABELS) {
    if (next === prefix || next.startsWith(prefix + "/") || next.startsWith(prefix + "?")) return label;
  }
  return null;
}

export function ConnexionClient({ next }: { next: string }) {
  const { user, ready, loginWithEmail } = useAuth();
  const router = useRouter();
  const dest = safeNext(next);
  const destLabel = destinationLabel(dest);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>(DEFAULT_PROVIDERS);
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(dest);
  }, [ready, user, dest, router]);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((d: { providers: Provider[] }) => {
        if (d.providers?.length) setProviders(d.providers);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (auth === "failed") setError("Connexion sociale refusée. Réessayez ou utilisez l'email.");
    if (auth === "config") setError("OAuth mal configuré (clés / redirect URI).");
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const err = await loginWithEmail(email, password, mode === "register" ? name : undefined);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      window.location.href = dest;
    }
  }

  const configuredMap = Object.fromEntries(providers.map((p) => [p.id, p.configured]));

  function onProvider(id: string) {
    setError(null);
    if (id === "mail") {
      window.location.href = `/mail/signin?next=${encodeURIComponent(dest)}`;
      return;
    }
    if (!configuredMap[id]) {
      setError(
        "OAuth non branché sur le serveur. Ajoutez les clés correspondantes — ou utilisez l'email ci-dessous.",
      );
      return;
    }
    window.location.href = `/api/auth/${id}?next=${encodeURIComponent(dest)}`;
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="ayeba-modal w-full max-w-[420px] p-6 sm:p-8">
        <div className="mb-6">
          <AyebaWordmark size="md" />
          <p className="mt-2 font-[family-name:var(--font-mono)] text-[10px] tracking-[0.2em] text-[var(--muted)]">
            SESSION AYEBA
          </p>
          {destLabel ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              pour continuer vers <span className="text-[var(--ink)]">{destLabel}</span>
            </p>
          ) : null}
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
              <button
                type="button"
                className="text-[var(--orange)]"
                onClick={() => {
                  setMode("register");
                  setShowEmail(true);
                }}
              >
                S&apos;inscrire
              </button>
            </>
          ) : (
            <>
              Déjà inscrit ?{" "}
              <button
                type="button"
                className="text-[var(--orange)]"
                onClick={() => {
                  setMode("login");
                  setShowEmail(true);
                }}
              >
                Connexion
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
