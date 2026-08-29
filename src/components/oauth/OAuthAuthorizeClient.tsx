"use client";

import Link from "next/link";
import { useState } from "react";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import type { OAuthClient } from "@/lib/oauth-provider/types";
import { describeScopes, parseScopeString } from "@/lib/oauth-provider/scopes";

type Props = {
  client: OAuthClient;
  params: {
    clientId: string;
    redirectUri: string;
    scope: string;
    state?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
  };
  user: { name: string; email: string } | null;
};

export function OAuthAuthorizeClient({ client, params, user: initialUser }: Props) {
  const [user, setUser] = useState(initialUser);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresTotp, setRequiresTotp] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  const scopes = describeScopes(parseScopeString(params.scope));

  async function submit(action: "approve" | "deny" | "login") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/oauth/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action === "login" ? "login" : action,
          client_id: params.clientId,
          redirect_uri: params.redirectUri,
          scope: params.scope,
          state: params.state,
          code_challenge: params.codeChallenge,
          code_challenge_method: params.codeChallengeMethod,
          email: action === "login" ? email : undefined,
          password: action === "login" ? password : undefined,
          name: mode === "register" ? name : undefined,
          mode,
          totp_code: action === "approve" ? totpCode : undefined,
        }),
      });
      const data = (await res.json()) as {
        redirect?: string;
        error?: string;
        user?: { name: string; email: string };
        requiresTotp?: boolean;
      };
      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      if (data.error) {
        setError(data.error);
        if (data.requiresTotp) setRequiresTotp(true);
        return;
      }
      if (action === "login" && res.ok && data.user) {
        setUser(data.user);
        if (data.requiresTotp) setRequiresTotp(true);
        return;
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="oauth-consent-shell">
      <Link href="/" className="oauth-consent-brand" aria-label="Ayeba">
        <AyebaWordmark size="sm" />
      </Link>
      <div className="oauth-consent-card ayeba-panel">
        <div className="oauth-consent-header">
          <p className="ayeba-kicker ayeba-kicker-accent">Compte Ayeba</p>
          <h1 className="oauth-consent-title">
            {user ? "Autoriser l’accès" : "Se connecter avec Ayeba"}
          </h1>
        </div>

        <div className="oauth-consent-app">
          <div className="oauth-consent-app-icon" aria-hidden>
            {client.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={client.logoUrl} alt="" className="oauth-consent-app-logo" />
            ) : (
              (client.name[0] || "A").toUpperCase()
            )}
          </div>
          <div>
            <p className="oauth-consent-app-name">
              {client.name}
              {client.verified ? <span className="dev-verified-badge">Vérifiée</span> : null}
            </p>
            <p className="oauth-consent-app-desc">
              {client.description || "Application tierce connectée à Ayeba"}
            </p>
            <p className="oauth-consent-uri">{params.redirectUri}</p>
          </div>
        </div>

        {!user ? (
          <div className="oauth-consent-login">
            <div className="oauth-consent-tabs">
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => setMode("login")}
              >
                Connexion
              </button>
              <button
                type="button"
                className={mode === "register" ? "active" : ""}
                onClick={() => setMode("register")}
              >
                Créer un compte
              </button>
            </div>
            {mode === "register" ? (
              <input
                className="ayeba-input oauth-input"
                placeholder="Nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            ) : null}
            <input
              className="ayeba-input oauth-input"
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="ayeba-input oauth-input"
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="ayeba-cta w-full"
              disabled={busy}
              onClick={() => void submit("login")}
            >
              {busy ? "…" : "Continuer"}
            </button>
            <a
              href={`/api/auth/google?return=${encodeURIComponent(
                `/oauth/authorize?${new URLSearchParams(
                  Object.fromEntries(
                    Object.entries({
                      client_id: params.clientId,
                      redirect_uri: params.redirectUri,
                      response_type: "code",
                      scope: params.scope,
                      state: params.state || "",
                      code_challenge: params.codeChallenge || "",
                      code_challenge_method: params.codeChallengeMethod || "",
                    }).filter(([, v]) => v),
                  ),
                ).toString()}`,
              )}`}
              className="oauth-google-link"
            >
              Continuer avec Google
            </a>
          </div>
        ) : (
          <>
            <p className="oauth-consent-user">
              Connecté en tant que <strong>{user.name}</strong> ({user.email}){" "}
              <button type="button" className="oauth-switch-account" onClick={() => setUser(null)}>
                Changer de compte
              </button>
            </p>
            <div className="oauth-consent-scopes">
              <p className="oauth-consent-scopes-title">Cette application pourra :</p>
              <ul>
                {scopes.map((s) => (
                  <li key={s.id}>
                    <strong>{s.label}</strong>
                    <span>{s.description}</span>
                  </li>
                ))}
              </ul>
            </div>
            {requiresTotp ? (
              <input
                className="ayeba-input oauth-input"
                placeholder="Code 2FA (6 chiffres)"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            ) : null}
            <div className="oauth-consent-actions">
              <button
                type="button"
                className="ayeba-ghost flex-1"
                disabled={busy}
                onClick={() => void submit("deny")}
              >
                Refuser
              </button>
              <button
                type="button"
                className="ayeba-cta flex-1"
                disabled={busy}
                onClick={() => void submit("approve")}
              >
                {busy ? "…" : "Autoriser"}
              </button>
            </div>
          </>
        )}

        {error ? <p className="oauth-consent-error">{error}</p> : null}

        <p className="oauth-consent-footer">
          En continuant, vous autorisez {client.name} à utiliser votre compte Ayeba selon les
          permissions ci-dessus. Gérez vos apps dans{" "}
          <a href="/developers/console">Console développeurs</a>.
        </p>
      </div>
    </div>
  );
}
