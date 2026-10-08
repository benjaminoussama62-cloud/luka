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

type MoneyCurrency = "USD" | "CDF";

type WalletInfo = {
  user: { name: string; email: string };
  wallet: { handle: string | null; status: string; hasPin: boolean; memberSince: string };
  balances: Record<MoneyCurrency, { minor: number; display: string }>;
  month: Record<MoneyCurrency, { in: number; out: number; inDisplay: string; outDisplay: string }>;
  providers: string[];
  integrityOk: boolean;
};

type Tx = {
  id: string;
  entryId: number;
  kind: "transfer" | "deposit" | "withdrawal" | "reversal";
  status: string;
  direction: "in" | "out";
  currency: MoneyCurrency;
  amount: string;
  provider: string | null;
  reference: string;
  counterparty: string | null;
  phone: string | null;
  failReason: string | null;
  reversalReason: string | null;
  createdAt: string;
  completedAt: string | null;
};

type Panel = "send" | "receive" | "deposit" | "withdraw" | null;
type TxFilter = "all" | "in" | "out" | "deposit" | "withdrawal";

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

const FILTERS: Array<{ id: TxFilter; label: string }> = [
  { id: "all", label: "Tout" },
  { id: "in", label: "Reçus" },
  { id: "out", label: "Envoyés" },
  { id: "deposit", label: "Dépôts" },
  { id: "withdrawal", label: "Retraits" },
];

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

function matchFilter(t: Tx, f: TxFilter): boolean {
  if (f === "all") return true;
  if (f === "in" || f === "out") return t.direction === f;
  return t.kind === f;
}

