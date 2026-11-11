"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { decryptBytes, decryptUtf8, openContentKey, type VaultSession } from "@/lib/mail/e2ee";
import { sendSealedMessage } from "@/components/mail/send-sealed";
import { SecurityPane, VaultCreate, VaultUnlock, type VaultInfo } from "@/components/mail/VaultScreens";
import {
  IcArchive,
  IcBack,
  IcCheck,
  IcCheckAll,
  IcClip,
  IcClock,
  IcClose,
  IcCompose,
  IcDownload,
  IcDraft,
  IcForward,
  IcInbox,
  IcLock,
  IcMailOpen,
  IcMenu,
  IcMore,
  IcPrint,
  IcRefresh,
  IcReply,
  IcReplyAll,
  IcRestore,
  IcSearch,
  IcSend,
  IcSettings,
  IcSpam,
  IcStar,
  IcTrash,
} from "@/components/mail/icons";

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
  wrap?: { ek: string; iv: string; ct: string; kc?: string };
  attachmentCount?: number;
  attachments?: { id: string; byteSize: number; fileIv: string; nameIv: string; nameCt: string }[];
  snoozeUntil?: string | null;
  unsubscribe?: string;
};

type OpenFile = { id: string; name: string; mime: string; iv: string; size: number; key?: CryptoKey };

type ThreadMsg = {
  msg: Msg;
  subject: string;
  body: string;
  files: OpenFile[];
  failed?: boolean;
};

type ComposeInit = { to?: string; subject?: string; body?: string; draftId?: string; files?: File[] };

type Account = {
  email: string;
  address: string;
  displayName: string;
  avatar: string;
  signature: string;
  status: string;
  createdAt: string;
};

const FOLDERS: { id: string; label: string; icon: (p: { size?: number }) => React.ReactNode }[] = [
  { id: "inbox", label: "Boîte de réception", icon: (p) => <IcInbox {...p} /> },
  { id: "starred", label: "Suivis", icon: (p) => <IcStar {...p} /> },
  { id: "snoozed", label: "En attente", icon: (p) => <IcClock {...p} /> },
  { id: "sent", label: "Envoyés", icon: (p) => <IcSend {...p} /> },
  { id: "drafts", label: "Brouillons", icon: (p) => <IcDraft {...p} /> },
  { id: "archive", label: "Archives", icon: (p) => <IcArchive {...p} /> },
  { id: "spam", label: "Spam", icon: (p) => <IcSpam {...p} /> },
  { id: "trash", label: "Corbeille", icon: (p) => <IcTrash {...p} /> },
];

