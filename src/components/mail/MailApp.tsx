"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { decryptBytes, decryptUtf8, openContentKey, type VaultSession } from "@/lib/mail/e2ee";
import { sendSealedMessage } from "@/components/mail/send-sealed";
import { SecurityPane, VaultCreate, VaultUnlock, type VaultInfo } from "@/components/mail/VaultScreens";

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
  enc?: 0 | 1;
  sealedSubject?: { iv: string; ct: string };
  sealedBody?: { iv: string; ct: string };
  wrap?: { ek: string; iv: string; ct: string };
  attachmentCount?: number;
  attachments?: { id: string; byteSize: number; fileIv: string; nameIv: string; nameCt: string }[];
};

type OpenFile = { id: string; name: string; mime: string; iv: string; size: number };

type Account = {
  email: string;
  address: string;
  displayName: string;
  avatar: string;
  signature: string;
  status: string;
  createdAt: string;
};

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

function hueFrom(text: string) {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function MailApp() {
  const { user, ready, refreshSession, logout } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gate, setGate] = useState<"landing" | "signup" | "signin">("landing");

  const [folder, setFolder] = useState("inbox");
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [open, setOpen] = useState<Msg | null>(null);
  const [compose, setCompose] = useState(false);
  const [toast, setToast] = useState("");
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState("fr");
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null | undefined>(undefined);
  const [vault, setVault] = useState<VaultSession | null>(null);
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [contentKey, setContentKey] = useState<CryptoKey | null>(null);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const profileRef = useRef<HTMLDivElement>(null);
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
      if (!data.account) {
        setVaultInfo(null);
        setVault(null);
        return;
      }
      const vaultRes = await fetch("/api/mail/vault");
      const vaultData = (await vaultRes.json()) as { vault?: VaultInfo | null };
      const info = vaultData.vault ?? null;
      setVaultInfo(info);
      setVault((cur) => (info && cur && cur.fingerprint === info.fingerprint ? cur : null));
    } catch {
      setAccount(null);
      setVaultInfo(null);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready) void loadAccount();
  }, [ready, loadAccount]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (account) void loadMessages(folder, q);
  }, [account, folder, q, loadMessages]);

  useEffect(() => {
    if (!vault) return;
    let cancel = false;
    void (async () => {
      const next: Record<string, string> = {};
      for (const m of messages) {
        if (m.enc !== 1 || !m.sealedSubject || !m.wrap) continue;
        try {
          const key = await openContentKey(vault, m.wrap);
          next[m.id] = await decryptUtf8(key, m.sealedSubject);
        } catch {
          next[m.id] = "Illisible";
        }
      }
      if (!cancel) setSubjects(next);
    })();
    return () => {
      cancel = true;
    };
  }, [messages, vault]);

  useEffect(() => {
    if (!profileOpen) return;
    const close = (e: MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node)) setProfileOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [profileOpen]);

  const signOut = async () => {
    setProfileOpen(false);
    await logout();
    setAccount(null);
    setVault(null);
    setVaultInfo(undefined);
    setMessages([]);
    setOpen(null);
    setContentKey(null);
    setOpenFiles([]);
    setGate("landing");
    void refreshSession();
  };

  const openMessage = async (id: string) => {
    const res = await fetch(`/api/mail/messages/${id}`);
    if (!res.ok) return;
    const data = (await res.json()) as { message: Msg };
    setTranslation(null);
    setContentKey(null);
    setOpenFiles([]);
    const message = data.message;
    if (message.enc === 1) {
      if (!vault || !message.wrap || !message.sealedSubject || !message.sealedBody) {
        showToast("Ce message est dans le coffre — déverrouillez-le pour le lire.");
        return;
      }
      try {
        const key = await openContentKey(vault, message.wrap);
        const subject = await decryptUtf8(key, message.sealedSubject);
        const body = await decryptUtf8(key, message.sealedBody);
        const files: OpenFile[] = [];
        for (const a of message.attachments || []) {
          try {
            const meta = JSON.parse(await decryptUtf8(key, { iv: a.nameIv, ct: a.nameCt })) as { name?: string; mime?: string };
            files.push({
              id: a.id,
              name: meta.name || "Pièce jointe",
              mime: meta.mime || "application/octet-stream",
              iv: a.fileIv,
              size: a.byteSize,
            });
          } catch {
            files.push({ id: a.id, name: "Pièce jointe", mime: "application/octet-stream", iv: a.fileIv, size: a.byteSize });
          }
        }
        setContentKey(key);
        setOpenFiles(files);
        setOpen({ ...message, subject, body });
      } catch {
        showToast("Impossible de déchiffrer ce message.");
        return;
      }
    } else {
      setOpen(message);
    }
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, read: true } : m)));
    setUnread((u) => Math.max(0, u - 1));
  };

  const downloadFile = async (file: OpenFile) => {
    if (!contentKey) return;
    const res = await fetch(`/api/mail/attachments/${file.id}`);
    if (!res.ok) {
      showToast("Téléchargement impossible.");
      return;
    }
    const cipher = new Uint8Array(await res.arrayBuffer());
    const plain = await decryptBytes(contentKey, file.iv, cipher);
    const copy = new ArrayBuffer(plain.byteLength);
    new Uint8Array(copy).set(plain);
    const blob = new Blob([copy], { type: file.mime || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name || "piece-jointe";
    a.click();
    URL.revokeObjectURL(url);
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

  if (!account) {
    if (gate === "signup") {
      return (
        <SignupFlow
          defaultName={user?.name || ""}
          onDone={() => {
            void refreshSession();
            void loadAccount();
          }}
          onBack={() => setGate("landing")}
        />
      );
    }
    if (gate === "signin") {
      return (
        <SigninFlow
          onDone={() => {
            void refreshSession();
            void loadAccount();
          }}
          onBack={() => setGate("landing")}
        />
      );
    }
    return <Landing onSignup={() => setGate("signup")} onSignin={() => setGate("signin")} />;
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

  if (vaultInfo === undefined) {
    return (
      <div className="mail-root">
        <div className="mail-loading">AYEBA MAIL — COFFRE</div>
      </div>
    );
  }

  if (!vaultInfo) {
    return (
      <VaultCreate
        onReady={(session) => {
          setVault(session);
          void loadAccount();
        }}
      />
    );
  }

  if (!vault) {
    return <VaultUnlock vault={vaultInfo} onReady={(session) => setVault(session)} />;
  }

  const needle = q.trim().toLowerCase();
  const visible = messages.filter((m) => {
    if (!needle || m.enc !== 1) return true;
    const sub = subjects[m.id];
    if (sub === undefined) return false;
    const meta = `${m.from} ${m.fromName} ${m.to.join(" ")}`.toLowerCase();
    return sub.toLowerCase().includes(needle) || meta.includes(needle);
  });

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
            placeholder="Rechercher (objet, expéditeur)…"
          />
        </div>
        <div className="mail-profile" ref={profileRef}>
          <button
            className="mail-orb"
            title={account.email}
            aria-label={`Compte ${account.email}`}
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((v) => !v)}
            style={
              account.avatar
                ? { padding: 0, overflow: "hidden" }
                : {
                    background: `linear-gradient(135deg, hsl(${hueFrom(account.email)} 62% 42%), hsl(${(hueFrom(account.email) + 40) % 360} 70% 30%))`,
                  }
            }
          >
            {account.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.avatar} alt="" width={32} height={32} style={{ objectFit: "cover" }} />
            ) : (
              (account.displayName || account.address)[0].toUpperCase()
            )}
          </button>
          {profileOpen && (
            <div className="mail-account-menu" role="menu">
              <div className="mail-account-head">
                <div
                  className="mail-account-avatar"
                  style={
                    account.avatar
                      ? { padding: 0, overflow: "hidden" }
                      : {
                          background: `linear-gradient(135deg, hsl(${hueFrom(account.email)} 62% 42%), hsl(${(hueFrom(account.email) + 40) % 360} 70% 30%))`,
                        }
                  }
                >
                  {account.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={account.avatar} alt="" width={52} height={52} style={{ objectFit: "cover" }} />
                  ) : (
                    (account.displayName || account.address)[0].toUpperCase()
                  )}
                </div>
                <div className="mail-account-id">
                  <strong>{account.displayName || account.address}</strong>
                  <span>{account.email}</span>
                  <em className="mail-account-badge">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.4" stroke="currentColor"/><path d="M3.8 6.1l1.5 1.5 2.9-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    Compte vérifié par SMS
                  </em>
                </div>
              </div>
              <div className="mail-account-meta">
                <span>Coffre de bout en bout</span>
                <span>Membre depuis {new Date(account.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
              </div>
              <button
                className="mail-account-signout"
                style={{ marginBottom: 6 }}
                onClick={() => {
                  setProfileOpen(false);
                  setSettingsOpen(true);
                }}
              >
                Gérer le compte
              </button>
              <button className="mail-account-signout" onClick={() => void signOut()}>
                Se déconnecter
              </button>
            </div>
          )}
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
            <b>COFFRE BOUT EN BOUT</b>
            <br />
            @AYEBA.APP ILLISIBLE PAR NOUS
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
              {visible.length}
            </span>
          </div>
          {visible.map((m) => (
            <button
              key={m.id}
              className={`mail-item ${!m.read ? "unread" : ""} ${open?.id === m.id ? "active" : ""}`}
              onClick={() => void openMessage(m.id)}
            >
              <div className="mail-item-top">
                {!m.read && <i className="dot" />}
                <span className="mail-item-from">{m.fromName || m.from}</span>
                {m.enc === 1 && <span className="badge system">COFFRE</span>}
                {m.kind === "bounce" && <span className="badge bounce">ÉCHEC</span>}
                {m.kind === "system" && <span className="badge system">AYEBA</span>}
                {(m.attachmentCount || 0) > 0 && <span className="badge system">PJ</span>}
                {m.starred && <span className="star">★</span>}
                <span className="mail-item-time">{fmtTime(m.at)}</span>
              </div>
              <div className="mail-item-subject">{m.enc === 1 ? (subjects[m.id] || "Message chiffré…") : m.subject}</div>
              <div className="mail-item-snippet">
                {m.enc === 1
                  ? (m.attachmentCount ? `${m.attachmentCount} pièce${m.attachmentCount > 1 ? "s" : ""} jointe${m.attachmentCount > 1 ? "s" : ""}` : "Chiffré de bout en bout")
                  : m.body}
              </div>
            </button>
          ))}
          {visible.length === 0 && (
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
              <p className="mail-seal">
                {open.enc === 1
                  ? "Déchiffré sur cet appareil. Ayeba n’a pas le texte."
                  : "Chiffré au repos sur les serveurs Ayeba — pas de bout en bout. Message système, échec de remise, ou reçu avant le coffre."}
              </p>
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
              {openFiles.length > 0 && (
                <div className="mail-files">
                  {openFiles.map((f) => (
                    <button key={f.id} className="mail-file" onClick={() => void downloadFile(f)}>
                      <b>{f.name}</b>
                      <span>{Math.max(1, Math.round(f.size / 1024))} Ko · déchiffrer</span>
                    </button>
                  ))}
                </div>
              )}

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
                  <span className="mail-translate-note">Le texte déchiffré part au service de langue.</span>
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
          signature={account.signature}
          session={vault}
          onClose={() => setCompose(false)}
          onSent={(delivered, bounced, draft) => {
            setCompose(false);
            void loadMessages(folder, q);
            showToast(
              draft
                ? "Brouillon chiffré enregistré."
                : bounced.length
                  ? `Remise partielle — ${bounced.length} échec(s), notification en boîte.`
                  : `Message envoyé à ${delivered.join(", ") || "la boîte"}.`,
            );
          }}
        />
      )}
      {settingsOpen && (
        <SettingsPanel
          account={account}
          session={vault}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => void loadAccount()}
          onLock={() => {
            setVault(null);
            setSettingsOpen(false);
            setOpen(null);
            setContentKey(null);
          }}
          onToast={showToast}
        />
      )}
      {toast && <div className="mail-toast">{toast}</div>}
    </div>
  );
}

