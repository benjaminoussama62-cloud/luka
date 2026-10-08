"use client";

/**
 * Ayeba Money — coquille légère, langage visuel ayeba.app.
 * Toute la sécurité vit côté serveur ; ici : affichage + saisie.
 * Le PIN n'est jamais conservé (state locale, effacée après envoi), jamais
 * stocké dans localStorage, jamais envoyé ailleurs qu'en POST JSON.
 * L'@adresse est OPTIONNELLE — on envoie à un email ou un téléphone.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type WalletInfo = {
  wallet: { handle: string | null; status: string; hasPin: boolean };
  balances: {
    USD: { minor: number; display: string };
    CDF: { minor: number; display: string };
  };
  providers: string[];
  integrityOk: boolean;
};

type Tx = {
  id: string;
  entryId: number;
  kind: "transfer" | "deposit" | "withdrawal" | "reversal";
  status: string;
  direction: "in" | "out";
  currency: "USD" | "CDF";
  amount: string;
  provider: string | null;
  createdAt: string;
};

type Panel = "send" | "deposit" | "withdraw" | null;

const TX_LABEL: Record<Tx["kind"], string> = {
  transfer: "Transfert",
  deposit: "Dépôt",
  withdrawal: "Retrait",
  reversal: "Recrédit",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "en cours",
  completed: "confirmé",
  failed: "échoué",
  reversed: "remboursé",
};

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!res.ok) {
    const err = new Error(data.error || `Erreur ${res.status}`) as Error & { code?: string };
    err.code = data.code;
    throw err;
  }
  return data;
}

export function MoneyApp() {
  const [info, setInfo] = useState<WalletInfo | null>(null);
  const [auth, setAuth] = useState<"loading" | "anon" | "ok">("loading");
  const [txs, setTxs] = useState<Tx[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const w = (await api("/api/money/wallet")) as WalletInfo;
      setInfo(w);
      setAuth("ok");
      const t = (await api("/api/money/transactions")) as { transactions: Tx[] };
      setTxs(t.transactions);
    } catch (e) {
      if ((e as Error).message === "Connexion requise") {
        setAuth("anon");
      } else {
        notify((e as Error).message);
        setAuth("ok");
      }
    }
  }, [notify]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  if (auth === "loading") {
    return (
      <main className="mn-root">
        <div className="mn-center">
          <span className="mn-kicker">Ayeba Money</span>
        </div>
      </main>
    );
  }
  if (auth === "anon") {
    return (
      <main className="mn-root">
        <div className="mn-landing">
          <div className="mn-center">
            <span className="mn-kicker">Portefeuille — écosystème Ayeba</span>
            <h1 className="mn-title">AYEBA MONEY</h1>
            <p className="mn-sub">
              Un portefeuille à part, dans votre compte Ayeba. Soldes USD &amp; CDF, transferts
              internes instantanés et gratuits, dépôts et retraits Mobile Money.
            </p>
            <div className="mn-features">
              <div>
                <b>Instantané</b>
                <small>Envoyez à un email ou un téléphone Ayeba — zéro frais, zéro attente.</small>
              </div>
              <div>
                <b>Blindé</b>
                <small>PIN exigé à chaque mouvement, journal comptable immuable, audit complet.</small>
              </div>
              <div>
                <b>Mobile Money</b>
                <small>Dépôt et retrait vers votre compte — recrédité automatiquement si échec.</small>
              </div>
            </div>
            <a className="mn-btn-primary" href="/compte?next=/money">
              Se connecter avec Ayeba
            </a>
            <small className="mn-landing-note">Un compte Ayeba suffit — le PIN est créé au premier accès.</small>
          </div>
          <LegalFooter />
        </div>
      </main>
    );
  }

  const hasPin = info?.wallet.hasPin ?? false;
  const frozen = info?.wallet.status === "frozen";

  return (
    <main className="mn-root">
      <header className="mn-topbar">
        <div className="mn-brand">
          <strong>AYEBA</strong>
          <span className="mn-kicker">Money</span>
        </div>
        <div className="mn-topbar-right">
          {info?.wallet.handle && <span className="mn-addr">{info.wallet.handle}</span>}
          <button
            type="button"
            className="mn-icon-btn"
            title="Paramètres"
            aria-label="Paramètres"
            onClick={() => setSettingsOpen((v) => !v)}
          >
            <IconGear />
          </button>
        </div>
      </header>

      <div className="mn-body">
        {!hasPin ? (
          <PinSetup
            onDone={() => {
              notify("Code PIN activé — vos mouvements sont protégés");
              void refresh();
            }}
          />
        ) : (
          <>
            {frozen && (
              <div className="mn-banner-bad">
                Portefeuille gelé — aucun mouvement possible. Contactez le support.
              </div>
            )}

            <section className="mn-hero">
              <span className="mn-kicker">Vos soldes</span>
              <div className="mn-balances">
                <div className="mn-bal">
                  <span className="mn-bal-cur">USD — Dollars</span>
                  <b>
                    {info?.balances.USD.display ?? "…"}
                    <em>$</em>
                  </b>
                </div>
                <div className="mn-bal">
                  <span className="mn-bal-cur">CDF — Francs congolais</span>
                  <b>
                    {info?.balances.CDF.display ?? "…"}
                    <em>FC</em>
                  </b>
                </div>
              </div>
            </section>

            <nav className="mn-actions">
              <button type="button" className="mn-act mn-act-primary" onClick={() => setPanel("send")} disabled={frozen}>
                <IconSend /> Envoyer
              </button>
              <button type="button" className="mn-act" onClick={() => setPanel("deposit")} disabled={frozen}>
                <IconPlus /> Déposer
              </button>
              <button type="button" className="mn-act" onClick={() => setPanel("withdraw")} disabled={frozen}>
                <IconDown /> Retirer
              </button>
            </nav>

            {settingsOpen && (
              <section className="mn-settings">
                <span className="mn-kicker">Paramètres</span>
                <div className="mn-settings-row">
                  <div>
                    <b>Adresse de réception</b>
                    <small>
                      Optionnel — un @pseudo facilite les envois vers vous. Sans adresse,
                      on peut déjà vous envoyer via votre email.
                    </small>
                  </div>
                  {info?.wallet.handle ? (
                    <span className="mn-addr">{info.wallet.handle}</span>
                  ) : (
                    <HandleClaim onDone={(h) => { notify(`Adresse ${h} activée`); void refresh(); }} />
                  )}
                </div>
                <PinChange onDone={() => notify("Code PIN modifié")} />
              </section>
            )}

            <section className="mn-history">
              <span className="mn-kicker">Activité</span>
              {txs.length === 0 && <p className="mn-empty">Aucun mouvement pour l&rsquo;instant.</p>}
              <ul>
                {txs.map((t) => (
                  <li key={t.entryId} className={`mn-tx mn-tx-${t.status}`}>
                    <span className={`mn-tx-dir ${t.direction}`}>
                      {t.direction === "in" ? <IconIn /> : <IconOut />}
                    </span>
                    <span className="mn-tx-main">
                      <b>{TX_LABEL[t.kind]}</b>
                      <small>
                        {new Date(t.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        {" · "}
                        {STATUS_LABEL[t.status] ?? t.status}
                      </small>
                    </span>
                    <span className={`mn-tx-amt ${t.direction}`}>
                      {t.direction === "in" ? "+" : "−"}
                      {t.amount} <i>{t.currency === "USD" ? "$" : "FC"}</i>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        <LegalFooter />
      </div>

      {panel && (
        <MovePanel
          kind={panel}
          providers={info?.providers ?? []}
          onClose={(done, msg) => {
            setPanel(null);
            if (done) {
              notify(msg || "Opération envoyée");
              void refresh();
            }
          }}
        />
      )}

      {toast && <div className="mn-toast">{toast}</div>}
      {info && !info.integrityOk && (
        <div className="mn-banner-bad mn-banner-fixed">
          Anomalie de cohérence détectée — nos équipes ont été notifiées.
        </div>
      )}
    </main>
  );
}

/* ── Icônes (traits fins, façon rail Ayeba) ──────────────────────── */

