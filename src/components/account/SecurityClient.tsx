"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function SecurityClient() {
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [setupUri, setSetupUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    void fetch("/api/account/security/totp")
      .then((r) => {
        if (r.status === 401) {
          setNeedsLogin(true);
          return null;
        }
        return r.json();
      })
      .then((d: { totpEnabled?: boolean } | null) => {
        if (d) setTotpEnabled(Boolean(d.totpEnabled));
      });
  }, []);

  async function beginSetup() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account/security/totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "begin" }),
    });
    const data = (await res.json()) as { secret?: string; uri?: string; error?: string };
    setBusy(false);
    if (data.secret) {
      setSecret(data.secret);
      setSetupUri(data.uri || null);
    } else setError(data.error || "Erreur");
  }

  async function confirmSetup() {
    setBusy(true);
    const res = await fetch("/api/account/security/totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm", code }),
    });
    const data = (await res.json()) as { backupCodes?: string[]; error?: string };
    setBusy(false);
    if (data.backupCodes) {
      setTotpEnabled(true);
      setBackupCodes(data.backupCodes);
      setSecret(null);
      setSetupUri(null);
    } else setError(data.error || "Code invalide");
  }

  async function disable() {
    setBusy(true);
    const res = await fetch("/api/account/security/totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disable", code }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (data.ok) {
      setTotpEnabled(false);
      setCode("");
    } else setError(data.error || "Erreur");
  }

  if (needsLogin) {
    return (
      <div className="ayeba-panel p-6">
        <Link href="/?auth=login" className="ayeba-cta inline-block px-5 py-2 text-sm">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="ayeba-panel p-6">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Authentification à deux facteurs (2FA)</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Protège votre compte Ayeba et les autorisations OAuth (comme Google Authenticator).
        </p>

        {totpEnabled ? (
          <div className="mt-4">
            <p className="dev-console-msg">2FA activée sur ce compte.</p>
            <input
              className="ayeba-input mt-3 max-w-xs"
              placeholder="Code 6 chiffres pour désactiver"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button type="button" className="ayeba-ghost mt-3 block text-sm" disabled={busy} onClick={() => void disable()}>
              Désactiver 2FA
            </button>
          </div>
        ) : secret ? (
          <div className="mt-4">
            <p className="text-sm text-[var(--muted)]">Scannez ce secret dans Google Authenticator ou Authy :</p>
            <code className="dev-console-code mt-2 block">{secret}</code>
            {setupUri ? (
              <a href={setupUri} className="connected-apps-link text-sm mt-2 inline-block">
                Ouvrir dans l&apos;app authenticator
              </a>
            ) : null}
            <input
              className="ayeba-input mt-3 max-w-xs"
              placeholder="Code à 6 chiffres"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button type="button" className="ayeba-cta mt-3 block px-4 py-2 text-sm" disabled={busy} onClick={() => void confirmSetup()}>
              Activer 2FA
            </button>
          </div>
        ) : (
          <button type="button" className="ayeba-cta mt-4 px-4 py-2 text-sm" disabled={busy} onClick={() => void beginSetup()}>
            Configurer 2FA
          </button>
        )}

        {backupCodes ? (
          <div className="dev-console-secret-banner mt-4">
            <strong>Codes de secours — enregistrez-les maintenant</strong>
            <ul className="mt-2 font-mono text-sm">
              {backupCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? <p className="oauth-consent-error mt-3">{error}</p> : null}
      </section>
    </div>
  );
}
