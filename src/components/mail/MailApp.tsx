"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { LoginModal } from "@/components/auth/AuthUI";

type Msg = {
  id: string;
  threadId: string;
  folder: string;
  from: string;
  fromName: string;
  to: string[];
  subject: string;
  body: string;
  read: boolean;
  starred: boolean;
  kind: "mail" | "bounce" | "system";
  at: string;
};

type Account = { email: string; address: string; displayName: string; status: string; createdAt: string };

const FOLDERS: { id: string; label: string; icon: string }[] = [
  { id: "inbox", label: "Boîte de réception", icon: "▤" },
  { id: "starred", label: "Suivis", icon: "★" },
  { id: "sent", label: "Envoyés", icon: "↗" },
  { id: "drafts", label: "Brouillons", icon: "▱" },
  { id: "archive", label: "Archives", icon: "▣" },
  { id: "trash", label: "Corbeille", icon: "✕" },
];

const LANGS = [
  { id: "fr", label: "Français" },
  { id: "ln", label: "Lingala" },
  { id: "sw", label: "Swahili" },
  { id: "en", label: "English" },
];

// Date max de naissance (13 ans) — calculée une fois au chargement du module.
const MAX_BIRTHDATE = new Date(Date.now() - 13 * 365.25 * 86400e3)
  .toISOString()
  .slice(0, 10);

function fmtTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function fmtFull(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function MailApp() {
  const { user, ready, setLoginOpen } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const [folder, setFolder] = useState("inbox");
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [open, setOpen] = useState<Msg | null>(null);
  const [compose, setCompose] = useState(false);
  const [toast, setToast] = useState("");
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState("fr");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const showToast = useCallback((t: string) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3800);
  }, []);

  const loadAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/mail/account");
      const data = (await res.json()) as { account?: Account | null; unread?: number };
      setAccount(data.account ?? null);
      setUnread(data.unread ?? 0);
    } catch {
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (f: string, query: string) => {
    const res = await fetch(
      `/api/mail/messages?folder=${f}&q=${encodeURIComponent(query)}`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as { messages: Msg[] };
    setMessages(data.messages);
  }, []);

  useEffect(() => {
    if (ready && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadAccount();
    } else if (ready) {
      setLoading(false);
    }
  }, [ready, user, loadAccount]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (account) void loadMessages(folder, q);
  }, [account, folder, q, loadMessages]);

  const openMessage = async (id: string) => {
    const res = await fetch(`/api/mail/messages/${id}`);
    if (!res.ok) return;
    const data = (await res.json()) as { message: Msg };
    setOpen(data.message);
    setTranslation(null);
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, read: true } : m)));
    setUnread((u) => Math.max(0, u - 1));
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    await fetch(`/api/mail/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    void loadMessages(folder, q);
  };

  const removeMessage = async (id: string) => {
    await fetch(`/api/mail/messages/${id}`, { method: "DELETE" });
    setOpen(null);
    void loadMessages(folder, q);
    showToast("Message déplacé vers la corbeille.");
  };

  const translate = async () => {
    if (!open) return;
    setTranslating(true);
    setTranslation(null);
    try {
      const res = await fetch("/api/mail/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${open.subject}\n\n${open.body}`, target: targetLang }),
      });
      const data = (await res.json()) as { translation?: string; error?: string };
      if (data.translation) setTranslation(data.translation);
      else showToast(data.error || "Traduction indisponible.");
    } catch {
      showToast("Traduction indisponible.");
    } finally {
      setTranslating(false);
    }
  };

  // ── États ──
  if (loading || !ready) {
    return (
      <div className="mail-root">
        <div className="mail-loading">AYEBA MAIL — CHARGEMENT</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mail-root">
        <div className="mail-gate">
          <div className="mail-gate-panel">
            <span className="mail-kicker">AYEBA MAIL</span>
            <h2>Votre messagerie sécurisée</h2>
            <p className="sub">
              Une adresse <b>@ayeba.app</b> unique, un compte vérifié par
              téléphone, des messages chiffrés. Connectez-vous à votre compte
              Ayeba pour créer votre adresse.
            </p>
            <button className="mail-cta" onClick={() => setLoginOpen(true)}>
              Se connecter — Ayeba
            </button>
          </div>
        </div>
        <LoginModal />
      </div>
    );
  }

  if (!account) {
    return <SignupFlow defaultName={user.name} onDone={() => void loadAccount()} />;
  }

  if (account.status === "suspended") {
    return (
      <div className="mail-root">
        <div className="mail-gate">
          <div className="mail-gate-panel">
            <span className="mail-kicker">AYEBA MAIL</span>
            <h2>Compte suspendu</h2>
            <p className="sub">
              Votre boîte <b>{account.email}</b> est suspendue par l’équipe Ayeba.
              Contactez le support pour plus d’informations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Webmail ──
  return (
    <div className="mail-root">
      <header className="mail-topbar">
        <div className="mail-brand">
          <strong>AYEBA</strong>
          <span className="mail-kicker">MAIL</span>
        </div>
        <div className="mail-search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher dans les messages…"
          />
        </div>
        <div className="mail-orb" title={account.email}>
          {account.address[0].toUpperCase()}
        </div>
      </header>

      <div className="mail-body">
        <nav className="mail-rail">
          <button className="mail-compose-btn" onClick={() => setCompose(true)}>
            <span className="lbl">Nouveau message</span>
            <span style={{ display: "none" }} className="mail-compose-icon">✎</span>
          </button>
          {FOLDERS.map((f) => (
            <button
              key={f.id}
              className={`mail-folder ${folder === f.id ? "active" : ""}`}
              onClick={() => { setFolder(f.id); setOpen(null); }}
            >
              <span>{f.icon}</span>
              <span className="lbl">{f.label}</span>
              {f.id === "inbox" && unread > 0 && <span className="count">{unread}</span>}
            </button>
          ))}
          <div className="mail-rail-note">
            <b>CHIFFRÉ AU REPOS</b>
            <br />
            CONTENU JAMAIS ANALYSÉ
            <br />
            COMPTE VÉRIFIÉ PAR SMS
          </div>
        </nav>

        <section className="mail-list">
          <div className="mail-list-head">
            <span className="mail-kicker">
              {FOLDERS.find((f) => f.id === folder)?.label.toUpperCase()}
            </span>
            <span className="mail-kicker" style={{ color: "var(--faint)" }}>
              {messages.length}
            </span>
          </div>
          {messages.map((m) => (
            <button
              key={m.id}
              className={`mail-item ${!m.read ? "unread" : ""} ${open?.id === m.id ? "active" : ""}`}
              onClick={() => void openMessage(m.id)}
            >
              <div className="mail-item-top">
                {!m.read && <i className="dot" />}
                <span className="mail-item-from">{m.fromName || m.from}</span>
                {m.kind === "bounce" && <span className="badge bounce">ÉCHEC</span>}
                {m.kind === "system" && <span className="badge system">AYEBA</span>}
                {m.starred && <span className="star">★</span>}
                <span className="mail-item-time">{fmtTime(m.at)}</span>
              </div>
              <div className="mail-item-subject">{m.subject}</div>
              <div className="mail-item-snippet">{m.body}</div>
            </button>
          ))}
          {messages.length === 0 && (
            <div style={{ padding: "40px 18px", color: "var(--faint)", fontSize: 13 }}>
              Aucun message ici.
            </div>
          )}
        </section>

        <section className="mail-reader">
          {!open ? (
            <div className="mail-reader-empty">
              <span className="mail-kicker">AYEBA MAIL</span>
              <span style={{ fontSize: 13 }}>Sélectionnez un message</span>
            </div>
          ) : (
            <>
              <h1>{open.subject}</h1>
              <div className="mail-reader-meta">
                <div className="from">
                  {open.fromName || open.from}
                  <span>{open.from}</span>
                </div>
                <div className="to">à {open.to.join(", ")}</div>
                <span className="when">{fmtFull(open.at)}</span>
                <div className="mail-reader-actions">
                  <button
                    className="mail-btn"
                    onClick={() => void patch(open.id, { starred: !open.starred })}
                  >
                    {open.starred ? "★ Suivi" : "☆ Suivre"}
                  </button>
                  <button
                    className="mail-btn"
                    onClick={() => void patch(open.id, { read: false }).then(() => setOpen(null))}
                  >
                    Non lu
                  </button>
                  <button
                    className="mail-btn"
                    onClick={() => void patch(open.id, { folder: "archive" }).then(() => setOpen(null))}
                  >
                    Archiver
                  </button>
                  <button className="mail-btn danger" onClick={() => void removeMessage(open.id)}>
                    Supprimer
                  </button>
                </div>
              </div>
              <div className="mail-reader-body">{open.body}</div>

              <div className="mail-translate">
                <div className="mail-translate-bar">
                  {translation ? (
                    <button className="mail-btn link" onClick={() => setTranslation(null)}>
                      Voir l’original
                    </button>
                  ) : (
                    <button className="mail-btn link" onClick={() => void translate()} disabled={translating}>
                      {translating ? "Traduction…" : "Traduire"}
                    </button>
                  )}
                  <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
                    {LANGS.map((l) => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </div>
                {translation && <div className="mail-translated">{translation}</div>}
              </div>
            </>
          )}
        </section>
      </div>

      {compose && (
        <ComposePanel
          self={account.email}
          onClose={() => setCompose(false)}
          onSent={(delivered, bounced) => {
            setCompose(false);
            void loadMessages(folder, q);
            showToast(
              bounced.length
                ? `Remise partielle — ${bounced.length} échec(s), notification en boîte.`
                : `Message envoyé à ${delivered.join(", ")}.`,
            );
          }}
        />
      )}
      {toast && <div className="mail-toast">{toast}</div>}
    </div>
  );
}

/* ── Fenêtre de rédaction ───────────────────────────────────────────── */
function ComposePanel({
  self,
  onClose,
  onSent,
}: {
  self: string;
  onClose: () => void;
  onSent: (delivered: string[], bounced: { address: string }[]) => void;
}) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    setErr("");
    if (!to.trim()) return setErr("Ajoutez un destinataire.");
    setSending(true);
    try {
      const res = await fetch("/api/mail/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        delivered?: string[];
        bounced?: { address: string }[];
        error?: string;
      };
      if (!res.ok && !data.bounced?.length) {
        setErr(data.error || "Envoi impossible.");
        return;
      }
      onSent(data.delivered ?? [], data.bounced ?? []);
    } catch {
      setErr("Réseau indisponible — réessayez.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mail-compose">
      <div className="mail-compose-head">
        <span className="mail-kicker">NOUVEAU MESSAGE — {self}</span>
        <button className="mail-btn" onClick={onClose}>✕</button>
      </div>
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="À — prenom@ayeba.app" />
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Objet" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Votre message…" />
      <div className="mail-compose-foot">
        <button className="mail-send-btn" onClick={() => void send()} disabled={sending}>
          {sending ? "Envoi…" : "Envoyer"}
        </button>
        {err && <span className="mail-compose-err">{err}</span>}
      </div>
    </div>
  );
}

/* ── Inscription : adresse → téléphone → code SMS ───────────────────── */
function SignupFlow({ defaultName, onDone }: { defaultName: string; onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState("");
  const [avail, setAvail] = useState<null | { ok: boolean; msg: string }>(null);
  const [displayName, setDisplayName] = useState(defaultName);
  const [birthdate, setBirthdate] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const checkTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const checkAddress = (v: string) => {
    setAddress(v.replace(/[^a-z0-9._-]/gi, "").toLowerCase());
    setAvail(null);
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (v.length < 3) return;
    checkTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/mail/address?local=${encodeURIComponent(v.toLowerCase())}`);
      const data = (await res.json()) as { ok?: boolean; available?: boolean; reason?: string };
      if (!data.ok) setAvail({ ok: false, msg: data.reason || "Adresse invalide." });
      else setAvail(
        data.available
          ? { ok: true, msg: `${v.toLowerCase()}@ayeba.app — disponible` }
          : { ok: false, msg: "Déjà prise." },
      );
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

  return (
    <div className="mail-root">
      <div className="mail-gate">
        <div className="mail-gate-panel">
          <div className="mail-steps">
            <i className={step >= 1 ? "done" : ""} />
            <i className={step >= 2 ? "done" : ""} />
            <i className={step >= 3 ? "done" : ""} />
          </div>
          <span className="mail-kicker">AYEBA MAIL — CRÉATION</span>

          {step === 1 && (
            <>
              <h2>Choisissez votre adresse</h2>
              <p className="sub">Unique à vie — jamais réattribuée, jamais dupliquée.</p>
              {err && <div className="mail-err">{err}</div>}
              <div className="mail-field">
                <label>Votre adresse</label>
                <div className="addr-row">
                  <input
                    value={address}
                    onChange={(e) => checkAddress(e.target.value)}
                    placeholder="benjaminoussama"
                    autoFocus
                  />
                  <span className="suffix">@ayeba.app</span>
                </div>
                {avail && <div className={`mail-avail ${avail.ok ? "ok" : "ko"}`}>{avail.msg}</div>}
              </div>
              <button
                className="mail-cta"
                disabled={!avail?.ok}
                onClick={() => setStep(2)}
              >
                Continuer
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Votre identité</h2>
              <p className="sub">
                Comme toute messagerie sérieuse : nom complet, âge (13 ans
                minimum) et téléphone — ce dernier prouvé par code SMS pour{" "}
                <b>{address}@ayeba.app</b>.
              </p>
              {err && <div className="mail-err">{err}</div>}
              <div className="mail-field">
                <label>Nom complet</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Benjamin Oussama"
                  autoFocus
                />
              </div>
              <div className="mail-field">
                <label>Date de naissance</label>
                <input
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  max={MAX_BIRTHDATE}
                />
              </div>
              <div className="mail-field">
                <label>Numéro de téléphone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+243 9XX XXX XXX"
                  inputMode="tel"
                />
              </div>
              <div className="mail-field">
                <label>Email de récupération (optionnel)</label>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="autre@exemple.com"
                />
              </div>
              <button
                className="mail-cta"
                disabled={busy || displayName.trim().length < 2 || !birthdate || phone.length < 8}
                onClick={() => void sendCode()}
              >
                {busy ? "Envoi…" : "Recevoir le code"}
              </button>
              <button className="mail-btn link" style={{ marginTop: 12 }} onClick={() => setStep(1)}>
                ← Changer d’adresse
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <h2>Entrez le code</h2>
              <p className="sub">Envoyé par SMS à <b>{phone}</b> — valide 5 minutes.</p>
              {devCode && (
                <div className="mail-dev-code">
                  MODE DEV — aucun provider SMS configuré. Code : {devCode}
                </div>
              )}
              {err && <div className="mail-err">{err}</div>}
              <div className="mail-field">
                <label>Code de vérification</label>
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
                {busy ? "Vérification…" : "Créer mon adresse"}
              </button>
              <button className="mail-btn link" style={{ marginTop: 12 }} onClick={() => setStep(2)}>
                ← Renvoyer un code
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