function IconSend() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconDown() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14m0 0 6-6m-6 6-6-6" />
    </svg>
  );
}
function IconIn() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5m0 0-6 6m6-6 6 6" />
    </svg>
  );
}
function IconOut() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14m0 0 6-6m-6 6-6-6" />
    </svg>
  );
}
function IconGear() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

/* ── Sous-composants ─────────────────────────────────────────────── */

function LegalFooter() {
  return (
    <footer className="mn-legal">
      <Link href="/privacy/money">Confidentialité</Link>
      <Link href="/money/conditions">Conditions</Link>
      <Link href="/money/suppression">Suppression</Link>
      <Link href="/support">Support</Link>
      <span className="mn-legal-tag">Produit distinct — écosystème Ayeba</span>
    </footer>
  );
}

function PinInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <input
      className="mn-pin"
      type="password"
      inputMode="numeric"
      autoComplete="off"
      maxLength={4}
      placeholder="••••"
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
      aria-label="Code PIN à 4 chiffres"
    />
  );
}

function PinSetup({ onDone }: { onDone: () => void }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (pin.length !== 4) return setError("4 chiffres requis");
    if (pin !== confirm) return setError("Les deux codes ne correspondent pas");
    setBusy(true);
    setError("");
    try {
      await api("/api/money/pin", { method: "POST", body: JSON.stringify({ pin }) });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setPin("");
      setConfirm("");
    }
  }

  return (
    <section className="mn-pinsetup">
      <span className="mn-kicker">Sécurité</span>
      <h2>Créez votre code PIN</h2>
      <p>
        4 chiffres, exigés pour <b>chaque</b> envoi ou retrait. Même si votre session est
        volée, votre argent ne bouge pas sans ce code.
      </p>
      <label>
        Code PIN
        <PinInput value={pin} onChange={setPin} autoFocus />
      </label>
      <label>
        Confirmez
        <PinInput value={confirm} onChange={setConfirm} />
      </label>
      {error && <p className="mn-error">{error}</p>}
      <button className="mn-btn-primary" disabled={busy || pin.length !== 4 || confirm.length !== 4} onClick={() => void submit()}>
        {busy ? "Activation…" : "Activer le PIN"}
      </button>
    </section>
  );
}

