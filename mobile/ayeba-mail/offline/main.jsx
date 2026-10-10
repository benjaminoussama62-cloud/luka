import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

const STORAGE_KEY = "ayeba-mail-offline-v1";
const MAIL_DOMAIN = "ayeba.app";
const MAX_ATTACHMENTS = 3;
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const PASSPHRASE_ITERATIONS = 600_000;
const RECOVERY_ITERATIONS = 120_000;

const FOLDERS = [
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

const RESERVED = new Set([
  "admin", "administrator", "support", "aide", "help", "contact", "info",
  "no-reply", "noreply", "no_reply", "mailer", "postmaster", "abuse", "webmaster",
  "security", "securite", "billing", "facturation", "sales", "press", "legal",
  "ayeba", "ayebi", "mail", "studio", "omega", "tala", "jemsa", "sombateka",
  "aether", "radar", "yield", "trace", "velocity", "developers", "root", "system",
]);

const FEATURES = [
  {
    t: "Coffre local chiffré",
    d: "La phrase secrète ne quitte jamais l’appareil. Sujet, texte et pièces jointes sont stockés chiffrés.",
    i: "◆",
  },
  {
    t: "Ouverture sans réseau",
    d: "L’interface complète vit dans l’application. Elle démarre en avion, en zone blanche ou sans data.",
    i: "✓",
  },
  {
    t: "Adresse unique à vie",
    d: "Votre @ayeba.app local vous appartient — les données restent sur ce téléphone jusqu’à la synchronisation.",
    i: "@",
  },
  {
    t: "Remise honnête",
    d: "Sans réseau, l’app enregistre le message dans Envoyés au lieu de prétendre qu’il a été remis.",
    i: "↩",
  },
  {
    t: "Quasi-0 data",
    d: "Aucun chargement web au démarrage : interface, chiffrement, messages et réglages sont embarqués.",
    i: "▽",
  },
  {
    t: "Même design Ayeba",
    d: "Le rail, la liste, le lecteur, le coffre et les réglages reprennent le langage visuel de la version web.",
    i: "⇄",
  },
];

const MAX_BIRTHDATE = new Date(Date.now() - 13 * 365.25 * 86400e3)
  .toISOString()
  .slice(0, 10);
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const subtle = () => globalThis.crypto.subtle;

function emptyStore() {
  return { account: null, vault: null, messages: [] };
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    return {
      account: parsed.account || null,
      vault: parsed.vault || null,
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch {
    return emptyStore();
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

const uid = () => [...globalThis.crypto.getRandomValues(new Uint8Array(12))]
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("");
const now = () => new Date().toISOString();

function bytesToB64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 8192, bytes.length)));
  }
  return btoa(binary);
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function fmtTime(iso) {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function fmtFull(iso) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function hueFrom(text) {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

function validateAddress(local) {
  const a = String(local || "").toLowerCase().trim();
  if (!/^[a-z][a-z0-9._-]{2,29}$/.test(a)) {
    return { ok: false, reason: "3–30 caractères : lettres, chiffres, point, tiret (commence par une lettre)." };
  }
  if (a.includes("..")) return { ok: false, reason: "Deux points consécutifs interdits." };
  if (RESERVED.has(a)) return { ok: false, reason: "Cette adresse est réservée." };
  return { ok: true };
}

function normalizePhone(raw) {
  let p = String(raw || "").replace(/[\s.\-()]/g, "");
  if (p.startsWith("00")) p = `+${p.slice(2)}`;
  if (p.startsWith("0")) p = `+243${p.slice(1)}`;
  if (/^243\d{9}$/.test(p)) p = `+${p}`;
  if (/^9\d{8}$/.test(p)) p = `+243${p}`;
  return /^\+[1-9]\d{7,14}$/.test(p) ? p : null;
}

function passphraseError(pw) {
  const p = String(pw || "").normalize("NFKC");
  if (p.length < 12) return "12 caractères minimum — une phrase, pas un code court.";
  if (p.length > 200) return "200 caractères maximum.";
  if (/^\d+$/.test(p)) return "Ajoutez des lettres : un code uniquement numérique est trop faible.";
  return null;
}

function normalizeRecoveryKey(raw) {
  return String(raw || "").toUpperCase().replace(/[^A-Z2-9]/g, "");
}

function generateRecoveryKey() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = globalThis.crypto.getRandomValues(new Uint8Array(32));
  return [...buf].map((b) => alphabet[b % 32]).join("").replace(/(.{4})(?=.)/g, "$1-");
}

async function pbkdf2Key(secret, salt, iterations) {
  const base = await subtle().importKey(
    "raw",
    encoder.encode(String(secret).normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return subtle().deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function wrapVaultKey(secret, rawKey, iterations) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const key = await pbkdf2Key(secret, salt, iterations);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle().encrypt({ name: "AES-GCM", iv }, key, rawKey);
  return {
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    ct: bytesToB64(new Uint8Array(ct)),
    iterations,
  };
}

async function unwrapVaultKey(secret, wrap) {
  if (!wrap || wrap.iterations < 100_000 || wrap.iterations > 800_000) {
    throw new Error("Paramètres de dérivation refusés.");
  }
  const key = await pbkdf2Key(secret, b64ToBytes(wrap.salt), wrap.iterations);
  const plain = await subtle().decrypt(
    { name: "AES-GCM", iv: b64ToBytes(wrap.iv) },
    key,
    b64ToBytes(wrap.ct),
  );
  return new Uint8Array(plain);
}

async function importVaultKey(raw) {
  return subtle().importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function fingerprintRaw(raw) {
  const digest = await subtle().digest("SHA-256", raw);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32)
    .toUpperCase()
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

async function encryptText(key, text) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle().encrypt({ name: "AES-GCM", iv }, key, encoder.encode(String(text)));
  return { iv: bytesToB64(iv), ct: bytesToB64(new Uint8Array(ct)) };
}

async function decryptText(key, pack) {
  const plain = await subtle().decrypt(
    { name: "AES-GCM", iv: b64ToBytes(pack.iv) },
    key,
    b64ToBytes(pack.ct),
  );
  return decoder.decode(plain);
}

async function encryptBytes(key, bytes) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle().encrypt({ name: "AES-GCM", iv }, key, bytes);
  return { iv: bytesToB64(iv), ct: new Uint8Array(ct) };
}

async function decryptBytes(key, ivB64, ctB64) {
  const plain = await subtle().decrypt(
    { name: "AES-GCM", iv: b64ToBytes(ivB64) },
    key,
    b64ToBytes(ctB64),
  );
  return new Uint8Array(plain);
}

async function createVaultBundle(passphrase) {
  const raw = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const recovery = generateRecoveryKey();
  const [privWrap, recoveryWrap, fingerprint] = await Promise.all([
    wrapVaultKey(passphrase, raw, PASSPHRASE_ITERATIONS),
    wrapVaultKey(normalizeRecoveryKey(recovery), raw, RECOVERY_ITERATIONS),
    fingerprintRaw(raw),
  ]);
  return { raw, recovery, privWrap, recoveryWrap, fingerprint };
}

async function sealMessage(key, input, files = []) {
  const [subjectCipher, bodyCipher] = await Promise.all([
    encryptText(key, input.subject || "(sans objet)"),
    encryptText(key, input.body || ""),
  ]);
  const attachments = [];
  for (const file of files.slice(0, MAX_ATTACHMENTS)) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const [dataCipher, metaCipher] = await Promise.all([
      encryptBytes(key, bytes),
      encryptText(key, JSON.stringify({ name: file.name, mime: file.type || "application/octet-stream" })),
    ]);
    attachments.push({
      id: uid(),
      byteSize: bytes.length,
      fileIv: dataCipher.iv,
      fileCt: bytesToB64(dataCipher.ct),
      nameIv: metaCipher.iv,
      nameCt: metaCipher.ct,
    });
  }
  return {
    id: uid(),
    threadId: input.threadId || uid(),
    folder: input.folder,
    from: input.from,
    fromName: input.fromName || "",
    to: input.to,
    subjectCipher,
    bodyCipher,
    read: !!input.read,
    starred: !!input.starred,
    kind: input.kind || "mail",
    queued: !!input.queued,
    at: now(),
    enc: 1,
    attachments,
  };
}

async function decryptMessage(key, message) {
  const [subject, body] = await Promise.all([
    decryptText(key, message.subjectCipher),
    decryptText(key, message.bodyCipher),
  ]);
  const files = [];
  for (const attachment of message.attachments || []) {
    try {
      const meta = JSON.parse(await decryptText(key, {
        iv: attachment.nameIv,
        ct: attachment.nameCt,
      }));
      files.push({
        id: attachment.id,
        name: meta.name || "Pièce jointe",
        mime: meta.mime || "application/octet-stream",
        size: attachment.byteSize,
      });
    } catch {
      files.push({
        id: attachment.id,
        name: "Pièce jointe",
        mime: "application/octet-stream",
        size: attachment.byteSize,
      });
    }
  }
  return { subject, body, files };
}

function App() {
  const [store, setStore] = useState(loadStore);
  const [gate, setGate] = useState("landing");
  const [vaultKey, setVaultKey] = useState(null);
  const [vaultRaw, setVaultRaw] = useState(null);
  const [recoveryRaw, setRecoveryRaw] = useState(null);
  const [plain, setPlain] = useState({});
  const [folder, setFolder] = useState("inbox");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState(null);
  const [compose, setCompose] = useState(false);
  const [composeDraft, setComposeDraft] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("compte");
  const [toast, setToast] = useState("");
  const profileRef = useRef(null);
  const toastTimer = useRef(null);
  const storeRef = useRef(store);

  const account = store.account;
  const vault = store.vault;

  const showToast = useCallback((text) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3800);
  }, []);

  const updateStore = useCallback((updater) => {
    const next = updater(storeRef.current);
    try {
      saveStore(next);
    } catch {
      showToast("Stockage local plein — réduisez les pièces jointes.");
      return false;
    }
    storeRef.current = next;
    setStore(next);
    return true;
  }, [showToast]);

  const openRawVault = useCallback(async (raw) => {
    const key = await importVaultKey(raw);
    setVaultRaw(raw);
    setVaultKey(key);
  }, []);

  useEffect(() => {
    if (!vaultKey) return undefined;
    let cancelled = false;
    void (async () => {
      const next = {};
      for (const message of store.messages) {
        try {
          next[message.id] = await decryptMessage(vaultKey, message);
        } catch {
          next[message.id] = { subject: "Illisible", body: "", files: [] };
        }
      }
      if (!cancelled) setPlain(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [store.messages, vaultKey]);

  useEffect(() => {
    if (!profileOpen) return undefined;
    const close = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    const esc = (event) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [profileOpen]);

  const createAccount = useCallback((profile) => {
    const saved = updateStore(() => ({
      account: {
        email: `${profile.address}@${MAIL_DOMAIN}`,
        address: profile.address,
        displayName: profile.displayName,
        phone: profile.phone,
        birthdate: profile.birthdate,
        recoveryEmail: profile.recoveryEmail,
        avatar: "",
        signature: "",
        status: "active",
        createdAt: now(),
      },
      vault: null,
      messages: [],
    }));
    if (saved) setGate("landing");
  }, [updateStore]);

  const finishVault = useCallback(async (bundle) => {
    const key = await importVaultKey(bundle.raw);
    const welcomeBody = `Votre boîte ${account.email} est active sur cet appareil.\n\nCette version est embarquée dans l'application : elle s'ouvre sans connexion. Les messages écrits vers d'autres adresses seront conservés dans Envoyés jusqu'à l'ajout d'une vraie synchronisation réseau.\n\n— L'équipe Ayeba`;
    const guideBody = "La phrase secrète et la clé de récupération déverrouillent uniquement cette copie locale. Si vous perdez les deux, Ayeba ne peut pas régénérer les messages déjà chiffrés sur ce téléphone.";
    const welcome = await sealMessage(key, {
      folder: "inbox",
      from: `equipe@${MAIL_DOMAIN}`,
      fromName: "Équipe Ayeba",
      to: [account.email],
      subject: "Bienvenue sur Ayeba Mail",
      body: welcomeBody,
      kind: "system",
    });
    const guide = await sealMessage(key, {
      folder: "inbox",
      from: `securite@${MAIL_DOMAIN}`,
      fromName: "Ayeba Mail — Sécurité",
      to: [account.email],
      subject: "Votre coffre local est chiffré",
      body: guideBody,
      kind: "system",
      read: false,
    });
    const saved = updateStore((prev) => ({
      ...prev,
      vault: {
        privWrap: bundle.privWrap,
        recoveryWrap: bundle.recoveryWrap,
        fingerprint: bundle.fingerprint,
      },
      messages: [guide, welcome, ...prev.messages],
    }));
    if (!saved) return;
    setVaultRaw(bundle.raw);
    setVaultKey(key);
    setPlain((prev) => ({
      ...prev,
      [welcome.id]: { subject: "Bienvenue sur Ayeba Mail", body: welcomeBody, files: [] },
      [guide.id]: { subject: "Votre coffre local est chiffré", body: guideBody, files: [] },
    }));
  }, [account, updateStore]);

  const unlockVault = useCallback(async (secret, mode) => {
    const wrap = mode === "recovery" ? vault.recoveryWrap : vault.privWrap;
    const normalized = mode === "recovery" ? normalizeRecoveryKey(secret) : secret;
    const raw = await unwrapVaultKey(normalized, wrap);
    if (mode === "recovery") {
      setRecoveryRaw(raw);
      return "recovery";
    }
    await openRawVault(raw);
    return "open";
  }, [openRawVault, vault]);

  const replaceAfterRecovery = useCallback(async (nextPass) => {
    if (!recoveryRaw) return;
    const privWrap = await wrapVaultKey(nextPass, recoveryRaw, PASSPHRASE_ITERATIONS);
    updateStore((prev) => ({
      ...prev,
      vault: { ...prev.vault, privWrap },
    }));
    await openRawVault(recoveryRaw);
    setRecoveryRaw(null);
  }, [openRawVault, recoveryRaw, updateStore]);

  const changePassphrase = useCallback(async (current, next) => {
    await unwrapVaultKey(current, vault.privWrap);
    const privWrap = await wrapVaultKey(next, vaultRaw, PASSPHRASE_ITERATIONS);
    updateStore((prev) => ({
      ...prev,
      vault: { ...prev.vault, privWrap },
    }));
  }, [updateStore, vault, vaultRaw]);

  const renewRecovery = useCallback(async () => {
    const recovery = generateRecoveryKey();
    const recoveryWrap = await wrapVaultKey(normalizeRecoveryKey(recovery), vaultRaw, RECOVERY_ITERATIONS);
    updateStore((prev) => ({
      ...prev,
      vault: { ...prev.vault, recoveryWrap },
    }));
    return recovery;
  }, [updateStore, vaultRaw]);

  const lockVault = useCallback(() => {
    if (vaultRaw) vaultRaw.fill(0);
    if (recoveryRaw) recoveryRaw.fill(0);
    setVaultRaw(null);
    setRecoveryRaw(null);
    setVaultKey(null);
    setPlain({});
    setOpenId(null);
    setCompose(false);
    setComposeDraft(null);
    setSettingsOpen(false);
    setProfileOpen(false);
  }, [recoveryRaw, vaultRaw]);

  const patchMessage = useCallback((id, patch) => {
    updateStore((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }, [updateStore]);

  const deleteMessage = useCallback((id) => {
    const message = store.messages.find((m) => m.id === id);
    updateStore((prev) => ({
      ...prev,
      messages: message?.folder === "trash"
        ? prev.messages.filter((m) => m.id !== id)
        : prev.messages.map((m) => (m.id === id ? { ...m, folder: "trash" } : m)),
    }));
    setOpenId(null);
    showToast(message?.folder === "trash" ? "Message supprimé définitivement." : "Message déplacé vers la corbeille.");
  }, [showToast, store.messages, updateStore]);

  const deliverLocal = useCallback(async ({ toRaw, subject, body, files, externalAck, draft, draftId }) => {
    const recipients = [...new Set(String(toRaw || "")
      .split(/[,;\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean))];
    if (!draft && !recipients.length) return { error: "Ajoutez un destinataire." };
    if (recipients.length > 20) return { error: "Trop de destinataires." };
    const invalid = recipients.find((addr) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr));
    if (invalid) return { error: `Adresse invalide : ${invalid}` };
    const hasExternal = recipients.some((addr) => !addr.endsWith(`@${MAIL_DOMAIN}`));
    if (!draft && hasExternal && !externalAck) {
      return { error: "Cochez la confirmation : ce message quitte le coffre quand il sera synchronisé." };
    }

    const text = account.signature && body ? `${body}\n\n—\n${account.signature}` : body;
    const subjectText = String(subject || "").trim() || "(sans objet)";
    const queued = recipients.some((addr) => addr !== account.email);
    const sent = await sealMessage(vaultKey, {
      folder: draft ? "drafts" : "sent",
      from: account.email,
      fromName: account.displayName || account.address,
      to: recipients,
      subject: subjectText,
      body: text,
      kind: "mail",
      read: true,
      queued,
    }, files);

    const copies = [sent];
    let inbox = null;
    if (!draft && recipients.includes(account.email)) {
      inbox = await sealMessage(vaultKey, {
        threadId: sent.threadId,
        folder: "inbox",
        from: account.email,
        fromName: account.displayName || account.address,
        to: recipients,
        subject: subjectText,
        body: text,
        kind: "mail",
        read: false,
        queued: false,
      }, files);
      copies.push(inbox);
    }

    const saved = updateStore((prev) => ({
      ...prev,
      messages: [
        ...copies,
        ...prev.messages.filter((m) => m.id !== draftId),
      ],
    }));
    if (!saved) return { error: "Stockage local plein — pièces jointes trop lourdes." };
    const sentFiles = await Promise.all((sent.attachments || []).map(async (a) => {
      const meta = JSON.parse(await decryptText(vaultKey, { iv: a.nameIv, ct: a.nameCt }));
      return { id: a.id, name: meta.name, mime: meta.mime, size: a.byteSize };
    }));
    setPlain((prev) => {
      const next = { ...prev, [sent.id]: { subject: subjectText, body: text, files: sentFiles } };
      if (inbox) next[inbox.id] = { subject: subjectText, body: text, files: sentFiles };
      return next;
    });
    return {
      ok: true,
      toast: draft
        ? "Brouillon chiffré enregistré."
        : queued
          ? "Message enregistré dans Envoyés — la remise nécessite une connexion."
          : "Message remis dans votre boîte locale.",
    };
  }, [account, updateStore, vaultKey]);

  const saveAccount = useCallback((patch) => {
    const name = String(patch.displayName || "").replace(/\s+/g, " ").trim();
    if (name.length < 2 || name.length > 60 || /[<>@]/.test(name)) {
      showToast("Nom affiché invalide (2–60 caractères, sans @ ni < >).");
      return false;
    }
    updateStore((prev) => ({
      ...prev,
      account: { ...prev.account, displayName: name, signature: patch.signature || "", avatar: patch.avatar || "" },
    }));
    showToast("Compte mis à jour.");
    return true;
  }, [showToast, updateStore]);

  const openMessage = useCallback((id) => {
    setOpenId(id);
    const message = store.messages.find((m) => m.id === id);
    if (message && !message.read) patchMessage(id, { read: true });
  }, [patchMessage, store.messages]);

  const downloadFile = useCallback(async (file) => {
    const message = store.messages.find((m) => m.id === openId);
    const attachment = message?.attachments?.find((a) => a.id === file.id);
    if (!attachment) return;
    try {
      const bytes = await decryptBytes(vaultKey, attachment.fileIv, attachment.fileCt);
      const copy = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(copy).set(bytes);
      const blob = new Blob([copy], { type: file.mime || "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name || "piece-jointe";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Téléchargement impossible.");
    }
  }, [openId, showToast, store.messages, vaultKey]);

  if (!globalThis.crypto?.subtle) {
    return (
      <div className="mail-root">
        <div className="mail-loading">AYEBA MAIL — WEBCRYPTO REQUIS</div>
      </div>
    );
  }

  if (!account) {
    if (gate === "signup") {
      return <SignupFlow onDone={createAccount} onBack={() => setGate("landing")} />;
    }
    if (gate === "signin") {
      return <SigninFlow onSignup={() => setGate("signup")} onBack={() => setGate("landing")} />;
    }
    return <Landing onSignup={() => setGate("signup")} onSignin={() => setGate("signin")} />;
  }

  if (!vault) {
    return <VaultCreate onReady={finishVault} />;
  }

  if (!vaultKey) {
    return (
      <VaultUnlock
        vault={vault}
        recovered={!!recoveryRaw}
        onUnlock={unlockVault}
        onReset={replaceAfterRecovery}
      />
    );
  }

  const open = store.messages.find((m) => m.id === openId) || null;
  const openPlain = open ? plain[open.id] : null;
  const unread = store.messages.filter((m) => m.folder === "inbox" && !m.read).length;
  const needle = q.trim().toLowerCase();
  const visible = store.messages
    .filter((m) => (folder === "starred" ? m.starred && m.folder !== "trash" : m.folder === folder))
    .filter((m) => {
      if (!needle) return true;
      const p = plain[m.id];
      if (!p) return false;
      const meta = `${m.from} ${m.fromName} ${m.to.join(" ")}`.toLowerCase();
      return p.subject.toLowerCase().includes(needle) || p.body.toLowerCase().includes(needle) || meta.includes(needle);
    });

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
                : { background: `linear-gradient(135deg, hsl(${hueFrom(account.email)} 62% 42%), hsl(${(hueFrom(account.email) + 40) % 360} 70% 30%))` }
            }
          >
            {account.avatar ? <img src={account.avatar} alt="" width={32} height={32} style={{ objectFit: "cover" }} /> : (account.displayName || account.address)[0].toUpperCase()}
          </button>
          {profileOpen && (
            <div className="mail-account-menu" role="menu">
              <div className="mail-account-head">
                <div
                  className="mail-account-avatar"
                  style={
                    account.avatar
                      ? { padding: 0, overflow: "hidden" }
                      : { background: `linear-gradient(135deg, hsl(${hueFrom(account.email)} 62% 42%), hsl(${(hueFrom(account.email) + 40) % 360} 70% 30%))` }
                  }
                >
                  {account.avatar ? <img src={account.avatar} alt="" width={52} height={52} style={{ objectFit: "cover" }} /> : (account.displayName || account.address)[0].toUpperCase()}
                </div>
                <div className="mail-account-id">
                  <strong>{account.displayName || account.address}</strong>
                  <span>{account.email}</span>
                  <em className="mail-account-badge">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.4" stroke="currentColor"/><path d="M3.8 6.1l1.5 1.5 2.9-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    Boîte locale vérifiée
                  </em>
                </div>
              </div>
              <div className="mail-account-meta">
                <span>Coffre local chiffré</span>
                <span>Membre depuis {new Date(account.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
              </div>
              <button
                className="mail-account-signout"
                style={{ marginBottom: 6 }}
                onClick={() => {
                  setProfileOpen(false);
                  setSettingsTab("compte");
                  setSettingsOpen(true);
                }}
              >
                Gérer le compte
              </button>
              <button className="mail-account-signout" onClick={lockVault}>
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="mail-body">
        <nav className="mail-rail">
          <button className="mail-compose-btn" onClick={() => { setComposeDraft(null); setCompose(true); }}>
            <span className="lbl">Nouveau message</span>
            <span className="mail-compose-icon">✎</span>
          </button>
          {FOLDERS.map((f) => (
            <button
              key={f.id}
              className={`mail-folder ${folder === f.id ? "active" : ""}`}
              onClick={() => { setFolder(f.id); setOpenId(null); }}
            >
              <span>{f.icon}</span>
              <span className="lbl">{f.label}</span>
              {f.id === "inbox" && unread > 0 && <span className="count">{unread}</span>}
            </button>
          ))}
          <div className="mail-rail-note">
            <b>COFFRE LOCAL</b>
            <br />
            BOÎTE CHIFFRÉE SUR APPAREIL
            <br />
            FONCTIONNE SANS RÉSEAU
          </div>
        </nav>

        <section className="mail-list">
          <div className="mail-list-head">
            <span className="mail-kicker">{FOLDERS.find((f) => f.id === folder)?.label.toUpperCase()}</span>
            <span className="mail-kicker" style={{ color: "var(--faint)" }}>{visible.length}</span>
          </div>
          {visible.map((m) => {
            const p = plain[m.id];
            return (
              <button
                key={m.id}
                className={`mail-item ${!m.read ? "unread" : ""} ${open?.id === m.id ? "active" : ""}`}
                onClick={() => openMessage(m.id)}
              >
                <div className="mail-item-top">
                  {!m.read && <i className="dot" />}
                  <span className="mail-item-from">{m.fromName || m.from}</span>
                  {m.enc === 1 && <span className="badge system">COFFRE</span>}
                  {m.queued && <span className="badge bounce">LOCAL</span>}
                  {m.kind === "bounce" && <span className="badge bounce">ÉCHEC</span>}
                  {m.kind === "system" && <span className="badge system">AYEBA</span>}
                  {(m.attachments?.length || 0) > 0 && <span className="badge system">PJ</span>}
                  {m.starred && <span className="star">★</span>}
                  <span className="mail-item-time">{fmtTime(m.at)}</span>
                </div>
                <div className="mail-item-subject">{p?.subject || "Message chiffré…"}</div>
                <div className="mail-item-snippet">
                  {p?.body?.replace(/\s+/g, " ").slice(0, 140) || "Chiffré sur cet appareil"}
                </div>
              </button>
            );
          })}
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
              <h1>{openPlain?.subject || "Message chiffré…"}</h1>
              <p className="mail-seal">
                Déchiffré sur cet appareil. Le contenu stocké localement est chiffré avec votre coffre.
              </p>
              <div className="mail-reader-meta">
                <div className="from">
                  {open.fromName || open.from}
                  <span>{open.from}</span>
                </div>
                <div className="to">à {open.to.join(", ") || "—"}</div>
                <span className="when">{fmtFull(open.at)}</span>
                <div className="mail-reader-actions">
                  {open.folder === "drafts" && (
                    <button
                      className="mail-btn"
                      onClick={() => {
                        setComposeDraft({ id: open.id, to: open.to.join(", "), subject: openPlain?.subject || "", body: openPlain?.body || "" });
                        setCompose(true);
                      }}
                    >
                      Modifier
                    </button>
                  )}
                  <button className="mail-btn" onClick={() => patchMessage(open.id, { starred: !open.starred })}>
                    {open.starred ? "★ Suivi" : "☆ Suivre"}
                  </button>
                  <button className="mail-btn" onClick={() => { patchMessage(open.id, { read: false }); setOpenId(null); }}>
                    Non lu
                  </button>
                  <button className="mail-btn" onClick={() => { patchMessage(open.id, { folder: "archive" }); setOpenId(null); }}>
                    Archiver
                  </button>
                  <button className="mail-btn danger" onClick={() => deleteMessage(open.id)}>
                    Supprimer
                  </button>
                </div>
              </div>
              <div className="mail-reader-body">{openPlain?.body || "Déchiffrement…"}</div>
              {(openPlain?.files?.length || 0) > 0 && (
                <div className="mail-files">
                  {openPlain.files.map((f) => (
                    <button key={f.id} className="mail-file" onClick={() => void downloadFile(f)}>
                      <b>{f.name}</b>
                      <span>{Math.max(1, Math.round(f.size / 1024))} Ko · déchiffrer</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="mail-translate">
                <div className="mail-translate-bar">
                  <button className="mail-btn link" onClick={() => showToast("Traduction indisponible hors ligne.")}>
                    Traduire
                  </button>
                  <span className="mail-translate-note">La traduction demandera une connexion.</span>
                  <select defaultValue="fr">
                    {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {compose && (
        <ComposePanel
          self={account.email}
          initial={composeDraft}
          onClose={() => { setCompose(false); setComposeDraft(null); }}
          onSend={deliverLocal}
          onToast={showToast}
        />
      )}
      {settingsOpen && (
        <SettingsPanel
          account={account}
          tab={settingsTab}
          setTab={setSettingsTab}
          fingerprint={vault.fingerprint}
          onClose={() => setSettingsOpen(false)}
          onSave={saveAccount}
          onChangePass={changePassphrase}
          onRenewRecovery={renewRecovery}
          onLock={lockVault}
          onToast={showToast}
        />
      )}
      {toast && <div className="mail-toast">{toast}</div>}
    </div>
  );
}

function Landing({ onSignup, onSignin }) {
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
            Une boîte <b>@ayeba.app</b> complète, embarquée dans l’application.
            Elle s’ouvre sans connexion, chiffre vos messages sur l’appareil et
            garde exactement le design Ayeba.
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
          <span className="mail-kicker">HORS LIGNE · MÊME DESIGN</span>
          <p>
            Ayeba Mail offline n’attend pas ayeba.app pour démarrer. La rédaction,
            la lecture et les réglages restent disponibles ; la remise réseau sera
            ajoutée comme synchronisation séparée.
          </p>
        </section>
      </div>
    </div>
  );
}

function SigninFlow({ onSignup, onBack }) {
  return (
    <div className="mail-root">
      <div className="mail-gate">
        <div className="mail-gate-panel">
          <span className="mail-kicker">AYEBA MAIL — CONNEXION</span>
          <h2>Aucune boîte locale</h2>
          <p className="sub">
            Cet appareil ne contient pas encore de compte offline. Créez votre
            adresse : la boîte et le coffre seront stockés chiffrés ici.
          </p>
          <button className="mail-cta" onClick={onSignup}>Créer mon adresse</button>
          <button className="mail-btn link" style={{ marginTop: 14 }} onClick={onBack}>
            ← Retour
          </button>
        </div>
      </div>
    </div>
  );
}

function SignupFlow({ onDone, onBack }) {
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState("");
  const [avail, setAvail] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");

  const checkAddress = (value) => {
    const clean = value.replace(/[^a-z0-9._-]/gi, "").toLowerCase();
    setAddress(clean);
    if (clean.length < 3) return setAvail(null);
    const check = validateAddress(clean);
    setAvail(check.ok
      ? { ok: true, msg: `${clean}@${MAIL_DOMAIN} — disponible` }
      : { ok: false, msg: check.reason });
  };

  const create = () => {
    setErr("");
    const check = validateAddress(address);
    if (!check.ok) return setErr(check.reason);
    const name = displayName.replace(/\s+/g, " ").trim();
    if (name.length < 2 || name.length > 60 || /[<>@]/.test(name)) {
      return setErr("Nom complet invalide (2–60 caractères).");
    }
    const born = new Date(`${birthdate}T00:00:00Z`);
    const age = (Date.now() - born.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (Number.isNaN(born.getTime()) || age < 13 || age > 120) {
      return setErr("Vous devez avoir au moins 13 ans.");
    }
    const normalized = normalizePhone(phone);
    if (!normalized) return setErr("Numéro de téléphone invalide.");
    if (recoveryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail.trim())) {
      return setErr("Adresse de récupération invalide.");
    }
    onDone({
      address,
      displayName: name,
      birthdate,
      phone: normalized,
      recoveryEmail: recoveryEmail.trim().toLowerCase(),
    });
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
                  <input value={address} onChange={(e) => checkAddress(e.target.value)} placeholder="benjaminoussama" autoFocus />
                  <span className="suffix">@{MAIL_DOMAIN}</span>
                </div>
                {avail && <div className={`mail-avail ${avail.ok ? "ok" : "ko"}`}>{avail.msg}</div>}
              </div>
              <button className="mail-cta" disabled={!avail?.ok} onClick={() => setStep(2)}>
                Continuer
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Votre identité</h2>
              <p className="sub">
                Comme toute messagerie sérieuse : nom complet, âge (13 ans
                minimum) et téléphone — conservés dans la boîte locale de{" "}
                <b>{address}@{MAIL_DOMAIN}</b>.
              </p>
              {err && <div className="mail-err">{err}</div>}
              <div className="mail-field">
                <label>Nom complet</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Benjamin Oussama" autoFocus />
              </div>
              <div className="mail-field">
                <label>Date de naissance</label>
                <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} max={MAX_BIRTHDATE} />
              </div>
              <div className="mail-field">
                <label>Numéro de téléphone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243 9XX XXX XXX" inputMode="tel" />
              </div>
              <div className="mail-field">
                <label>Email de récupération (optionnel)</label>
                <input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="autre@exemple.com" />
              </div>
              <button className="mail-cta" disabled={displayName.trim().length < 2 || !birthdate || phone.length < 8} onClick={() => setStep(3)}>
                Continuer
              </button>
              <button className="mail-btn link" style={{ marginTop: 12 }} onClick={() => setStep(1)}>
                ← Changer d’adresse
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <h2>Créer la boîte locale</h2>
              <p className="sub">Aucun SMS n’est nécessaire : tout reste sur cet appareil.</p>
              <div className="mail-dev-code">
                MODE HORS LIGNE — vérification SMS désactivée pour cette version.
              </div>
              {err && <div className="mail-err">{err}</div>}
              <button className="mail-cta" onClick={create}>
                Créer mon adresse
              </button>
              <button className="mail-btn link" style={{ marginTop: 12 }} onClick={() => setStep(2)}>
                ← Modifier l’identité
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

function VaultCreate({ onReady }) {
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [recovery, setRecovery] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(null);

  const create = async () => {
    setErr("");
    const problem = passphraseError(pass);
    if (problem) return setErr(problem);
    if (pass !== confirm) return setErr("Les deux phrases ne correspondent pas.");
    setBusy("Dérivation de la clé — quelques secondes…");
    try {
      const bundle = await createVaultBundle(pass);
      setPending(bundle);
      setRecovery(bundle.recovery);
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
      await onReady(pending);
    } catch {
      setErr("Enregistrement impossible.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mail-root">
      <div className="mail-gate">
        <div className="mail-gate-panel" style={{ width: "min(480px, 100%)" }}>
          <span className="mail-kicker">COFFRE LOCAL CHIFFRÉ</span>
          {!recovery ? (
            <>
              <h2>Protégez la boîte</h2>
              <p className="sub">
                Cette phrase ne part jamais de l’appareil. Elle déverrouille vos
                messages offline. Si vous l’oubliez, seule la clé de récupération
                pourra ouvrir le coffre.
              </p>
              {err && <div className="mail-err">{err}</div>}
              <div className="mail-field">
                <label>Phrase secrète</label>
                <input type="password" value={pass} autoComplete="new-password" onChange={(e) => setPass(e.target.value)} placeholder="Une phrase d’au moins 12 caractères" />
              </div>
              <div className="mail-field">
                <label>Confirmation</label>
                <input type="password" value={confirm} autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)} />
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

function VaultUnlock({ vault, recovered, onUnlock, onReset }) {
  const [mode, setMode] = useState("passphrase");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [nextPass, setNextPass] = useState("");
  const [nextConfirm, setNextConfirm] = useState("");

  const open = async () => {
    setErr("");
    setBusy(mode === "passphrase" ? "Vérification de la phrase…" : "Vérification de la clé…");
    try {
      await onUnlock(secret, mode);
      setSecret("");
    } catch {
      setErr(mode === "passphrase" ? "Phrase secrète incorrecte." : "Clé de récupération incorrecte.");
    } finally {
      setBusy("");
    }
  };

  const replace = async () => {
    const problem = passphraseError(nextPass);
    if (problem) return setErr(problem);
    if (nextPass !== nextConfirm) return setErr("Les deux phrases ne correspondent pas.");
    setBusy("Nouvelle phrase…");
    setErr("");
    try {
      await onReset(nextPass);
    } catch {
      setErr("Mise à jour impossible.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mail-root">
      <div className="mail-gate">
        <div className="mail-gate-panel">
          <span className="mail-kicker">COFFRE VERROUILLÉ</span>
          {recovered ? (
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

function SecurityPane({ fingerprint, onChangePass, onRenewRecovery, onLock, onToast }) {
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
      await onChangePass(current, next);
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
      setFreshRecovery(await onRenewRecovery());
    } catch {
      onToast("Renouvellement impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="mail-sec-lead">
        Cette version conserve la boîte sur l’appareil. Le sujet, le texte et les
        pièces jointes sont chiffrés ; les adresses, dates et dossiers restent
        visibles pour permettre l’affichage.
      </p>
      <label className="mail-settings-label">Empreinte</label>
      <p className="mail-fp">{fingerprint}</p>

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

function SettingsPanel({ account, tab, setTab, fingerprint, onClose, onSave, onChangePass, onRenewRecovery, onLock, onToast }) {
  const [name, setName] = useState(account.displayName);
  const [signature, setSignature] = useState(account.signature);
  const [avatar, setAvatar] = useState(account.avatar);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const pickAvatar = (file) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return onToast("Format non supporté — PNG, JPEG ou WebP.");
    if (file.size > 4_000_000) return onToast("Image trop lourde — 4 Mo max avant compression.");
    const img = new Image();
    img.onload = () => {
      const size = 128;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      setAvatar(canvas.toDataURL("image/jpeg", 0.82));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (onSave({ displayName: name, signature, avatar })) onClose();
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
          <SecurityPane
            fingerprint={fingerprint}
            onChangePass={onChangePass}
            onRenewRecovery={onRenewRecovery}
            onLock={onLock}
            onToast={onToast}
          />
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
                    : { background: `linear-gradient(135deg, hsl(${hueFrom(account.email)} 62% 42%), hsl(${(hueFrom(account.email) + 40) % 360} 70% 30%))` }
                }
              >
                {avatar ? <img src={avatar} alt="" width={72} height={72} style={{ objectFit: "cover" }} /> : (name || account.address)[0].toUpperCase()}
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
                  Photo visible dans cette boîte locale. Redimensionnée à 128 px et stockée sur l’appareil.
                </p>
                {avatar && (
                  <button className="mail-btn" style={{ marginTop: 6, fontSize: 12 }} onClick={() => setAvatar("")}>
                    Retirer la photo
                  </button>
                )}
              </div>
            </div>

            <label className="mail-settings-label">Nom affiché</label>
            <input className="mail-settings-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />

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
              <span>Boîte locale</span>
              <span>Coffre chiffré</span>
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

function ComposePanel({ self, initial, onClose, onSend, onToast }) {
  const [to, setTo] = useState(initial?.to || "");
  const [subject, setSubject] = useState(initial?.subject || "");
  const [body, setBody] = useState(initial?.body || "");
  const [files, setFiles] = useState([]);
  const [externalAck, setExternalAck] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);
  const leavesVault = to.split(/[,;\s]+/).some((t) => {
    const e = t.trim().toLowerCase();
    return e.includes("@") && !e.endsWith(`@${MAIL_DOMAIN}`);
  });

  const addFiles = (list) => {
    if (!list) return;
    const next = [...files];
    for (const file of list) {
      if (next.length >= MAX_ATTACHMENTS) {
        setErr("3 pièces jointes maximum.");
        break;
      }
      if (file.size > MAX_FILE_BYTES) {
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
      return setErr("Cochez la confirmation : ce message quitte le coffre à la synchronisation.");
    }
    setSending(true);
    try {
      const result = await onSend({
        toRaw: to,
        subject,
        body,
        files,
        externalAck,
        draft,
        draftId: initial?.id,
      });
      if (result.error) return setErr(result.error);
      onToast(result.toast || "Message enregistré.");
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mail-compose">
      <div className="mail-compose-head">
        <span className="mail-kicker">NOUVEAU MESSAGE — COFFRE LOCAL — {self}</span>
        <button className="mail-btn" onClick={onClose}>✕</button>
      </div>
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder={`À — prenom@${MAIL_DOMAIN}`} />
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
          <span>Cette adresse est hors Ayeba. Le message quittera le coffre quand une connexion sera disponible.</span>
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

createRoot(document.getElementById("root")).render(<App />);