/** Préréglages de mise en attente — façon Gmail (ce soir / demain / semaine). */
const SNOOZE_PRESETS: { label: string; at: () => Date }[] = [
  {
    label: "Ce soir",
    at: () => {
      const d = new Date();
      d.setHours(18, 0, 0, 0);
      if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
      return d;
    },
  },
  {
    label: "Demain matin",
    at: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(8, 0, 0, 0);
      return d;
    },
  },
  {
    label: "Semaine prochaine",
    at: () => {
      const d = new Date();
      d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
      d.setHours(8, 0, 0, 0);
      return d;
    },
  },
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
  const [thread, setThread] = useState<ThreadMsg[]>([]);
  const [compose, setCompose] = useState<ComposeInit | null>(null);
  const [navOpen, setNavOpen] = useState(false);
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null); // id du message dont le menu ⋯ est ouvert
  const [contacts, setContacts] = useState<{ email: string; name: string }[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({}); // fileId → objectURL déchiffré
  const [sendUndo, setSendUndo] = useState<{
    payload: { to: string; subject: string; body: string; files: File[]; externalAck: boolean; draftId?: string };
  } | null>(null);
  const [undoBar, setUndoBar] = useState<{ msg: string; run: () => Promise<void> | void } | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const sendTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const swipeRef = useRef<{ id: string; x0: number; y0: number; dx: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((t: string) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3800);
  }, []);

  // Snackbar « action + Annuler » — le pattern Gmail : action immédiate,
  // réversible pendant ~5 s.
  const showUndoBar = useCallback((msg: string, run: () => Promise<void> | void) => {
    setUndoBar({ msg, run });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoBar(null), 5000);
  }, []);

  const runUndo = async () => {
    const u = undoBar;
    setUndoBar(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    await u?.run();
  };

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
    setSelected(new Set());
    setMenuFor(null);
  }, [account, folder, q, loadMessages]);

  // Correspondants connus — autocomplete du champ « À ».
  useEffect(() => {
    if (!account) return;
    void fetch("/api/mail/contacts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { contacts?: { email: string; name: string }[] } | null) => {
        if (d?.contacts) setContacts(d.contacts);
      })
      .catch(() => {});
  }, [account]);

  // Fermer le menu ⋯ et la liste des contacts au clic extérieur.
  useEffect(() => {
    if (!menuFor) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuFor(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuFor]);

  // Push FCM — dans le shell Android Capacitor, on enregistre le token
  // de l'appareil pour être notifié à chaque mail entrant.
  useEffect(() => {
    if (!account) return;
    type PushPlugin = {
      requestPermissions(): Promise<{ receive: string }>;
      register(): Promise<void>;
      addListener(event: string, cb: (t: { value: string }) => void): void;
    };
    const cap = (
      window as unknown as {
        Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { PushNotifications?: PushPlugin } };
      }
    ).Capacitor;
    const push = cap?.Plugins?.PushNotifications;
    if (!cap?.isNativePlatform?.() || !push) return;
    let dead = false;
    void (async () => {
      const perm = await push.requestPermissions();
      if (dead || perm.receive !== "granted") return;
      push.addListener("registration", (t) => {
        void fetch("/api/mail/push-token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: t.value, platform: "android" }),
        });
      });
      await push.register();
    })();
    return () => {
      dead = true;
    };
  }, [account]);

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
    setThread([]);
    setContentKey(null);
    setOpenFiles([]);
    setGate("landing");
    void refreshSession();
  };

  const decryptOne = useCallback(
    async (message: Msg): Promise<ThreadMsg> => {
      if (message.enc !== 1) return { msg: message, subject: message.subject, body: message.body, files: [] };
      if (!vault || !message.wrap || !message.sealedSubject || !message.sealedBody) {
        return { msg: message, subject: "Message chiffré", body: "", files: [], failed: true };
      }
      try {
        const key = await openContentKey(vault, message.wrap);
        const subject = await decryptUtf8(key, message.sealedSubject);
        const body = await decryptUtf8(key, message.sealedBody);
        const files: OpenFile[] = [];
        for (const a of message.attachments || []) {
          let name = "Pièce jointe", mime = "application/octet-stream";
          try {
            const meta = JSON.parse(await decryptUtf8(key, { iv: a.nameIv, ct: a.nameCt })) as { name?: string; mime?: string };
            name = meta.name || name;
            mime = meta.mime || mime;
          } catch { /* métadonnées illisibles — nom générique */ }
          files.push({ id: a.id, name, mime, iv: a.fileIv, size: a.byteSize, key });
        }
        return { msg: message, subject, body, files };
      } catch {
        return { msg: message, subject: "Message chiffré", body: "", files: [], failed: true };
      }
    },
    [vault],
  );

  const openMessage = async (id: string) => {
    const res = await fetch(`/api/mail/messages/${id}`);
    if (!res.ok) return;
    const data = (await res.json()) as { message: Msg };
    const message = data.message;
    setTranslation(null);
    setContentKey(null);
    setOpenFiles([]);
    const mine = await decryptOne(message);
    if (mine.failed) {
      showToast("Ce message est dans le coffre — déverrouillez-le pour le lire.");
      return;
    }
    // Brouillon : on reprend la rédaction au lieu d'ouvrir le lecteur.
    if (message.folder === "drafts") {
      setCompose({ to: message.to.join(", "), subject: mine.subject, body: mine.body, draftId: message.id });
      setOpen(null);
      setThread([]);
      return;
    }
    setContentKey(mine.files.find((f) => f.key)?.key ?? null);
    setOpenFiles(mine.files);
    setOpen({ ...message, subject: mine.subject, body: mine.body });
    // Vue conversation : tous les messages du fil, déchiffrés.
    if (message.threadId) {
      const tr = await fetch(`/api/mail/messages?thread=${encodeURIComponent(message.threadId)}`);
      if (tr.ok) {
        const td = (await tr.json()) as { messages: Msg[] };
        setThread(await Promise.all((td.messages || []).map((m) => decryptOne(m))));
      } else {
        setThread([mine]);
      }
    } else {
      setThread([mine]);
    }
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, read: true } : m)));
    if (!message.read) setUnread((u) => Math.max(0, u - 1));
  };

  const downloadFile = async (file: OpenFile) => {
    const key = file.key ?? contentKey;
    if (!key) return;
    const res = await fetch(`/api/mail/attachments/${file.id}`);
    if (!res.ok) {
      showToast("Téléchargement impossible.");
      return;
    }
    const cipher = new Uint8Array(await res.arrayBuffer());
    const plain = await decryptBytes(key, file.iv, cipher);
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

  // Répondre / Transférer — citation façon clients mails.
  const quoteOf = (t: ThreadMsg) =>
    `\n\n——————\nLe ${fmtFull(t.msg.at)}, ${t.msg.fromName || t.msg.from} a écrit :\n` +
    t.body.split("\n").map((l) => `> ${l}`).join("\n");

  const reSubject = (s: string) => (/^re\s*:/i.test(s.trim()) ? s : `Re : ${s}`);

  const startReply = (t: ThreadMsg, all = false) => {
    const self = account!.email.toLowerCase();
    const fromIsMe = t.msg.from.toLowerCase() === self;
    let to: string[];
    if (all) {
      to = [...new Set([t.msg.from, ...t.msg.to].filter((e) => e.toLowerCase() !== self))];
      if (!to.length) to = [...t.msg.to];
    } else {
      to = fromIsMe ? [...t.msg.to] : [t.msg.from];
    }
    setCompose({ to: to.join(", "), subject: reSubject(t.subject), body: quoteOf(t) });
  };

  const startForward = async (t: ThreadMsg) => {
    const fwd = /^tr\s*:|^fwd?\s*:/i.test(t.subject.trim()) ? t.subject : `Tr : ${t.subject}`;
    // Les pièces jointes voyagent avec le transfert.
    const files: File[] = [];
    for (const f of t.files) {
      try {
        const key = f.key;
        if (!key) continue;
        const res = await fetch(`/api/mail/attachments/${f.id}`);
        if (!res.ok) continue;
        const cipher = new Uint8Array(await res.arrayBuffer());
        const plain = await decryptBytes(key, f.iv, cipher);
        const copy = new ArrayBuffer(plain.byteLength);
        new Uint8Array(copy).set(plain);
        files.push(new File([copy], f.name, { type: f.mime }));
      } catch { /* PJ ignorée si indéchiffrable */ }
    }
    setCompose({
      to: "",
      subject: fwd,
      body: `\n\n——————\nMessage transféré — De : ${t.msg.fromName || t.msg.from} <${t.msg.from}>\nDate : ${fmtFull(t.msg.at)}\nObjet : ${t.subject}\nÀ : ${t.msg.to.join(", ")}\n\n${t.body}`,
      files,
    });
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    await fetch(`/api/mail/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    void loadMessages(folder, q);
  };

  const emptyTrash = async () => {
    const trashed = messages.filter((m) => m.folder === "trash" || m.folder === "spam");
    await Promise.all(trashed.map((m) => fetch(`/api/mail/messages/${m.id}`, { method: "DELETE" })));
    setOpen(null);
    setThread([]);
    void loadMessages(folder, q);
    showToast(folder === "spam" ? "Spam vidé." : "Corbeille vidée.");
  };

  // ── Actions groupées ──
  const bulkPatch = async (ids: string[], body: Record<string, unknown>) => {
    await fetch("/api/mail/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, ...body }),
    });
    setSelected(new Set());
    setMenuFor(null);
    void loadMessages(folder, q);
  };

  // Déplacement avec « Annuler » — mémorise le dossier d'origine de chaque
  // message pour un retour exact (le pattern Gmail : action, puis snackbar).
  const moveMsgs = async (ids: string[], target: string, label: string) => {
    const prev = new Map(messages.filter((m) => ids.includes(m.id)).map((m) => [m.id, m.folder]));
    if (open && ids.includes(open.id)) { setOpen(null); setThread([]); }
    setMenuFor(null);
    await fetch("/api/mail/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, folder: target }),
    });
    setSelected(new Set());
    void loadMessages(folder, q);
    showUndoBar(label, async () => {
      await Promise.all(ids.map((id) => fetch(`/api/mail/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: prev.get(id) || "inbox" }),
      })));
      void loadMessages(folder, q);
    });
  };

  const snooze = async (id: string, until: Date) => {
    const prev = messages.find((x) => x.id === id)?.folder || "inbox";
    await fetch(`/api/mail/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snoozeUntil: until.toISOString() }),
    });
    setMenuFor(null);
    if (open?.id === id) { setOpen(null); setThread([]); }
    void loadMessages(folder, q);
    showUndoBar(`Reporté à ${until.toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}`, async () => {
      await fetch(`/api/mail/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: prev }),
      });
      void loadMessages(folder, q);
    });
  };

  // Corbeille avec « Annuler » — définitif seulement depuis trash/spam.
  const trashMsg = async (m: Msg) => {
    const permanent = m.folder === "trash" || m.folder === "spam";
    if (open?.id === m.id) { setOpen(null); setThread([]); }
    setMenuFor(null);
    await fetch(`/api/mail/messages/${m.id}`, { method: "DELETE" });
    setSelected((s) => { const n = new Set(s); n.delete(m.id); return n; });
    void loadMessages(folder, q);
    if (permanent) {
      showToast("Supprimé définitivement.");
    } else {
      const prev = m.folder;
      showUndoBar("Déplacé vers la corbeille", async () => {
        await fetch(`/api/mail/messages/${m.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: prev }),
        });
        void loadMessages(folder, q);
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Tactile : long-press = sélection (façon Gmail), swipe = actions ──
  const longPress = useRef<{ timer: ReturnType<typeof setTimeout> | null; fired: boolean }>({ timer: null, fired: false });

  const onTouchStart = (m: Msg, e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeRef.current = { id: m.id, x0: t.clientX, y0: t.clientY, dx: 0 };
    if (longPress.current.timer) clearTimeout(longPress.current.timer);
    longPress.current.fired = false;
    longPress.current.timer = setTimeout(() => {
      longPress.current.fired = true;
      swipeRef.current = null;
      toggleSelect(m.id);
      navigator.vibrate?.(15);
    }, 450);
  };
  const onTouchMove = (m: Msg, e: React.TouchEvent) => {
    const s = swipeRef.current;
    if (!s || s.id !== m.id) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x0;
    const dy = t.clientY - s.y0;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      if (longPress.current.timer) { clearTimeout(longPress.current.timer); longPress.current.timer = null; }
    }
    if (Math.abs(dy) > Math.abs(dx)) { swipeRef.current = null; return; }
    s.dx = dx;
    (e.currentTarget as HTMLElement).style.transform = `translateX(${Math.max(-90, Math.min(90, dx))}px)`;
  };
  const onTouchEnd = (m: Msg, e: React.TouchEvent) => {
    if (longPress.current.timer) { clearTimeout(longPress.current.timer); longPress.current.timer = null; }
    const s = swipeRef.current;
    swipeRef.current = null;
    const el = e.currentTarget as HTMLElement;
    el.style.transform = "";
    if (!s || Math.abs(s.dx) < 70) return;
    if (s.dx < 0 && m.folder !== "archive" && m.folder !== "trash" && m.folder !== "drafts") {
      void moveMsgs([m.id], "archive", "Archivé");
    } else if (s.dx > 0 && m.folder !== "drafts") {
      void trashMsg(m);
    }
  };

  // ── Annuler l'envoi (fenêtre 5 s façon Gmail) ──
  const scheduleSend = (payload: { to: string; subject: string; body: string; files: File[]; externalAck: boolean; draftId?: string }) => {
    setCompose(null);
    setSendUndo({ payload });
    if (sendTimer.current) clearTimeout(sendTimer.current);
    sendTimer.current = setTimeout(() => void fireSend(payload), 5000);
    showToast("Envoi… touchez Annuler pour revenir.");
  };

  const fireSend = async (payload: { to: string; subject: string; body: string; files: File[]; externalAck: boolean; draftId?: string }) => {
    setSendUndo(null);
    try {
      const text = account!.signature && payload.body ? `${payload.body}\n\n—\n${account!.signature}` : payload.body;
      const data = await sendSealedMessage({
        session: vault!, selfEmail: account!.email, toRaw: payload.to, subject: payload.subject,
        body: text, files: payload.files, externalAck: payload.externalAck, draft: false,
      });
      if (data.error && !data.bounced?.length) {
        setCompose({ to: payload.to, subject: payload.subject, body: payload.body, files: payload.files, draftId: payload.draftId });
        showToast(data.error);
        return;
      }
      if (payload.draftId) {
        await fetch(`/api/mail/messages/${payload.draftId}`, { method: "DELETE" });
        await fetch(`/api/mail/messages/${payload.draftId}`, { method: "DELETE" });
      }
      void loadMessages(folder, q);
      showToast(data.bounced?.length ? `Remise partielle — ${data.bounced.length} échec(s).` : "Message envoyé.");
    } catch {
      // Échec réseau/crypto : on rouvre la rédaction — rien n'est perdu.
      setCompose({ to: payload.to, subject: payload.subject, body: payload.body, files: payload.files, draftId: payload.draftId });
      showToast("Échec de l'envoi — le message est rouvert.");
    }
  };

  const cancelSend = () => {
    if (sendTimer.current) clearTimeout(sendTimer.current);
    if (sendUndo) setCompose({ to: sendUndo.payload.to, subject: sendUndo.payload.subject, body: sendUndo.payload.body, files: sendUndo.payload.files, draftId: sendUndo.payload.draftId });
    setSendUndo(null);
  };

  // ── Aperçu image inline (déchiffrement à la demande) ──
  const loadPreview = async (f: OpenFile) => {
    if (previews[f.id]) {
      setPreviews((p) => { const n = { ...p }; URL.revokeObjectURL(n[f.id]); delete n[f.id]; return n; });
      return;
    }
    const key = f.key ?? contentKey;
    if (!key) return;
    const res = await fetch(`/api/mail/attachments/${f.id}`);
    if (!res.ok) return;
    const cipher = new Uint8Array(await res.arrayBuffer());
    const plain = await decryptBytes(key, f.iv, cipher);
    const copy = new ArrayBuffer(plain.byteLength);
    new Uint8Array(copy).set(plain);
    setPreviews((p) => ({ ...p, [f.id]: URL.createObjectURL(new Blob([copy], { type: f.mime })) }));
  };

  // ── Impression + export .eml ──
  const emlOf = (t: ThreadMsg) =>
    `From: ${t.msg.fromName ? `"${t.msg.fromName}" ` : ""}<${t.msg.from}>\r\nTo: ${t.msg.to.join(", ")}\r\nSubject: ${t.subject}\r\nDate: ${new Date(t.msg.at).toUTCString()}\r\n\r\n${t.body}`;

  const downloadEml = (t: ThreadMsg) => {
    const blob = new Blob([emlOf(t)], { type: "message/rfc822" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(t.subject || "message").replace(/[^\wÀ-ÿ -]/g, "").slice(0, 60) || "message"}.eml`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuFor(null);
  };

  const printMessage = (t: ThreadMsg) => {
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) return;
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    w.document.write(`<html><head><title>${esc(t.subject)}</title><style>body{font-family:system-ui,sans-serif;padding:32px;color:#111}h1{font-size:20px}meta{color:#666;font-size:12px}pre{white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.6}</style></head><body><h1>${esc(t.subject)}</h1><div class="meta" style="color:#666;font-size:12px;margin-bottom:20px">De ${esc(t.msg.fromName || t.msg.from)} &lt;${esc(t.msg.from)}&gt; — ${fmtFull(t.msg.at)}<br>À ${esc(t.msg.to.join(", "))}</div><pre>${esc(t.body)}</pre></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
    setMenuFor(null);
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
    return <Landing onSignup={() => {}} onSignin={() => {}} />;
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

  const allVisibleSelected = visible.length > 0 && visible.every((m) => selected.has(m.id));
  const toggleSelectAll = () =>
    setSelected((s) => (allVisibleSelected ? new Set([...s].filter((id) => !visible.some((m) => m.id === id))) : new Set([...s, ...visible.map((m) => m.id)])));

  // Code 4–8 chiffres façon OTP — détecté d'abord près d'un mot-clé, sinon
  // le premier nombre isolé plausibe (copie en un geste, comme Gmail).
  const detectedCode = open?.body
    ? (/code|otp|vérifi|verifi|pin|sécurit|securit|confirm|validation|mot de passe|password/i.test(open.body) &&
        /(?:code|otp|pin|est|is|:)[^0-9]{0,25}(\d{4,8})\b/i.exec(open.body)?.[1]) ||
      /\b(\d{6})\b/.exec(open.body)?.[1] ||
      /\b(\d{4,8})\b/.exec(open.body)?.[1] ||
      null
    : null;

  const copyCode = () => {
    if (!detectedCode) return;
    void navigator.clipboard?.writeText(detectedCode).then(
      () => showToast(`Code ${detectedCode} copié.`),
      () => showToast(`Code : ${detectedCode}`),
    );
  };

  const unsubscribe = () => {
    const u = open?.unsubscribe?.trim();
    if (!u) return;
    if (/^https?:\/\//i.test(u)) window.open(u, "_blank", "noopener,noreferrer");
    else if (/^mailto:/i.test(u)) window.location.href = u;
    showToast("Demande de désabonnement ouverte.");
  };

  // ── Webmail ──
  return (
    <div className="mail-root">
      <header className="mail-topbar">
        <button className="mail-burger" aria-label="Dossiers" onClick={() => setNavOpen(true)}><IcMenu size={20} /></button>
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
          <button className="mail-compose-btn" onClick={() => setCompose({})}>
            <span className="lbl">Nouveau message</span>
            <span className="mail-compose-icon"><IcCompose size={15} /></span>
          </button>
          {FOLDERS.map((f) => (
            <button
              key={f.id}
              className={`mail-folder ${folder === f.id ? "active" : ""}`}
              onClick={() => { setFolder(f.id); setOpen(null); setThread([]); }}
            >
              <span className="fi">{f.icon({ size: 15 })}</span>
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

        {navOpen && (
          <div className="mail-drawer-overlay" onClick={() => setNavOpen(false)}>
            <nav className="mail-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="mail-drawer-head">
                <div className="mail-brand">
                  <strong>AYEBA</strong>
                  <span className="mail-kicker">MAIL</span>
                </div>
                <button className="mail-icon-btn" onClick={() => setNavOpen(false)}><IcClose size={17} /></button>
              </div>
              <button
                className="mail-compose-btn"
                onClick={() => { setNavOpen(false); setCompose({}); }}
              >
                <span className="lbl">Nouveau message</span>
              </button>
              {FOLDERS.map((f) => (
                <button
                  key={f.id}
                  className={`mail-folder ${folder === f.id ? "active" : ""}`}
                  onClick={() => { setFolder(f.id); setOpen(null); setThread([]); setNavOpen(false); }}
                >
                  <span className="fi">{f.icon({ size: 15 })}</span>
                  <span className="lbl">{f.label}</span>
                  {f.id === "inbox" && unread > 0 && <span className="count">{unread}</span>}
                </button>
              ))}
              <div className="mail-drawer-foot">
                <button className="mail-folder" onClick={() => { setNavOpen(false); setSettingsOpen(true); }}>
                  <span className="fi"><IcSettings size={15} /></span>
                  <span className="lbl">Paramètres</span>
                </button>
                <button
                  className="mail-folder"
                  onClick={() => {
                    setNavOpen(false);
                    setVault(null);
                    setOpen(null);
                    setThread([]);
                    setContentKey(null);
                  }}
                >
                  <span className="fi"><IcLock size={15} /></span>
                  <span className="lbl">Verrouiller le coffre</span>
                </button>
              </div>
            </nav>
          </div>
        )}

        <section className={`mail-list ${selected.size ? "selecting" : ""}`}>
          <div className="mail-list-head">
            {selected.size === 0 ? (
              <>
                <span className="mail-kicker">
                  {FOLDERS.find((f) => f.id === folder)?.label.toUpperCase()}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {(folder === "trash" || folder === "spam") && messages.length > 0 && (
                    <button className="mail-btn link" style={{ fontSize: 11 }} onClick={() => void emptyTrash()}>
                      Vider
                    </button>
                  )}
                  <button
                    className="mail-icon-btn"
                    title="Actualiser"
                    onClick={() => { void loadMessages(folder, q); void loadAccount(); }}
                  >
                    <IcRefresh size={15} />
                  </button>
                  <span className="mail-kicker" style={{ color: "var(--faint)" }}>
                    {visible.length}
                  </span>
                </span>
              </>
            ) : (
              <>
                <button className="mail-icon-btn" title="Tout désélectionner" onClick={() => setSelected(new Set())}>
                  <IcClose size={15} />
                </button>
                <span className="mail-sel-count">{selected.size}</span>
                <span className="mail-sel-actions">
                  <button className="mail-icon-btn" title={allVisibleSelected ? "Tout désélectionner" : "Tout sélectionner"} onClick={toggleSelectAll}>
                    {allVisibleSelected ? <IcCheck size={15} /> : <IcCheckAll size={15} />}
                  </button>
                  <button className="mail-icon-btn" title="Marquer lu" onClick={() => void bulkPatch([...selected], { read: true })}>
                    <IcMailOpen size={15} />
                  </button>
                  <button className="mail-icon-btn" title="Marquer non lu" onClick={() => void bulkPatch([...selected], { read: false })}>
                    <IcInbox size={15} />
                  </button>
                  <button className="mail-icon-btn" title="Archiver" onClick={() => void moveMsgs([...selected], "archive", `${selected.size} archivé(s)`)}>
                    <IcArchive size={15} />
                  </button>
                  <button className="mail-icon-btn" title="Signaler comme spam" onClick={() => void moveMsgs([...selected], "spam", `${selected.size} signalé(s) comme spam`)}>
                    <IcSpam size={15} />
                  </button>
                  <button
                    className="mail-icon-btn"
                    title="Mettre en attente — ce soir"
                    onClick={() => void bulkPatch([...selected], { snoozeUntil: SNOOZE_PRESETS[0].at().toISOString() })}
                  >
                    <IcClock size={15} />
                  </button>
                  <button
                    className="mail-icon-btn danger"
                    title="Supprimer"
                    onClick={async () => {
                      const sel = messages.filter((m) => selected.has(m.id));
                      const permanent = folder === "trash" || folder === "spam";
                      const prev = new Map(sel.map((m) => [m.id, m.folder]));
                      await Promise.all(sel.map((m) => fetch(`/api/mail/messages/${m.id}`, { method: "DELETE" })));
                      setSelected(new Set());
                      setOpen(null); setThread([]);
                      void loadMessages(folder, q);
                      if (permanent) {
                        showToast("Supprimé définitivement.");
                      } else {
                        showUndoBar(`${sel.length} déplacé(s) vers la corbeille`, async () => {
                          await Promise.all(sel.map((m) => fetch(`/api/mail/messages/${m.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ folder: prev.get(m.id) || "inbox" }),
                          })));
                          void loadMessages(folder, q);
                        });
                      }
                    }}
                  >
                    <IcTrash size={15} />
                  </button>
                </span>
              </>
            )}
          </div>
          {visible.map((m) => (
            <div key={m.id} className="mail-item-wrap">
              <button
                className={`mail-item ${!m.read ? "unread" : ""} ${open?.id === m.id ? "active" : ""} ${selected.has(m.id) ? "selected" : ""}`}
                onClick={() => {
                  if (longPress.current.fired) { longPress.current.fired = false; return; }
                  if (selected.size) toggleSelect(m.id);
                  else void openMessage(m.id);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  // Le timer long-press a déjà basculé la sélection — le
                  // contextmenu Android qui suit ne doit pas la rebasculer.
                  if (longPress.current.fired) return;
                  toggleSelect(m.id);
                }}
                onTouchStart={(e) => onTouchStart(m, e)}
                onTouchMove={(e) => onTouchMove(m, e)}
                onTouchEnd={(e) => onTouchEnd(m, e)}
                onTouchCancel={() => {
                  if (longPress.current.timer) { clearTimeout(longPress.current.timer); longPress.current.timer = null; }
                  swipeRef.current = null;
                }}
              >
                <span
                  className={`mail-item-check ${selected.has(m.id) ? "on" : ""}`}
                  role="checkbox"
                  aria-checked={selected.has(m.id)}
                  aria-label="Sélectionner"
                  onClick={(e) => { e.stopPropagation(); toggleSelect(m.id); }}
                >
                  {selected.has(m.id) ? <IcCheck size={12} /> : null}
                </span>
                <div
                  className="mail-item-avatar"
                  style={{
                    background: `linear-gradient(135deg, hsl(${hueFrom(m.from)} 62% 42%), hsl(${(hueFrom(m.from) + 40) % 360} 70% 30%))`,
                  }}
                >
                  {(m.fromName || m.from)[0].toUpperCase()}
                </div>
                <div className="mail-item-main">
                  <div className="mail-item-top">
                    {!m.read && <i className="dot" />}
                    <span className="mail-item-from">{m.fromName || m.from}</span>
                    {(m.attachmentCount || 0) > 0 && <span className="badge system" style={{ display: "inline-flex", padding: "2px 4px" }}><IcClip size={11} /></span>}
                    <span
                      className={`star ${m.starred ? "on" : ""}`}
                      role="button"
                      aria-label="Suivre"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMessages((ms) => ms.map((x) => (x.id === m.id ? { ...x, starred: !x.starred } : x)));
                        void fetch(`/api/mail/messages/${m.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ starred: !m.starred }),
                        });
                      }}
                    >
                      <IcStar size={14} filled={m.starred} />
                    </span>
                    <span className="mail-item-time">
                      {m.snoozeUntil && folder === "snoozed"
                        ? `⏸ ${new Date(m.snoozeUntil).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                        : fmtTime(m.at)}
                    </span>
                    <span
                      className="mail-item-menu"
                      role="button"
                      aria-label="Options"
                      onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === m.id ? null : m.id); }}
                    >
                      <IcMore size={15} />
                    </span>
                  </div>
                  <div className="mail-item-subject">{m.enc === 1 ? (subjects[m.id] || "Message chiffré…") : m.subject}</div>
                  <div className="mail-item-snippet">
                    {m.enc === 1
                      ? (m.attachmentCount ? `${m.attachmentCount} pièce${m.attachmentCount > 1 ? "s" : ""} jointe${m.attachmentCount > 1 ? "s" : ""}` : "Chiffré de bout en bout")
                      : m.body}
                  </div>
                  {(m.enc === 1 || m.kind !== "mail") && (
                    <div className="mail-item-badges">
                      {m.enc === 1 && <span className="badge system">COFFRE</span>}
                      {m.kind === "bounce" && <span className="badge bounce">ÉCHEC</span>}
                      {m.kind === "system" && <span className="badge system">AYEBA</span>}
                      {m.folder === "drafts" && <span className="badge draft">BROUILLON</span>}
                    </div>
                  )}
                </div>
              </button>
              {menuFor === m.id && (
                <div className="mail-menu" ref={menuRef}>
                  <button onClick={() => { void patch(m.id, { read: !m.read }); if (!m.read) setUnread((u) => Math.max(0, u - 1)); else setUnread((u) => u + 1); setMenuFor(null); }}>
                    <IcMailOpen size={14} /> {m.read ? "Marquer non lu" : "Marquer lu"}
                  </button>
                  <button onClick={() => { setMessages((ms) => ms.map((x) => (x.id === m.id ? { ...x, starred: !x.starred } : x))); void fetch(`/api/mail/messages/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ starred: !m.starred }) }); setMenuFor(null); }}>
                    <IcStar size={14} filled={m.starred} /> {m.starred ? "Retirer le suivi" : "Suivre"}
                  </button>
                  <div className="mail-menu-sep" />
                  {SNOOZE_PRESETS.map((s) => (
                    <button key={s.label} onClick={() => void snooze(m.id, s.at())}>
                      <IcClock size={14} /> En attente — {s.label}
                    </button>
                  ))}
                  <div className="mail-menu-sep" />
                  {m.folder !== "inbox" && (
                    <button onClick={() => void moveMsgs([m.id], "inbox", "Restauré en boîte de réception")}>
                      <IcInbox size={14} /> Boîte de réception
                    </button>
                  )}
                  {m.folder !== "archive" && (
                    <button onClick={() => void moveMsgs([m.id], "archive", "Archivé")}>
                      <IcArchive size={14} /> Archiver
                    </button>
                  )}
                  {m.folder !== "spam" && (
                    <button onClick={() => void moveMsgs([m.id], "spam", "Signalé comme spam")}>
                      <IcSpam size={14} /> Signaler comme spam
                    </button>
                  )}
                  <div className="mail-menu-sep" />
                  <button className="danger" onClick={() => void trashMsg(m)}>
                    <IcTrash size={14} /> {m.folder === "trash" || m.folder === "spam" ? "Supprimer définitivement" : "Supprimer"}
                  </button>
                </div>
              )}
            </div>
          ))}
          {visible.length === 0 && (
            <div style={{ padding: "40px 18px", color: "var(--faint)", fontSize: 13 }}>
              {folder === "snoozed" ? "Aucun message en attente." : folder === "spam" ? "Aucun spam — belle boîte." : "Aucun message ici."}
            </div>
          )}
        </section>

        <section className={`mail-reader ${open ? "is-open" : ""}`}>
          {!open ? (
            <div className="mail-reader-empty">
              <span className="mail-kicker">AYEBA MAIL</span>
              <span style={{ fontSize: 13 }}>Sélectionnez un message</span>
            </div>
          ) : (
            <>
              <div className="mail-reader-topbar">
                <button className="mail-back" onClick={() => { setOpen(null); setThread([]); }} aria-label="Retour à la liste">
                  <IcBack size={17} /> <span className="lbl">{FOLDERS.find((f) => f.id === folder)?.label}</span>
                </button>
                <div className="mail-reader-topbar-actions">
                  <button
                    className="mail-icon-btn"
                    title={open.folder === "archive" ? "Restaurer dans la boîte" : "Archiver"}
                    onClick={() => void moveMsgs([open.id], open.folder === "archive" ? "inbox" : "archive", open.folder === "archive" ? "Restauré en boîte de réception" : "Archivé")}
                  >
                    {open.folder === "archive" ? <IcRestore size={15} /> : <IcArchive size={15} />}
                  </button>
                  {(open.folder === "trash" || open.folder === "spam") && (
                    <button
                      className="mail-icon-btn"
                      title="Restaurer"
                      onClick={() => void moveMsgs([open.id], "inbox", "Restauré en boîte de réception")}
                    >
                      <IcRestore size={15} />
                    </button>
                  )}
                  <button
                    className="mail-icon-btn"
                    title={open.starred ? "Retirer le suivi" : "Suivre"}
                    onClick={() => {
                      void patch(open.id, { starred: !open.starred });
                      setOpen({ ...open, starred: !open.starred });
                      setThread((ts) => ts.map((t) => (t.msg.id === open.id ? { ...t, msg: { ...t.msg, starred: !open.starred } } : t)));
                    }}
                  >
                    <IcStar size={15} filled={open.starred} />
                  </button>
                  <button
                    className="mail-icon-btn"
                    title="Marquer non lu"
                    onClick={() => void patch(open.id, { read: false }).then(() => { setOpen(null); setThread([]); setUnread((u) => u + 1); })}
                  >
                    <IcMailOpen size={15} />
                  </button>
                  <button className="mail-icon-btn danger" title={open.folder === "trash" || open.folder === "spam" ? "Supprimer définitivement" : "Supprimer"} onClick={() => void trashMsg(open)}>
                    <IcTrash size={15} />
                  </button>
                  <div style={{ position: "relative" }}>
                    <button className="mail-icon-btn" title="Plus" onClick={() => setMenuFor(menuFor === `r-${open.id}` ? null : `r-${open.id}`)}>
                      <IcMore size={15} />
                    </button>
                    {menuFor === `r-${open.id}` && (
                      <div className="mail-menu reader" ref={menuRef}>
                        {SNOOZE_PRESETS.map((s) => (
                          <button key={s.label} onClick={() => void snooze(open.id, s.at())}>
                            <IcClock size={14} /> En attente — {s.label}
                          </button>
                        ))}
                        {open.folder !== "spam" && (
                          <button onClick={() => void moveMsgs([open.id], "spam", "Signalé comme spam")}>
                            <IcSpam size={14} /> Signaler comme spam
                          </button>
                        )}
                        {open.folder !== "inbox" && open.folder !== "snoozed" && (
                          <button onClick={() => void moveMsgs([open.id], "inbox", "Restauré en boîte de réception")}>
                            <IcInbox size={14} /> Boîte de réception
                          </button>
                        )}
                        <div className="mail-menu-sep" />
                        <button onClick={() => downloadEml({ msg: open, subject: open.subject, body: open.body, files: openFiles })}>
                          <IcDownload size={14} /> Télécharger (.eml)
                        </button>
                        <button onClick={() => printMessage({ msg: open, subject: open.subject, body: open.body, files: openFiles })}>
                          <IcPrint size={14} /> Imprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mail-reader-scroll">
                <h1>{open.subject}</h1>
                <p className="mail-seal">
                  {open.enc === 1
                    ? open.wrap?.kc
                      ? "Déchiffré sur cet appareil — enveloppe hybride ECDH + ML-KEM-768 (post-quantique). Ayeba n’a pas le texte."
                      : "Déchiffré sur cet appareil. Ayeba n’a pas le texte."
                    : "Chiffré au repos sur les serveurs Ayeba — pas de bout en bout. Message système, échec de remise, ou reçu avant le coffre."}
                </p>

                {(detectedCode || open.unsubscribe) && (
                  <div className="mail-smart-actions">
                    {detectedCode && (
                      <button className="mail-smart-chip" onClick={copyCode} title="Copier le code">
                        <IcCheck size={13} /> Code détecté : <strong>{detectedCode}</strong> — copier
                      </button>
                    )}
                    {open.unsubscribe && (
                      <button className="mail-smart-chip" onClick={unsubscribe} title={open.unsubscribe.slice(0, 120)}>
                        Se désabonner
                      </button>
                    )}
                  </div>
                )}

                {(thread.length ? thread : [{ msg: open, subject: open.subject, body: open.body, files: openFiles }]).map((t) => (
                  <article key={t.msg.id} className={`mail-msg ${t.msg.id === open.id ? "focus" : ""}`}>
                    <div className="mail-msg-head">
                      <div
                        className="mail-msg-avatar"
                        style={{
                          background: `linear-gradient(135deg, hsl(${hueFrom(t.msg.from)} 62% 42%), hsl(${(hueFrom(t.msg.from) + 40) % 360} 70% 30%))`,
                        }}
                      >
                        {(t.msg.fromName || t.msg.from)[0].toUpperCase()}
                      </div>
                      <div className="mail-msg-id">
                        <div className="from">{t.msg.fromName || t.msg.from}<span>{t.msg.from}</span></div>
                        <div className="to">à {t.msg.to.join(", ")}</div>
                      </div>
                      <span className="when" title={fmtFull(t.msg.at)}>{fmtTime(t.msg.at)}</span>
                    </div>
                    {t.failed ? (
                      <div className="mail-msg-body" style={{ color: "var(--faint)", fontStyle: "italic" }}>
                        Message chiffré — déverrouillez le coffre pour le lire.
                      </div>
                    ) : (
                      <div className="mail-msg-body">{t.body}</div>
                    )}
                    {t.files.length > 0 && (
                      <div className="mail-files">
                        {t.files.map((f) => (
                          <div key={f.id} className="mail-file-wrap">
                            {f.mime.startsWith("image/") && previews[f.id] && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img className="mail-file-preview" src={previews[f.id]} alt={f.name} onClick={() => void downloadFile(f)} />
                            )}
                            <div className="mail-file-row">
                              <button className="mail-file" onClick={() => void downloadFile(f)}>
                                <b>{f.name}</b>
                                <span>{Math.max(1, Math.round(f.size / 1024))} Ko</span>
                              </button>
                              {f.mime.startsWith("image/") && (
                                <button className="mail-icon-btn" title={previews[f.id] ? "Masquer l'aperçu" : "Aperçu"} onClick={() => void loadPreview(f)}>
                                  {previews[f.id] ? <IcClose size={14} /> : <IcSearch size={14} />}
                                </button>
                              )}
                              <button className="mail-icon-btn" title="Télécharger" onClick={() => void downloadFile(f)}>
                                <IcDownload size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {!t.failed && t.msg.kind !== "bounce" && (
                      <div className="mail-msg-actions">
                        <button className="mail-btn" onClick={() => startReply(t)}><IcReply size={13} /> Répondre</button>
                        {(t.msg.to.length > 1 || t.msg.from.toLowerCase() !== account.email.toLowerCase()) && (
                          <button className="mail-btn" onClick={() => startReply(t, true)}><IcReplyAll size={13} /> Tous</button>
                        )}
                        <button className="mail-btn" onClick={() => void startForward(t)}><IcForward size={13} /> Transférer</button>
                      </div>
                    )}
                  </article>
                ))}

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
              </div>

              {open.kind !== "bounce" && (
                <div className="mail-reader-bar">
                  <button className="mail-send-btn" onClick={() => startReply(thread.find((t) => t.msg.id === open.id) ?? { msg: open, subject: open.subject, body: open.body, files: openFiles })}>
                    <IcReply size={14} /> Répondre
                  </button>
                  <button className="mail-btn" onClick={() => void startForward(thread.find((t) => t.msg.id === open.id) ?? { msg: open, subject: open.subject, body: open.body, files: openFiles })}>
                    <IcForward size={14} /> Transférer
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {!open && !compose && (
        <button className="mail-fab" aria-label="Nouveau message" onClick={() => setCompose({})}>
          <IcCompose size={22} />
        </button>
      )}

      {compose && (
        <ComposePanel
          self={account.email}
          signature={account.signature}
          session={vault}
          initial={compose}
          contacts={contacts}
          onClose={() => setCompose(null)}
          onScheduleSend={scheduleSend}
          onSent={(delivered, bounced, draft) => {
            const draftId = compose.draftId;
            setCompose(null);
            if (!draft && draftId) {
              // Le brouillon est envoyé : on le purge (corbeille puis suppression).
              void fetch(`/api/mail/messages/${draftId}`, { method: "DELETE" })
                .then(() => fetch(`/api/mail/messages/${draftId}`, { method: "DELETE" }));
            }
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
            setThread([]);
            setContentKey(null);
          }}
          onToast={showToast}
        />
      )}
      {sendUndo && (
        <div className="mail-undo">
          <span>Envoi du message…</span>
          <button className="mail-undo-btn" onClick={cancelSend}>Annuler</button>
        </div>
      )}
      {undoBar && (
        <div className="mail-undo">
          <span>{undoBar.msg}</span>
          <button className="mail-undo-btn" onClick={() => void runUndo()}>Annuler</button>
        </div>
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
          <button className="mail-icon-btn" onClick={onClose}><IcClose size={16} /></button>
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
            <span className="mail-settings-avatar-edit"><IcCompose size={11} /></span>
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
  initial,
  contacts,
  onClose,
  onSent,
  onScheduleSend,
}: {
  self: string;
  signature: string;
  session: VaultSession;
  initial?: ComposeInit;
  contacts: { email: string; name: string }[];
  onClose: () => void;
  onSent: (delivered: string[], bounced: { address: string }[], draft?: boolean) => void;
  onScheduleSend: (p: { to: string; subject: string; body: string; files: File[]; externalAck: boolean; draftId?: string }) => void;
}) {
  const [to, setTo] = useState(initial?.to ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [files, setFiles] = useState<File[]>(initial?.files ?? []);
  const [externalAck, setExternalAck] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [toFocus, setToFocus] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Autocomplete « À » : on filtre sur le dernier jeton (avant la virgule).
  const lastToken = to.split(/[,;]/).pop()!.trim().toLowerCase();
  const already = new Set(to.split(/[,;]/).map((t) => t.trim().toLowerCase()).filter(Boolean));
  const suggestions = lastToken.length >= 2
    ? contacts.filter((c) => !already.has(c.email) && (c.email.includes(lastToken) || c.name.toLowerCase().includes(lastToken))).slice(0, 5)
    : [];
  const pickContact = (email: string) => {
    const parts = to.split(/[,;]/);
    parts[parts.length - 1] = ` ${email}`;
    setTo(parts.join(",").replace(/^\s/, "") + ", ");
  };
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

  // Envoi réel : on remonte la charge utile — l'app garde une fenêtre
  // « Annuler l'envoi » de 5 s avant de sceller et transmettre.
  const requestSend = () => {
    setErr("");
    if (!to.trim()) return setErr("Ajoutez un destinataire.");
    if (leavesVault && !externalAck) {
      return setErr("Cochez la confirmation : ce message quitte le coffre.");
    }
    onScheduleSend({ to, subject, body, files, externalAck, draftId: initial?.draftId });
  };

  return (
    <div className="mail-compose">
      <div className="mail-compose-head">
        <span className="mail-kicker">NOUVEAU MESSAGE — COFFRE — {self}</span>
        <button className="mail-icon-btn" onClick={onClose}><IcClose size={16} /></button>
      </div>
      <div className="mail-to-wrap">
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          onFocus={() => setToFocus(true)}
          onBlur={() => setTimeout(() => setToFocus(false), 150)}
          placeholder="À — prenom@ayeba.app"
          autoComplete="off"
        />
        {toFocus && suggestions.length > 0 && (
          <div className="mail-to-suggest">
            {suggestions.map((c) => (
              <button key={c.email} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pickContact(c.email)}>
                <span
                  className="mail-to-avatar"
                  style={{ background: `linear-gradient(135deg, hsl(${hueFrom(c.email)} 62% 42%), hsl(${(hueFrom(c.email) + 40) % 360} 70% 30%))` }}
                >
                  {(c.name || c.email)[0].toUpperCase()}
                </span>
                <span className="mail-to-name">{c.name || c.email}<em>{c.email}</em></span>
              </button>
            ))}
          </div>
        )}
      </div>
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
        <button className="mail-send-btn" onClick={requestSend} disabled={sending}>
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
    d: "Les messages échangés entre adresses @ayeba.app sont chiffrés de bout en bout sur votre appareil. Ayeba conserve le chiffré, jamais le contenu.",
    i: "◆",
  },
  {
    t: "Hybride post-quantique",
    d: "Chaque enveloppe combine ECDH P-256 et ML-KEM-768 : casser un message exigerait de casser les deux — même face à un ordinateur quantique.",
    i: "◇",
  },
  {
    t: "Vérifié par téléphone",
    d: "L'inscription s'effectue par vérification SMS. Aucun mot de passe à compromettre, aucun compte anonyme.",
    i: "✓",
  },
  {
    t: "Adresse unique à vie",
    d: "Votre adresse @ayeba.app vous est attribuée de manière permanente : jamais dupliquée, jamais réattribuée, même après suppression du compte.",
    i: "@",
  },
  {
    t: "Remise garantie",
    d: "En cas d'échec de livraison, une notification explicite vous informe immédiatement. Aucun message ne disparaît en silence.",
    i: "✓",
  },
  {
    t: "Consommation réduite",
    d: "En-têtes chargés en priorité, corps à l'ouverture, images distantes bloquées par défaut. Conçu pour les connexions limitées.",
    i: "▽",
  },
  {
    t: "Traduction intégrée",
    d: "Français, Lingala, Swahili, English — traduisez chaque message en un geste, sans quitter la conversation.",
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
            Une messagerie privée.
            <br />
            <span>Conçue pour durer.</span>
          </h1>
          <p>
            Une adresse <b>@ayeba.app</b> vérifiée par téléphone. Des échanges
            chiffrés de bout en bout, une infrastructure dédiée, et aucune
            analyse du contenu de vos messages.
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
          <span className="mail-kicker">UNE INFRASTRUCTURE DÉDIÉE</span>
          <p>
            Ayeba Mail fonctionne sur ses propres serveurs. Vos données restent
            au sein de l’écosystème Ayeba et ne sont jamais transmises à des
            tiers.
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
              <p className="sub">Votre adresse @ayeba.app vous identifie sur l’ensemble des services Ayeba.</p>
              {err && <div className="mail-err">{err}</div>}
              <div className="mail-field">
                <label>Votre adresse</label>
                <div className="addr-row">
                  <input
                    value={address}
                    onChange={(e) => checkAddress(e.target.value)}
                    placeholder="votre.adresse"
                    autoComplete="off"
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
                  placeholder="Votre nom complet"
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
