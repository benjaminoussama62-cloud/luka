"use client";

import { useState } from "react";
import {
  generateVault,
  passphraseError,
  rewrapPassphrase,
  rewrapRecovery,
  signNonce,
  unlockVault,
  type PassWrap,
  type VaultSession,
} from "@/lib/mail/e2ee";

export type VaultInfo = {
  ecdhPublic: string;
  ecdsaPublic: string;
  privWrap: PassWrap;
  recoveryWrap: PassWrap;
  fingerprint: string;
};

async function prove(session: VaultSession): Promise<{ nonce: string; signature: string } | { error: string }> {
  const res = await fetch("/api/mail/vault/challenge", { method: "POST" });
  const data = (await res.json()) as { nonce?: string; error?: string };
  if (!res.ok || !data.nonce) return { error: data.error || "Défi impossible." };
  return { nonce: data.nonce, signature: await signNonce(session, data.nonce) };
}

export function VaultCreate({ onReady }: { onReady: (session: VaultSession) => void }) {
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [recovery, setRecovery] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState<{ session: VaultSession; privWrap: PassWrap; recoveryWrap: PassWrap } | null>(null);

  const create = async () => {
    setErr("");
    const problem = passphraseError(pass);
    if (problem) return setErr(problem);
    if (pass !== confirm) return setErr("Les deux phrases ne correspondent pas.");
    setBusy("Dérivation de la clé — quelques secondes…");
    try {
      const vault = await generateVault(pass);
      setPending({ session: vault.session, privWrap: vault.privWrap, recoveryWrap: vault.recoveryWrap });
      setRecovery(vault.recoveryKey);
      setPass("");
      setConfirm("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setBusy("");
    }
  };

  const commit = async () => {
    if (!pending || !saved) return;
    setBusy("Enregistrement du coffre…");
    setErr("");
    try {
      const res = await fetch("/api/mail/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ecdhPublic: pending.session.ecdhPublic,
          ecdsaPublic: pending.session.ecdsaPublic,
          privWrap: pending.privWrap,
          recoveryWrap: pending.recoveryWrap,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErr(data.error || "Enregistrement impossible.");
        return;
      }
      onReady(pending.session);
    } catch {
      setErr("Réseau indisponible.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mail-root">
      <div className="mail-gate">
        <div className="mail-gate-panel" style={{ width: "min(480px, 100%)" }}>
          <span className="mail-kicker">COFFRE DE BOUT EN BOUT</span>
          {!recovery ? (
            <>
              <h2>Protégez la boîte</h2>
              <p className="sub">
                Cette phrase ne part jamais vers Ayeba. Elle déverrouille vos messages
                sur cet appareil. Si vous l’oubliez, seule la clé de récupération
                pourra ouvrir le coffre — nous ne pouvons pas la réinitialiser.
              </p>
              {err && <div className="mail-err">{err}</div>}
              <div className="mail-field">
                <label>Phrase secrète</label>
                <input
                  type="password"
                  value={pass}
                  autoComplete="new-password"
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="Une phrase d’au moins 12 caractères"
                />
              </div>
              <div className="mail-field">
                <label>Confirmation</label>
                <input
                  type="password"
                  value={confirm}
                  autoComplete="new-password"
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <button className="mail-cta" disabled={!!busy || pass.length < 12} onClick={() => void create()}>
                {busy || "Créer le coffre"}
              </button>
            </>
          ) : (
            <>
              <h2>Notez la clé de récupération</h2>
              <p className="sub">
                Elle s’affiche une seule fois. Gardez-la hors de cet appareil.
                Sans elle et sans la phrase, les messages déjà chiffrés sont illisibles.
              </p>
              <pre className="mail-recovery">{recovery}</pre>
              <label className="mail-check">
                <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
                <span>Je l’ai notée hors de cet appareil.</span>
              </label>
              {err && <div className="mail-err">{err}</div>}
              <button className="mail-cta" disabled={!saved || !!busy} onClick={() => void commit()}>
                {busy || "Entrer dans la boîte"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function VaultUnlock({ vault, onReady }: { vault: VaultInfo; onReady: (session: VaultSession) => void }) {
  const [mode, setMode] = useState<"passphrase" | "recovery">("passphrase");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [session, setSession] = useState<VaultSession | null>(null);
  const [nextPass, setNextPass] = useState("");
  const [nextConfirm, setNextConfirm] = useState("");

  const open = async () => {
    setErr("");
    setBusy(mode === "passphrase" ? "Vérification de la phrase…" : "Vérification de la clé…");
    try {
      const opened = await unlockVault(
        secret,
        mode === "passphrase" ? vault.privWrap : vault.recoveryWrap,
        vault.ecdhPublic,
        vault.ecdsaPublic,
        mode,
      );
      setSecret("");
      if (mode === "recovery") setSession(opened);
      else onReady(opened);
    } catch {
      setErr(mode === "passphrase" ? "Phrase secrète incorrecte." : "Clé de récupération incorrecte.");
    } finally {
      setBusy("");
    }
  };

  const replace = async () => {
    if (!session) return;
    const problem = passphraseError(nextPass);
    if (problem) return setErr(problem);
    if (nextPass !== nextConfirm) return setErr("Les deux phrases ne correspondent pas.");
    setBusy("Nouvelle phrase…");
    setErr("");
    try {
      const privWrap = await rewrapPassphrase(session, nextPass);
      const proof = await prove(session);
      if ("error" in proof) return setErr(proof.error);
      const res = await fetch("/api/mail/vault/rewrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...proof, privWrap }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) return setErr(data.error || "Mise à jour impossible.");
      onReady(session);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Mise à jour impossible.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mail-root">
      <div className="mail-gate">
        <div className="mail-gate-panel">
          <span className="mail-kicker">COFFRE VERROUILLÉ</span>
          {session ? (
            <>
              <h2>Nouvelle phrase secrète</h2>
              <p className="sub">
                La clé de récupération a ouvert le coffre. Choisissez une nouvelle phrase.
                L’ancienne ne fonctionnera plus.
              </p>
              {err && <div className="mail-err">{err}</div>}
              <div className="mail-field">
                <label>Nouvelle phrase</label>
                <input type="password" value={nextPass} autoComplete="new-password" onChange={(e) => setNextPass(e.target.value)} />
              </div>
              <div className="mail-field">
                <label>Confirmation</label>
                <input type="password" value={nextConfirm} autoComplete="new-password" onChange={(e) => setNextConfirm(e.target.value)} />
              </div>
              <button className="mail-cta" disabled={!!busy} onClick={() => void replace()}>
                {busy || "Enregistrer"}
              </button>
            </>
          ) : (
            <>
              <h2>Déverrouiller</h2>
              <p className="sub">
                Empreinte du coffre
                <br />
                <b className="mail-fp">{vault.fingerprint}</b>
              </p>
              <div className="mail-switch">
                <button className={mode === "passphrase" ? "on" : ""} onClick={() => { setMode("passphrase"); setErr(""); }}>
                  Phrase
                </button>
                <button className={mode === "recovery" ? "on" : ""} onClick={() => { setMode("recovery"); setErr(""); }}>
                  Clé de récupération
                </button>
              </div>
              {err && <div className="mail-err">{err}</div>}
              <div className="mail-field">
                <label>{mode === "passphrase" ? "Phrase secrète" : "Clé de récupération"}</label>
                <input
                  type={mode === "passphrase" ? "password" : "text"}
                  value={secret}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setSecret(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void open(); }}
                />
              </div>
              <button className="mail-cta" disabled={!!busy || secret.length < 8} onClick={() => void open()}>
                {busy || "Ouvrir"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SecurityPane({
  session,
  onLock,
  onToast,
}: {
  session: VaultSession;
  onLock: () => void;
  onToast: (m: string) => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [freshRecovery, setFreshRecovery] = useState("");

  const changePass = async () => {
    const problem = passphraseError(next);
    if (problem) return onToast(problem);
    if (next !== confirm) return onToast("Les deux phrases ne correspondent pas.");
    setBusy(true);
    try {
      const loaded = (await (await fetch("/api/mail/vault")).json()) as { vault?: VaultInfo };
      if (!loaded.vault) return onToast("Coffre introuvable.");
      await unlockVault(current, loaded.vault.privWrap, session.ecdhPublic, session.ecdsaPublic, "passphrase");
      const privWrap = await rewrapPassphrase(session, next);
      const proof = await prove(session);
      if ("error" in proof) return onToast(proof.error);
      const res = await fetch("/api/mail/vault/rewrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...proof, privWrap }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok || !data.ok) return onToast(data.error || "Changement refusé.");
      setCurrent("");
      setNext("");
      setConfirm("");
      onToast("Phrase secrète mise à jour.");
    } catch {
      onToast("Phrase actuelle incorrecte.");
    } finally {
      setBusy(false);
    }
  };

  const renewRecovery = async () => {
    if (!window.confirm("L’ancienne clé de récupération cessera de fonctionner. Continuer ?")) return;
    setBusy(true);
    try {
      const { recoveryKey, recoveryWrap } = await rewrapRecovery(session);
      const proof = await prove(session);
      if ("error" in proof) return onToast(proof.error);
      const res = await fetch("/api/mail/vault/rewrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...proof, recoveryWrap }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok || !data.ok) return onToast(data.error || "Renouvellement refusé.");
      setFreshRecovery(recoveryKey);
    } catch {
      onToast("Renouvellement impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="mail-sec-lead">
        Entre adresses @ayeba.app, Ayeba stocke le chiffré. Nous voyons les adresses,
        la date et la taille — pas le texte, ni le nom des pièces jointes.
        Un mail vers Gmail ou Outlook quitte le coffre : le destinataire doit pouvoir le lire.
        La traduction envoie le texte déchiffré au service de langue, seulement si vous le demandez.
      </p>
      <label className="mail-settings-label">Empreinte</label>
      <p className="mail-fp">{session.fingerprint}</p>

      <label className="mail-settings-label">Changer la phrase</label>
      <input className="mail-settings-input" type="password" placeholder="Phrase actuelle" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
      <input className="mail-settings-input" style={{ marginTop: 8 }} type="password" placeholder="Nouvelle phrase" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
      <input className="mail-settings-input" style={{ marginTop: 8 }} type="password" placeholder="Confirmer" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      <button className="mail-btn" style={{ marginTop: 10 }} disabled={busy} onClick={() => void changePass()}>
        Mettre à jour la phrase
      </button>

      <label className="mail-settings-label">Clé de récupération</label>
      {freshRecovery ? (
        <pre className="mail-recovery">{freshRecovery}</pre>
      ) : (
        <p className="mail-sec-lead">L’ancienne clé a été montrée une seule fois. En générer une nouvelle l’invalide.</p>
      )}
      <button className="mail-btn" disabled={busy} onClick={() => void renewRecovery()}>
        Générer une nouvelle clé
      </button>

      <div className="mail-settings-foot">
        <button className="mail-btn danger" onClick={onLock}>Verrouiller le coffre</button>
      </div>
    </div>
  );
}
