"use client";

import { useState } from "react";
import { AyebaMailLogo } from "@/components/auth/OAuthLogos";

type SigninProps = {
  onDone: () => void;
  onBack?: () => void;
};

type SignupProps = {
  defaultName?: string;
  onDone: () => void;
  onBack?: () => void;
};

const LANGS = [
  { id: "fr", label: "Français" },
  { id: "ln", label: "Lingala" },
  { id: "sw", label: "Swahili" },
  { id: "en", label: "English" },
];

const MAX_BIRTHDATE = new Date(Date.now() - 13 * 365.25 * 86400e3)
  .toISOString()
  .slice(0, 10);

function hueFrom(text: string) {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function SigninFlow({ onDone, onBack }: SigninProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const request = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/mail/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as { ok?: boolean; devCode?: string; error?: string };
      if (!res.ok || data.error) return setErr(data.error || "Envoi impossible.");
      if (data.devCode) setDevCode(data.devCode);
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/mail/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.error) return setErr(data.error || "Vérification échouée.");
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mail-root">
      <div className="mail-gate">
        <div className="mail-gate-panel">
          <div className="mail-auth-logo">
            <AyebaMailLogo size={56} />
          </div>
          <span className="mail-kicker">AYEBA MAIL — CONNEXION</span>
          <h2>Votre numéro, votre clé</h2>
          <p className="sub">
            Entrez le numéro lié à votre boîte — un code SMS vous connecte.
            Pas de mot de passe.
          </p>
          {devCode && (
            <div className="mail-dev-code">MODE DEV — code : {devCode}</div>
          )}
          {err && <div className="mail-err">{err}</div>}
          {!sent ? (
            <>
              <div className="mail-field">
                <label>Numéro de téléphone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+243 9XX XXX XXX"
                  inputMode="tel"
                  autoFocus
                />
              </div>
              <button className="mail-cta" disabled={busy || phone.length < 8} onClick={() => void request()}>
                {busy ? "Envoi…" : "Recevoir le code"}
              </button>
            </>
          ) : (
            <>
              <div className="mail-field">
                <label>Code reçu par SMS</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  autoFocus
                  style={{ letterSpacing: "0.5em", fontFamily: "var(--font-mono), monospace", fontSize: 20, textAlign: "center" }}
                />
              </div>
              <button className="mail-cta" disabled={busy || code.length !== 6} onClick={() => void verify()}>
                {busy ? "Vérification…" : "Se connecter"}
              </button>
            </>
          )}
          {onBack && (
            <button className="mail-btn link" style={{ marginTop: 14 }} onClick={onBack}>
              ← Retour
            </button>
          )}
          <p className="mail-auth-alt">
            Pas encore de boîte ? <a href="/mail/signup">Créer un compte AYEBA Mail</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export function SignupFlow({ defaultName = "", onDone, onBack }: SignupProps) {
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState("");
  const [avail, setAvail] = useState<{ ok: boolean; msg: string } | null>(null);
  const [displayName, setDisplayName] = useState(defaultName);
  const [birthdate, setBirthdate] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const checkAvail = (v: string) => {
    const val = v.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 30);
    setAddress(val);
    if (val.length < 3) {
      setAvail(null);
      return;
    }
    setBusy(true);
    setTimeout(async () => {
      const res = await fetch(`/api/mail/address?a=${encodeURIComponent(val)}`);
      const data = (await res.json()) as { available?: boolean };
      setAvail(
        data.available
          ? { ok: true, msg: `${val.toLowerCase()}@ayeba.app — disponible` }
          : { ok: false, msg: "Déjà prise." },
      );
      setBusy(false);
    }, 350);
  };

  const sendCode = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/mail/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, phone, displayName, birthdate, recoveryEmail }),
      });
      const data = (await res.json()) as { ok?: boolean; sms?: boolean; devCode?: string; error?: string };
      if (!res.ok || data.error) return setErr(data.error || "Envoi impossible.");
      if (data.devCode) setDevCode(data.devCode);
      setStep(3);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/mail/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.error) return setErr(data.error || "Vérification échouée.");
      onDone();
    } finally {
      setBusy(false);
    }
  };

  const canStep1 = address.length >= 3 && avail?.ok === true;
  const canStep2 = displayName.trim().length >= 2 && birthdate && birthdate <= MAX_BIRTHDATE;

  return (
    <div className="mail-root">
      <div className="mail-gate">
        <div className="mail-gate-panel">
          <div className="mail-auth-logo">
            <AyebaMailLogo size={56} />
          </div>
          <div className="mail-steps">
            <i className={step >= 1 ? "done" : ""} />
            <i className={step >= 2 ? "done" : ""} />
            <i className={step >= 3 ? "done" : ""} />
          </div>
          <span className="mail-kicker">AYEBA MAIL — CRÉATION</span>

          {step === 1 && (
            <>
              <h2>Choisissez votre adresse</h2>
              <p className="sub">Votre adresse @ayeba.app vous identifie sur l'ensemble des services Ayeba.</p>
              {err && <div className="mail-err">{err}</div>}
              <div className="mail-field">
                <label>Votre adresse</label>
                <div className="addr-row">
                  <input
                    value={address}
                    onChange={(e) => checkAvail(e.target.value)}
                    placeholder="votre.adresse"
                    autoComplete="off"
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  <span className="suffix">@ayeba.app</span>
                </div>
                {avail && <p className={`mail-avail ${avail.ok ? "ok" : "ko"}`}>{avail.msg}</p>}
                {busy && <p className="mail-avail">Vérification…</p>}
              </div>
              <button className="mail-cta" disabled={!canStep1} onClick={() => setStep(2)}>
                Continuer
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Votre identité</h2>
              <p className="sub">Qui êtes-vous ? Ces infos protègent votre compte.</p>
              {err && <div className="mail-err">{err}</div>}
              <div className="mail-field">
                <label>Nom complet</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Prénom Nom"
                  autoFocus
                />
              </div>
              <div className="mail-field">
                <label>Date de naissance</label>
                <input
                  type="date"
                  value={birthdate}
                  max={MAX_BIRTHDATE}
                  onChange={(e) => setBirthdate(e.target.value)}
                />
              </div>
              <div className="mail-field">
                <label>Email de récupération (optionnel)</label>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="votre@email.com"
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="mail-cta" style={{ flex: 1 }} disabled={!canStep2} onClick={() => setStep(3)}>
                  Continuer
                </button>
                <button className="mail-btn" style={{ marginTop: 8 }} onClick={() => setStep(1)}>
                  ←
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2>Vérification</h2>
              <p className="sub">Un code SMS sécurise votre boîte — entrez-le pour activer.</p>
              {devCode && <div className="mail-dev-code">MODE DEV — code : {devCode}</div>}
              {err && <div className="mail-err">{err}</div>}
              <div className="mail-field">
                <label>Numéro de téléphone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+243 9XX XXX XXX"
                  inputMode="tel"
                />
              </div>
              {!devCode ? (
                <button className="mail-cta" disabled={busy || phone.length < 8} onClick={() => void sendCode()}>
                  {busy ? "Envoi…" : "Recevoir le code"}
                </button>
              ) : (
                <>
                  <div className="mail-field">
                    <label>Code reçu par SMS</label>
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      inputMode="numeric"
                      style={{ letterSpacing: "0.5em", fontFamily: "var(--font-mono), monospace", fontSize: 20, textAlign: "center" }}
                    />
                  </div>
                  <button className="mail-cta" disabled={busy || code.length !== 6} onClick={() => void verify()}>
                    {busy ? "Création…" : "Créer ma boîte"}
                  </button>
                </>
              )}
              <button className="mail-btn" style={{ marginTop: 14 }} onClick={() => setStep(2)}>
                ← Modifier
              </button>
            </>
          )}

          {onBack && (
            <button className="mail-btn link" style={{ marginTop: 14 }} onClick={onBack}>
              ← Retour
            </button>
          )}
          <p className="mail-auth-alt">
            Déjà un compte ? <a href="/mail/signin">Se connecter</a>
          </p>
        </div>
      </div>
    </div>
  );
}