function PinChange({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (next.length !== 4) return setError("4 chiffres requis");
    setBusy(true);
    setError("");
    try {
      await api("/api/money/pin", { method: "POST", body: JSON.stringify({ pin: next, currentPin: current }) });
      setOpen(false);
      setCurrent("");
      setNext("");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="mn-settings-row">
        <div>
          <b>Code PIN</b>
          <small>Modifier le code exigé à chaque mouvement.</small>
        </div>
        <button type="button" className="mn-btn" onClick={() => setOpen(true)}>Changer</button>
      </div>
    );
  }
  return (
    <div className="mn-settings-row mn-pinchange">
      <div>
        <b>Nouveau code PIN</b>
        <small>Le code actuel est requis pour le changer.</small>
      </div>
      <div className="mn-pinchange-fields">
        <PinInput value={current} onChange={setCurrent} />
        <PinInput value={next} onChange={setNext} />
        {error && <small className="mn-error">{error}</small>}
        <span>
          <button type="button" className="mn-btn" onClick={() => setOpen(false)}>Annuler</button>
          <button type="button" className="mn-btn-primary" disabled={busy || current.length !== 4 || next.length !== 4} onClick={() => void submit()}>
            {busy ? "…" : "Valider"}
          </button>
        </span>
      </div>
    </div>
  );
}

function HandleClaim({ onDone }: { onDone: (h: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const r = (await api("/api/money/handle", { method: "POST", body: JSON.stringify({ handle: value }) })) as { handle: string };
      onDone(r.handle);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="mn-btn" onClick={() => setOpen(true)}>
        Choisir un @pseudo
      </button>
    );
  }
  return (
    <span className="mn-claim">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="pseudo"
        maxLength={20}
        autoFocus
        onKeyDown={(e) => e.key === "Enter" && void submit()}
      />
      <button type="button" className="mn-btn-primary" onClick={() => void submit()} disabled={busy}>OK</button>
      {error && <small className="mn-error">{error}</small>}
    </span>
  );
}