/* ── Paramètres du compte ───────────────────────────────────────────── */
function SettingsPanel({
  account,
  session,
  onClose,
  onSaved,
  onLock,
  onToast,
}: {
  account: Account;
  session: VaultSession;
  onClose: () => void;
  onSaved: () => void;
  onLock: () => void;
  onToast: (m: string) => void;
}) {
  const [tab, setTab] = useState<"compte" | "securite">("compte");
  const [name, setName] = useState(account.displayName);
  const [signature, setSignature] = useState(account.signature);
  const [avatar, setAvatar] = useState(account.avatar);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      onToast("Format non supporté — PNG, JPEG ou WebP.");
      return;
    }
    if (file.size > 4_000_000) {
      onToast("Image trop lourde — 4 Mo max avant compression.");
      return;
    }
    const img = new Image();
    img.onload = () => {
      const size = 128;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const side = Math.min(img.width, img.height);
      ctx.drawImage(
        img,
        (img.width - side) / 2,
        (img.height - side) / 2,
        side,
        side,
        0,
        0,
        size,
        size,
      );
      setAvatar(canvas.toDataURL("image/jpeg", 0.82));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/mail/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, signature, avatar }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        onSaved();
        onToast("Compte mis à jour.");
        onClose();
      } else {
        onToast(data.error || "Enregistrement impossible.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mail-settings-overlay" onClick={onClose}>
      <div className="mail-settings" onClick={(e) => e.stopPropagation()}>
        <div className="mail-settings-head">
          <span className="mail-kicker">PARAMÈTRES</span>
          <button className="mail-btn" onClick={onClose}>✕</button>
        </div>
        <div className="mail-switch" style={{ marginBottom: 16 }}>
          <button className={tab === "compte" ? "on" : ""} onClick={() => setTab("compte")}>Compte</button>
          <button className={tab === "securite" ? "on" : ""} onClick={() => setTab("securite")}>Sécurité</button>
        </div>

        {tab === "securite" ? (
          <SecurityPane session={session} onLock={onLock} onToast={onToast} />
        ) : (
        <>
        <div className="mail-settings-photo">
          <button
            className="mail-settings-avatar"
            onClick={() => fileRef.current?.click()}
            title="Changer la photo"
            style={
              avatar
                ? { padding: 0, overflow: "hidden" }
                : {
                    background: `linear-gradient(135deg, hsl(${hueFrom(account.email)} 62% 42%), hsl(${(hueFrom(account.email) + 40) % 360} 70% 30%))`,
                  }
            }
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" width={72} height={72} style={{ objectFit: "cover" }} />
            ) : (
              (name || account.address)[0].toUpperCase()
            )}
            <span className="mail-settings-avatar-edit">✎</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={(e) => pickAvatar(e.target.files?.[0])}
          />
          <div>
            <strong>{account.email}</strong>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              Photo visible par vos correspondants Ayeba. Redimensionnée à 128 px, stockée avec le compte.
            </p>
            {avatar && (
              <button
                className="mail-btn"
                style={{ marginTop: 6, fontSize: 12 }}
                onClick={() => setAvatar("")}
              >
                Retirer la photo
              </button>
            )}
          </div>
        </div>

        <label className="mail-settings-label">Nom affiché</label>
        <input
          className="mail-settings-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />

        <label className="mail-settings-label">Signature</label>
        <textarea
          className="mail-settings-input"
          rows={3}
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Ajoutée automatiquement à vos messages…"
          maxLength={600}
        />

        <div className="mail-settings-meta">
          <span>Compte vérifié par SMS</span>
          <span>Coffre de bout en bout</span>
          <span>Membre depuis {new Date(account.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
        </div>

        <div className="mail-settings-foot">
          <button className="mail-btn" onClick={onClose}>Annuler</button>
          <button className="mail-send-btn" onClick={() => void save()} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

/* ── Fenêtre de rédaction ───────────────────────────────────────────── */
function ComposePanel({
  self,
  signature,
  session,
  onClose,
  onSent,
}: {
  self: string;
  signature: string;
  session: VaultSession;
  onClose: () => void;
  onSent: (delivered: string[], bounced: { address: string }[], draft?: boolean) => void;
}) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [externalAck, setExternalAck] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const leavesVault = to.split(/[,;\s]+/).some((t) => {
    const e = t.trim().toLowerCase();
    return e.includes("@") && !e.endsWith("@ayeba.app");
  });

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const file of list) {
      if (next.length >= 3) {
        setErr("3 pièces jointes maximum.");
        break;
      }
      if (file.size > 3 * 1024 * 1024) {
        setErr(`${file.name} dépasse 3 Mo.`);
        continue;
      }
      next.push(file);
    }
    setFiles(next);
  };

  const send = async (draft = false) => {
    setErr("");
    if (!draft && !to.trim()) return setErr("Ajoutez un destinataire.");
    if (leavesVault && !externalAck && !draft) {
      return setErr("Cochez la confirmation : ce message quitte le coffre.");
    }
    setSending(true);
    try {
      const text = signature && body ? `${body}\n\n—\n${signature}` : body;
      const data = await sendSealedMessage({
        session,
        selfEmail: self,
        toRaw: to,
        subject,
        body: text,
        files,
        externalAck,
        draft,
      });
      if (data.error && !data.bounced?.length) {
        setErr(data.error);
        return;
      }
      onSent(data.delivered ?? [], data.bounced ?? [], draft);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Réseau indisponible — réessayez.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mail-compose">
      <div className="mail-compose-head">
        <span className="mail-kicker">NOUVEAU MESSAGE — COFFRE — {self}</span>
        <button className="mail-btn" onClick={onClose}>✕</button>
      </div>
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="À — prenom@ayeba.app" />
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Objet" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Votre message…" />
      {files.length > 0 && (
        <div className="mail-compose-files">
          {files.map((f, i) => (
            <button key={`${f.name}-${i}`} className="mail-file" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
              <b>{f.name}</b>
              <span>{Math.max(1, Math.round(f.size / 1024))} Ko · retirer</span>
            </button>
          ))}
        </div>
      )}
      {leavesVault && (
        <label className="mail-check mail-compose-warn">
          <input type="checkbox" checked={externalAck} onChange={(e) => setExternalAck(e.target.checked)} />
          <span>Cette adresse est hors Ayeba. Le message et les pièces jointes quittent le coffre et deviennent lisibles par le destinataire.</span>
        </label>
      )}
      <div className="mail-compose-foot">
        <button className="mail-btn" onClick={() => fileRef.current?.click()} disabled={sending}>Joindre</button>
        <input
          ref={fileRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button className="mail-btn" onClick={() => void send(true)} disabled={sending}>Brouillon</button>
        <button className="mail-send-btn" onClick={() => void send(false)} disabled={sending}>
          {sending ? "Chiffrement…" : "Envoyer"}
        </button>
        {err && <span className="mail-compose-err">{err}</span>}
      </div>
    </div>
  );
}

/* ── Landing — vraie page d'accueil produit ─────────────────────────── */
const FEATURES = [
  {
    t: "Coffre de bout en bout",
    d: "Entre adresses @ayeba.app, le texte et les pièces jointes sont chiffrés sur votre appareil. Ayeba stocke le chiffré, pas le contenu.",
    i: "◆",
  },
  {
    t: "Vérifié par téléphone",
    d: "Un numéro, un code SMS, un compte. Pas de mot de passe à voler, pas de compte anonyme — l'identité est réelle.",
    i: "✓",
  },
  {
    t: "Adresse unique à vie",
    d: "prenom@ayeba.app vous appartient pour toujours — jamais dupliquée, jamais réattribuée, même après suppression.",
    i: "@",
  },
  {
    t: "Remise garantie",
    d: "Si un destinataire n'existe pas, vous le savez immédiatement — notification d'échec claire, jamais de silence.",
    i: "↩",
  },
  {
    t: "Quasi-0 data",
    d: "En-têtes d'abord, corps à l'ouverture, images bloquées, extraits seulement. Conçu pour les connexions réelles.",
    i: "▽",
  },
  {
    t: "Traduire en un clic",
    d: "Français, Lingala, Swahili, English — un bouton sous chaque message, comme sur X. Rien d'intrusif.",
    i: "⇄",
  },
];

function Landing({ onSignup, onSignin }: { onSignup: () => void; onSignin: () => void }) {
  return (
    <div className="mail-root mail-landing">
      <header className="mail-topbar">
        <div className="mail-brand">
          <strong>AYEBA</strong>
          <span className="mail-kicker">MAIL</span>
        </div>
        <button className="mail-btn" style={{ marginLeft: "auto" }} onClick={onSignin}>
          Se connecter
        </button>
      </header>

      <div className="mail-landing-scroll">
        <section className="mail-hero">
          <span className="mail-kicker">MESSAGERIE SÉCURISÉE · @AYEBA.APP</span>
          <h1>
            Votre messagerie.
            <br />
            <span>Vraiment à vous.</span>
          </h1>
          <p>
            Une adresse <b>@ayeba.app</b> unique, vérifiée par votre numéro de
            téléphone. Des messages chiffrés que personne n’analyse — même pas
            nous. Conçu pour Kinshasa, ouvert au monde.
          </p>
          <div className="mail-hero-cta">
            <button className="mail-cta" style={{ width: "auto", padding: "13px 34px" }} onClick={onSignup}>
              Créer un compte
            </button>
            <button className="mail-btn" style={{ padding: "12px 22px", fontSize: 11 }} onClick={onSignin}>
              J’ai déjà un compte
            </button>
          </div>
        </section>

        <section className="mail-features">
          {FEATURES.map((f) => (
            <div key={f.t} className="mail-feature">
              <span className="mail-feature-i">{f.i}</span>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          ))}
        </section>

        <section className="mail-band">
          <span className="mail-kicker">ZÉRO GOOGLE · ZÉRO GMAIL</span>
          <p>
            Ayeba Mail est une infrastructure indépendante. Aucune connexion à
            Google, aucune dépendance externe — votre boîte vit sur les
            serveurs de l’écosystème Ayeba.
          </p>
        </section>
      </div>
    </div>
  );
}

/* ── Connexion : numéro → code SMS ──────────────────────────────────── */
function SigninFlow({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
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
          <button className="mail-btn link" style={{ marginTop: 14 }} onClick={onBack}>
            ← Retour
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Inscription : adresse → identité → code SMS ────────────────────── */
function SignupFlow({ defaultName, onDone, onBack }: { defaultName: string; onDone: () => void; onBack: () => void }) {
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
          <button className="mail-btn link" style={{ marginTop: 14 }} onClick={onBack}>
            ← Retour à l’accueil
          </button>
        </div>
      </div>
    </div>
  );
}
