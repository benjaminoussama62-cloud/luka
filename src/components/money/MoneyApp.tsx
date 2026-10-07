"use client";

/**
 * Ayeba Money — coquille légère.
 * Toute la sécurité vit côté serveur ; ici : affichage + saisie.
 * Le PIN n'est jamais conservé (state locale, effacée après envoi), jamais
 * stocké dans localStorage, jamais envoyé ailleurs qu'en POST JSON.
 */
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
      <main className="mn-shell">
        <div className="mn-center">Chargement…</div>
      </main>
    );
  }
  if (auth === "anon") {
    return (
      <main className="mn-shell">
        <div className="mn-center mn-card mn-login">
          <MoneyLogo />
          <h1>Ayeba Money</h1>
          <p>Votre portefeuille USD &amp; CDF — transferts internes instantanés et gratuits.</p>
          <a className="mn-btn mn-btn-primary" href="/compte?next=/money">
            Se connecter avec Ayeba
          </a>
        </div>
      </main>
    );
  }

  const hasPin = info?.wallet.hasPin ?? false;

  return (
    <main className="mn-shell">
      <header className="mn-top">
        <div className="mn-brand">
          <MoneyLogo small />
          <span>Ayeba Money</span>
        </div>
        <div className="mn-handle">
          {info?.wallet.handle ? (
            <span className="mn-chip">{info.wallet.handle}</span>
          ) : (
            <HandleClaim onDone={(h) => { notify(`Adresse ${h} activée`); void refresh(); }} />
          )}
        </div>
      </header>

      {!hasPin ? (
        <PinSetup
          onDone={() => {
            notify("Code PIN activé — vos mouvements sont protégés");
            void refresh();
          }}
        />
      ) : (
        <>
          <section className="mn-balances">
            <BalanceCard currency="USD" display={info?.balances.USD.display ?? "…"} />
            <BalanceCard currency="CDF" display={info?.balances.CDF.display ?? "…"} />
          </section>

          <nav className="mn-actions">
            <ActionBtn label="Envoyer" icon={<IconSend />} onClick={() => setPanel("send")} />
            <ActionBtn label="Déposer" icon={<IconPlus />} onClick={() => setPanel("deposit")} />
            <ActionBtn label="Retirer" icon={<IconDown />} onClick={() => setPanel("withdraw")} />
          </nav>

          <section className="mn-history">
            <h2>Activité</h2>
            {txs.length === 0 && <p className="mn-empty">Aucun mouvement pour l’instant.</p>}
            <ul>
              {txs.map((t) => (
                <li key={t.entryId} className={`mn-tx mn-tx-${t.status}`}>
                  <span className={`mn-tx-ico ${t.direction}`}>{t.direction === "in" ? "↓" : "↑"}</span>
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
                    {t.amount} {t.currency === "USD" ? "$" : "FC"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

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
        <div className="mn-warn">Anomalie de cohérence détectée — nos équipes ont été notifiées.</div>
      )}
    </main>
  );
}

/* ── Sous-composants ─────────────────────────────────────────────── */

function MoneyLogo({ small }: { small?: boolean }) {
  return (
    <svg width={small ? 22 : 44} height={small ? 22 : 44} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="3" y="10" width="42" height="30" rx="7" stroke="currentColor" strokeWidth="3" />
      <path d="M3 19h42" stroke="currentColor" strokeWidth="3" />
      <circle cx="35" cy="30" r="3.4" fill="currentColor" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconDown() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14m0 0 6-6m-6 6-6-6" />
    </svg>
  );
}

function BalanceCard({ currency, display }: { currency: "USD" | "CDF"; display: string }) {
  return (
    <div className={`mn-card mn-bal mn-bal-${currency.toLowerCase()}`}>
      <small>{currency === "USD" ? "Dollars" : "Francs congolais"}</small>
      <b>
        {display} <em>{currency === "USD" ? "$" : "FC"}</em>
      </b>
    </div>
  );
}

function ActionBtn({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="mn-action" onClick={onClick}>
      <span className="mn-action-ico">{icon}</span>
      {label}
    </button>
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
    <section className="mn-card mn-pinsetup">
      <h2>Créez votre code PIN</h2>
      <p>
        4 chiffres, exigés pour <b>chaque</b> envoi ou retrait. Même si votre session est volée,
        votre argent ne bouge pas sans ce code.
      </p>
      <label>Code PIN</label>
      <PinInput value={pin} onChange={setPin} autoFocus />
      <label>Confirmez</label>
      <PinInput value={confirm} onChange={setConfirm} />
      {error && <p className="mn-error">{error}</p>}
      <button className="mn-btn mn-btn-primary" disabled={busy || pin.length !== 4 || confirm.length !== 4} onClick={() => void submit()}>
        {busy ? "Activation…" : "Activer le PIN"}
      </button>
    </section>
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
      <button type="button" className="mn-chip mn-chip-btn" onClick={() => setOpen(true)}>
        + Créer mon @adresse
      </button>
    );
  }
  return (
    <span className="mn-handle-claim">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="pseudo"
        maxLength={20}
        autoFocus
        onKeyDown={(e) => e.key === "Enter" && void submit()}
      />
      <button type="button" onClick={() => void submit()} disabled={busy}>OK</button>
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
        <h2>{title}</h2>
        {kind === "send" && (
          <label>
            Destinataire (@adresse, email ou téléphone)
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="@pseudo" autoFocus />
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
            className="mn-btn mn-btn-primary"
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