export function MoneyApp() {
  const [info, setInfo] = useState<WalletInfo | null>(null);
  const [auth, setAuth] = useState<"loading" | "anon" | "ok">("loading");
  const [txs, setTxs] = useState<Tx[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<TxFilter>("all");
  const [panel, setPanel] = useState<Panel>(null);
  const [sendPrefill, setSendPrefill] = useState("");
  const [txDetail, setTxDetail] = useState<Tx | null>(null);
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
      const t = (await api("/api/money/transactions")) as { transactions: Tx[]; nextCursor: number | null };
      setTxs(t.transactions);
      setNextCursor(t.nextCursor);
    } catch (e) {
      if ((e as Error).message === "Connexion requise") {
        setAuth("anon");
      } else {
        notify((e as Error).message);
        setAuth("ok");
      }
    }
  }, [notify]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const t = (await api(`/api/money/transactions?cursor=${nextCursor}`)) as {
        transactions: Tx[];
        nextCursor: number | null;
      };
      setTxs((prev) => [...prev, ...t.transactions]);
      setNextCursor(t.nextCursor);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, notify]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    // Lien de paiement (?to=…) — pré-remplit le panneau d'envoi.
    const to = new URLSearchParams(window.location.search).get("to");
    if (to) {
      setSendPrefill(to);
      setPanel("send");
    }
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
  const visibleTxs = txs.filter((t) => matchFilter(t, filter));
  const hasMonth = info && (info.month.USD.in + info.month.USD.out + info.month.CDF.in + info.month.CDF.out) > 0;

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
            onClick={() => setSettingsOpen(true)}
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
              {hasMonth && info && (
                <div className="mn-month">
                  <span>Ce mois</span>
                  {(["USD", "CDF"] as const).map(
                    (c) =>
                      (info.month[c].in > 0 || info.month[c].out > 0) && (
                        <small key={c}>
                          <i className="in">+{info.month[c].inDisplay}</i> reçus ·{" "}
                          <i className="out">−{info.month[c].outDisplay}</i> envoyés{" "}
                          {c === "USD" ? "$" : "FC"}
                        </small>
                      ),
                  )}
                </div>
              )}
            </section>

            <nav className="mn-actions">
              <button type="button" className="mn-act mn-act-primary" onClick={() => setPanel("send")} disabled={frozen}>
                <IconSend /> Envoyer
              </button>
              <button type="button" className="mn-act" onClick={() => setPanel("receive")} disabled={frozen}>
                <IconQr /> Recevoir
              </button>
              <button type="button" className="mn-act" onClick={() => setPanel("deposit")} disabled={frozen}>
                <IconPlus /> Déposer
              </button>
              <button type="button" className="mn-act" onClick={() => setPanel("withdraw")} disabled={frozen}>
                <IconDown /> Retirer
              </button>
            </nav>

            <section className="mn-history">
              <div className="mn-history-head">
                <span className="mn-kicker">Activité</span>
                <div className="mn-history-tools">
                  <a className="mn-btn mn-btn-mini" href="/api/money/statement" download>
                    <IconFile /> Relevé CSV
                  </a>
                </div>
              </div>
              {txs.length > 0 && (
                <div className="mn-filters" role="tablist">
                  {FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`mn-chip${filter === f.id ? " on" : ""}`}
                      onClick={() => setFilter(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
              {visibleTxs.length === 0 && (
                <p className="mn-empty">
                  {txs.length === 0 ? "Aucun mouvement pour l’instant." : "Rien dans ce filtre."}
                </p>
              )}
              <ul>
                {visibleTxs.map((t) => (
                  <li key={t.entryId}>
                    <button type="button" className={`mn-tx mn-tx-${t.status}`} onClick={() => setTxDetail(t)}>
                      <span className={`mn-tx-dir ${t.direction}`}>
                        {t.direction === "in" ? <IconIn /> : <IconOut />}
                      </span>
                      <span className="mn-tx-main">
                        <b>{TX_LABEL[t.kind]}</b>
                        <small>
                          {t.counterparty || t.provider || (t.kind === "reversal" ? "Remboursement" : "")}
                          {t.counterparty || t.provider || t.kind === "reversal" ? " · " : ""}
                          {new Date(t.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                          {" · "}
                          {STATUS_LABEL[t.status] ?? t.status}
                        </small>
                      </span>
                      <span className={`mn-tx-amt ${t.direction}`}>
                        {t.direction === "in" ? "+" : "−"}
                        {t.amount} <i>{t.currency === "USD" ? "$" : "FC"}</i>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {nextCursor && (
                <button type="button" className="mn-btn mn-more" onClick={() => void loadMore()} disabled={loadingMore}>
                  {loadingMore ? "Chargement…" : "Charger plus"}
                </button>
              )}
            </section>
          </>
        )}

        <LegalFooter />
      </div>

      {panel === "receive" && info && (
        <ReceiveSheet info={info} onClose={() => setPanel(null)} onCopy={() => notify("Copié dans le presse-papiers")} />
      )}
      {panel && panel !== "receive" && (
        <MovePanel
          kind={panel}
          providers={info?.providers ?? []}
          prefillTo={sendPrefill}
          onClose={(done, msg) => {
            setPanel(null);
            setSendPrefill("");
            if (done) {
              notify(msg || "Opération envoyée");
              void refresh();
            }
          }}
        />
      )}
      {txDetail && <TxDetailSheet tx={txDetail} onClose={() => setTxDetail(null)} />}
      {settingsOpen && info && (
        <SettingsSheet
          info={info}
          onClose={() => setSettingsOpen(false)}
          onChanged={(msg) => {
            if (msg) notify(msg);
            void refresh();
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
function IconQr() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14h1M14 20h1M18 18h3v3h-3z" />
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
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
function IconCopy() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function IconFile() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M12 11v6m0 0-3-3m3 3 3-3" />
    </svg>
  );
}
function IconShare() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
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

function PinInput({ value, onChange, autoFocus, label }: { value: string; onChange: (v: string) => void; autoFocus?: boolean; label?: string }) {
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
      aria-label={label ?? "Code PIN à 4 chiffres"}
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

/* ── Recevoir : QR + identifiant copiable ────────────────────────── */

function ReceiveSheet({ info, onClose, onCopy }: { info: WalletInfo; onClose: () => void; onCopy: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const identifier = info.wallet.handle ?? info.user.email;
  const payUrl = `${typeof window !== "undefined" ? window.location.origin : "https://ayeba.app"}/money?to=${encodeURIComponent(identifier)}`;

  useEffect(() => {
    let alive = true;
    // Import dynamique — la lib QR (~50 ko) n'est chargée que si l'utilisateur
    // ouvre « Recevoir ». Le bundle principal reste léger.
    void import("qrcode").then((QR) => {
      if (!alive) return;
      QR.toDataURL(payUrl, {
        width: 220,
        margin: 1,
        color: { dark: "#f2f2f2", light: "#00000000" },
      }).then((url) => alive && setQr(url));
    });
    return () => {
      alive = false;
    };
  }, [payUrl]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      onCopy();
    } catch {
      /* presse-papiers indisponible */
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Ayeba Money", text: `Envoyez-moi de l'argent : ${identifier}`, url: payUrl });
      } catch {
        /* annulé */
      }
    } else {
      void copy(payUrl);
    }
  }

  return (
    <div className="mn-overlay" onClick={onClose}>
      <section className="mn-sheet mn-sheet-receive" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Recevoir de l'argent">
        <div className="mn-sheet-head">
          <span className="mn-kicker">Recevoir de l&apos;argent</span>
          <button type="button" className="mn-icon-btn" aria-label="Fermer" onClick={onClose}>✕</button>
        </div>
        <div className="mn-qr">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL générée à la volée, pas d'optimisation possible */}
          {qr ? <img src={qr} alt="Code QR de réception" width={200} height={200} /> : <div className="mn-qr-loading" />}
        </div>
        <div className="mn-receive-id">
          <b>{identifier}</b>
          <button type="button" className="mn-icon-btn" aria-label="Copier" onClick={() => void copy(identifier)}>
            <IconCopy />
          </button>
        </div>
        <small className="mn-note">
          {info.wallet.handle
            ? "On peut aussi vous envoyer via votre email Ayeba — l'@adresse est un raccourci, pas une obligation."
            : "Votre email Ayeba suffit pour recevoir. Choisissez un @pseudo dans Paramètres pour un raccourci plus simple."}
        </small>
        <div className="mn-sheet-actions">
          <button type="button" className="mn-btn" onClick={() => void copy(payUrl)}>
            <IconCopy /> Copier le lien
          </button>
          <button type="button" className="mn-btn-primary" onClick={() => void share()}>
            <IconShare /> Partager
          </button>
        </div>
      </section>
    </div>
  );
}

/* ── Détail d'une transaction — le « reçu » ──────────────────────── */

function TxDetailSheet({ tx, onClose }: { tx: Tx; onClose: () => void }) {
  const date = new Date(tx.createdAt);
  const done = tx.completedAt ? new Date(tx.completedAt) : null;
  const rows: Array<[string, string]> = [
    ["Référence", tx.reference],
    ["Type", TX_LABEL[tx.kind]],
    ["Statut", STATUS_LABEL[tx.status] ?? tx.status],
    ...(tx.counterparty ? [[tx.direction === "out" ? "Destinataire" : "Expéditeur", tx.counterparty] as [string, string]] : []),
    ...(tx.phone ? [["Mobile Money", tx.phone] as [string, string]] : []),
    ...(tx.provider ? [["Partenaire", tx.provider] as [string, string]] : []),
    ["Initiée le", date.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })],
    ...(done && tx.status !== "pending" ? [["Confirmée le", done.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })] as [string, string]] : []),
    ...(tx.failReason ? [["Motif d'échec", tx.failReason] as [string, string]] : []),
    ...(tx.reversalReason ? [["Motif du recrédit", tx.reversalReason] as [string, string]] : []),
  ];
  return (
    <div className="mn-overlay" onClick={onClose}>
      <section className="mn-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Détail de la transaction">
        <div className="mn-sheet-head">
          <span className="mn-kicker">Reçu</span>
          <button type="button" className="mn-icon-btn" aria-label="Fermer" onClick={onClose}>✕</button>
        </div>
        <div className={`mn-receipt-amt ${tx.direction}`}>
          {tx.direction === "in" ? "+" : "−"}
          {tx.amount} <i>{tx.currency === "USD" ? "$" : "FC"}</i>
        </div>
        <dl className="mn-receipt">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

/* ── Paramètres — panneau complet ────────────────────────────────── */

function SettingsSheet({
  info,
  onClose,
  onChanged,
}: {
  info: WalletInfo;
  onClose: () => void;
  onChanged: (msg?: string) => void;
}) {
  const memberSince = new Date(info.wallet.memberSince).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return (
    <div className="mn-overlay" onClick={onClose}>
      <section className="mn-sheet mn-sheet-settings" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Paramètres">
        <div className="mn-sheet-head">
          <span className="mn-kicker">Paramètres</span>
          <button type="button" className="mn-icon-btn" aria-label="Fermer" onClick={onClose}>✕</button>
        </div>
        <div className="mn-settings-scroll">
          <section className="mn-set-group">
            <span className="mn-set-title">Profil</span>
            <div className="mn-set-row">
              <div>
                <b>{info.user.name || "Compte Ayeba"}</b>
                <small>{info.user.email}</small>
              </div>
              <small className="mn-set-meta">Membre depuis {memberSince}</small>
            </div>
          </section>

          <section className="mn-set-group">
            <span className="mn-set-title">Adresse de réception</span>
            <div className="mn-set-row">
              <div>
                {info.wallet.handle ? (
                  <>
                    <b className="mn-addr-inline">{info.wallet.handle}</b>
                    <small>Votre raccourci — on peut aussi vous envoyer via votre email.</small>
                  </>
                ) : (
                  <>
                    <b>Pas d&apos;@pseudo</b>
                    <small>Optionnel — un @pseudo facilite les envois vers vous. Sans lui, votre email suffit déjà.</small>
                  </>
                )}
              </div>
              {!info.wallet.handle && <HandleClaim onDone={(h) => onChanged(`Adresse ${h} activée`)} />}
            </div>
          </section>

          <section className="mn-set-group">
            <span className="mn-set-title">Sécurité</span>
            <PinChange onDone={() => onChanged("Code PIN modifié")} />
            <div className="mn-set-row">
              <div>
                <b>Appareils &amp; session</b>
                <small>Gérez vos connexions depuis votre compte Ayeba.</small>
              </div>
              <Link href="/compte/securite" className="mn-btn">Ouvrir</Link>
            </div>
          </section>

          <section className="mn-set-group">
            <span className="mn-set-title">Documents</span>
            <div className="mn-set-row">
              <div>
                <b>Relevé de compte</b>
                <small>Toutes vos écritures au format CSV — date, référence, montant, solde après.</small>
              </div>
              <a href="/api/money/statement" download className="mn-btn">
                <IconFile /> Télécharger
              </a>
            </div>
          </section>

          <section className="mn-set-group">
            <span className="mn-set-title">Produit</span>
            <div className="mn-set-links">
              <Link href="/privacy/money">Confidentialité Ayeba Money</Link>
              <Link href="/money/conditions">Conditions d&apos;utilisation</Link>
              <Link href="/support">Aide &amp; support</Link>
              <Link href="/money/suppression" className="mn-danger">Fermer le portefeuille</Link>
            </div>
          </section>
        </div>
      </section>
    </div>
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
      <div className="mn-set-row">
        <div>
          <b>Code PIN</b>
          <small>Modifier le code exigé à chaque mouvement.</small>
        </div>
        <button type="button" className="mn-btn" onClick={() => setOpen(true)}>Changer</button>
      </div>
    );
  }
  return (
    <div className="mn-set-row mn-pinchange">
      <div>
        <b>Nouveau code PIN</b>
        <small>Le code actuel est requis pour le changer.</small>
      </div>
      <div className="mn-pinchange-fields">
        <PinInput value={current} onChange={setCurrent} label="PIN actuel" />
        <PinInput value={next} onChange={setNext} label="Nouveau PIN" />
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
  prefillTo,
  onClose,
}: {
  kind: Exclude<Panel, "receive" | null>;
  providers: string[];
  prefillTo?: string;
  onClose: (done: boolean, msg?: string) => void;
}) {
  const [to, setTo] = useState(prefillTo ?? "");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<MoneyCurrency>("USD");
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
            <select value={currency} onChange={(e) => setCurrency(e.target.value as MoneyCurrency)}>
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