function MovePanel({
  kind,
  providers,
  onClose,
}: {
  kind: Exclude<Panel, null>;
  providers: string[];
  onClose: (done: boolean, msg?: string) => void;
}) {
  const [to, setTo] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "CDF">("USD");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const idemKey = useRef(crypto.randomUUID());
  const noProvider = providers.length === 0 && kind !== "send";

  const title = kind === "send" ? "Envoyer de l'argent" : kind === "deposit" ? "Déposer de l'argent" : "Retirer de l'argent";

  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (kind === "send") {
        const r = (await api("/api/money/transfer", {
          method: "POST",
          headers: { "Idempotency-Key": idemKey.current },
          body: JSON.stringify({ to, amount, currency, pin }),
        })) as { transaction: { status: string } };
        onClose(true, r.transaction.status === "completed" ? "Envoyé instantanément" : "Transfert en cours");
      } else if (kind === "deposit") {
        const r = (await api("/api/money/deposit", {
          method: "POST",
          headers: { "Idempotency-Key": idemKey.current },
          body: JSON.stringify({ amount, currency, phone }),
        })) as { transaction: { checkoutUrl?: string | null } };
        const url = r.transaction.checkoutUrl;
        onClose(true, url ? "Validez le paiement sur la page du partenaire" : "Validez le dépôt sur votre téléphone");
        if (url) window.open(url, "_blank", "noopener");
      } else {
        await api("/api/money/withdraw", {
          method: "POST",
          headers: { "Idempotency-Key": idemKey.current },
          body: JSON.stringify({ amount, currency, phone, pin }),
        });
        onClose(true, "Retrait en cours — vous serez notifié à la confirmation");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setPin("");
    }
  }

  return (
    <div className="mn-overlay" onClick={() => onClose(false)}>
      <section className="mn-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="mn-sheet-head">
          <span className="mn-kicker">{title}</span>
          <button type="button" className="mn-icon-btn" aria-label="Fermer" onClick={() => onClose(false)}>✕</button>
        </div>
        {kind === "send" && (
          <label>
            Destinataire — email, téléphone ou @pseudo
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="nom@ayeba.app ou +243 …" autoFocus />
          </label>
        )}
        {kind !== "send" && (
          <label>
            Téléphone Mobile Money
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243 …" inputMode="tel" autoFocus />
          </label>
        )}
        <div className="mn-row">
          <label className="mn-grow">
            Montant
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal" />
          </label>
          <label>
            Devise
            <select value={currency} onChange={(e) => setCurrency(e.target.value as "USD" | "CDF")}>
              <option value="USD">USD</option>
              <option value="CDF">CDF</option>
            </select>
          </label>
        </div>
        {kind !== "deposit" && (
          <label>
            Code PIN
            <PinInput value={pin} onChange={setPin} />
          </label>
        )}
        {kind === "send" && <small className="mn-note">Instantané et gratuit entre comptes Ayeba.</small>}
        {kind === "deposit" && (
          <small className="mn-note">
            {noProvider
              ? "Les dépôts arrivent bientôt — le partenaire de paiement est en cours de branchement."
              : "Validez sur votre téléphone ; votre solde est crédité dès confirmation sécurisée."}
          </small>
        )}
        {kind === "withdraw" && (
          <small className="mn-note">
            {noProvider
              ? "Les retraits arrivent bientôt — le partenaire de paiement est en cours de branchement."
              : "Le montant est envoyé sur votre Mobile Money ; en cas d'échec il est recrédité automatiquement."}
          </small>
        )}
        {error && <p className="mn-error">{error}</p>}
        <div className="mn-sheet-actions">
          <button type="button" className="mn-btn" onClick={() => onClose(false)}>Annuler</button>
          <button
            type="button"
            className="mn-btn-primary"
            disabled={busy || noProvider || !amount || (kind === "send" && (!to || pin.length !== 4)) || (kind !== "send" && !phone) || (kind === "withdraw" && pin.length !== 4)}
            onClick={() => void submit()}
          >
            {busy ? "Traitement…" : "Confirmer"}
          </button>
        </div>
      </section>
    </div>
  );
}
