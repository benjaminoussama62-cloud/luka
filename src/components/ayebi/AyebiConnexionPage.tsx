"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { OAuthButton } from "@/components/auth/OAuthLogos";
import { useAuth } from "@/lib/auth";
import { AyebiStage } from "@/components/ayebi/AyebiStage";

export function AyebiConnexionPage() {
  const { user, loginWithEmail, loginWithProvider, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/ayebi/contribuer";

  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(redirect);
  }, [ready, user, router, redirect]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const err = await loginWithEmail(email, password, mode === "register" ? name : undefined);
    setLoading(false);
    if (err) setError(err);
    else router.push(redirect);
  }

  return (
    <>
      <AyebiStage />
      <div className="relative z-10 px-4 py-12">
        <div className="mx-auto max-w-md">
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Compte Ayebi</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            Créez un compte pour rédiger et modifier l&apos;encyclopédie congolaise Ayebi — libre, collaborative, 100&nbsp;%
            RDC.
          </p>

          <div className="ayeba-panel mt-8 space-y-3 p-6">
            <OAuthButton id="google" label="Google" variant="google" onClick={() => loginWithProvider("google")} />
            <OAuthButton id="github" label="GitHub" onClick={() => loginWithProvider("github")} />

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--line)]" />
              <span className="text-[10px] text-[var(--faint)]">EMAIL</span>
              <div className="h-px flex-1 bg-[var(--line)]" />
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              {mode === "register" && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom de contributeur"
                  className="ayeba-glass w-full rounded-xl px-4 py-3 text-white"
                />
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="ayeba-glass w-full rounded-xl px-4 py-3 text-white"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe (min. 4 caractères)"
                required
                className="ayeba-glass w-full rounded-xl px-4 py-3 text-white"
              />
              {error ? <p className="text-sm text-[var(--bad)]">{error}</p> : null}
              <button type="submit" disabled={loading} className="ayeba-pill w-full py-3 text-sm">
                {loading ? "…" : mode === "register" ? "Créer mon compte Ayebi" : "Se connecter"}
              </button>
            </form>

            <p className="text-center text-sm text-[var(--muted)]">
              {mode === "register" ? (
                <>
                  Déjà contributeur ?{" "}
                  <button type="button" className="text-[var(--accent)]" onClick={() => setMode("login")}>
                    Connexion
                  </button>
                </>
              ) : (
                <>
                  Nouveau ?{" "}
                  <button type="button" className="text-[var(--accent)]" onClick={() => setMode("register")}>
                    Créer un compte
                  </button>
                </>
              )}
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-[var(--faint)]">
            <Link href="/ayebi" className="hover:text-white">
              ← Retour à Ayebi
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
