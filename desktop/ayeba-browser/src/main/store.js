const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { app, session, safeStorage, net } = require("electron");
const { state, pushAllChrome } = require("./state");
const { DATA_DIR, SETTINGS_FILE, SESSION_FILE, USER_FILES, FETCH_TIMEOUT_MS } = require("./paths");
const { DEFAULT_ENGINE, isEngine } = require("../search-engines");

const DEFAULT_SETTINGS = {
  searchEngine: DEFAULT_ENGINE,
  extensions: [],
  doNotTrack: true,
  blockThirdPartyCookies: false,
  askSavePath: false,
  // Anti-pistage actif : requêtes vers les domaines de la blocklist annulées.
  blockTrackers: true,
  // HTTPS-First : les navigations http:// sont réécrites en https://
  // (repli automatique en http si le site ne sert pas TLS).
  httpsOnly: true,
  // Referer inter-sites réduit à l'origine — les pages ne révèlent plus
  // l'URL complète dont vient l'utilisateur.
  trimReferrer: true,
  // Rouvrir les onglets de la session précédente au lancement.
  restoreTabs: true,
  // Décisions de permission persistées : "origin:permission" → bool.
  permissions: {},
};

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
  }
}

// readSettings est appelé à chaque requête web (onBeforeRequest,
// onHeadersReceived) : le fichier ne peut pas être relu disque à chaque
// fois — cache mémoire invalidé uniquement par writeSettings.
let settingsCache = null;
function readSettings() {
  if (settingsCache) return settingsCache;
  const merged = { ...DEFAULT_SETTINGS, ...readJson(SETTINGS_FILE, {}) };
  const searchEngine = isEngine(merged.searchEngine) ? merged.searchEngine : DEFAULT_ENGINE;
  const extensions = Array.isArray(merged.extensions)
    ? merged.extensions.filter((p) => typeof p === "string" && p)
    : [];
  const permissions =
    merged.permissions && typeof merged.permissions === "object" && !Array.isArray(merged.permissions)
      ? merged.permissions
      : {};
  settingsCache = {
    searchEngine,
    extensions,
    doNotTrack: merged.doNotTrack !== false,
    blockThirdPartyCookies: !!merged.blockThirdPartyCookies,
    askSavePath: !!merged.askSavePath,
    blockTrackers: merged.blockTrackers !== false,
    httpsOnly: merged.httpsOnly !== false,
    trimReferrer: merged.trimReferrer !== false,
    restoreTabs: merged.restoreTabs !== false,
    permissions,
  };
  return settingsCache;
}

function writeSettings(patch) {
  const next = { ...readSettings(), ...patch };
  if (!isEngine(next.searchEngine)) next.searchEngine = DEFAULT_ENGINE;
  writeJson(SETTINGS_FILE, next);
  settingsCache = null;
  // require paresseux : privacy.js dépend de readSettings (cycle autrement).
  require("./privacy").applyPrivacy();
  pushAllChrome();
  return next;
}

// Onglets ouverts à la fermeture — restaurés au prochain lancement
// (jamais pour les fenêtres InPrivate, jamais de file:/data:/view-source:).
function readSessionTabs() {
  const data = readJson(SESSION_FILE, null);
  if (!data || !Array.isArray(data.tabs)) return null;
  const tabs = data.tabs.filter((u) => typeof u === "string" && /^https?:/i.test(u));
  if (!tabs.length) return null;
  const active = Math.min(Math.max(0, data.active | 0), tabs.length - 1);
  return { tabs, active };
}

function writeSessionTabs(tabs, active) {
  writeJson(SESSION_FILE, {
    tabs: tabs.filter((u) => typeof u === "string" && /^https?:/i.test(u)),
    active: active | 0,
    at: Date.now(),
  });
}

async function fetchSessionUser() {
  try {
    const jar = await session.defaultSession.cookies.get({
      url: "https://ayeba.app",
      name: "ayeba_session",
    });
    const token = jar[0]?.value;
    if (!token) return null;
    const res = await net.fetch("https://ayeba.app/api/auth/omega/session", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const data = await res.json();
    return data?.user || null;
  } catch {
    return null;
  }
}

async function accountKey() {
  if (Date.now() - state.keyCache.at < 10_000) return state.keyCache.key;
  const user = await fetchSessionUser();
  const email = String(user?.email || "").toLowerCase().trim();
  const key = email
    ? "u_" + crypto.createHash("sha256").update(email).digest("hex").slice(0, 16)
    : "invite";
  state.keyCache = { key, at: Date.now() };
  return key;
}

function emailToAccountKey(email) {
  const normalized = String(email || "").toLowerCase().trim();
  return normalized
    ? "u_" + crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16)
    : "invite";
}

// history/favorites/passwords sont rangés dans data/<clé-compte>/ ; un invité
// utilise data/invite/. La clé dérive de l'email du compte (hash local).
async function userFile(name, guest = false) {
  // En InPrivate, tout passe par l'espace « invite » : les données du compte
  // réel ne sont ni lues ni modifiées depuis une fenêtre privée.
  const key = guest ? "invite" : await accountKey();
  const dir = path.join(DATA_DIR, key);
  fs.mkdirSync(dir, { recursive: true });
  // Migration : les anciens fichiers à la racine de data/ rejoignent le
  // premier compte résolu (l'utilisateur actuel conserve son historique).
  if (!state.migrated && !guest) {
    state.migrated = true;
    for (const f of USER_FILES) {
      const legacy = path.join(DATA_DIR, f);
      const target = path.join(dir, f);
      try {
        if (fs.existsSync(legacy) && !fs.existsSync(target)) fs.renameSync(legacy, target);
      } catch {}
    }
  }
  return path.join(dir, name);
}

async function pushHistory(entry, guest = false) {
  const file = await userFile("history.json", guest);
  const list = readJson(file, []);
  list.unshift({ ...entry, at: Date.now() });
  writeJson(file, list.slice(0, 500));
}

// ── Coffre de mots de passe local (chiffré via safeStorage / DPAPI) ──
async function readVault() {
  return readJson(await userFile("passwords.json"), []);
}

async function writeVault(vault) {
  writeJson(await userFile("passwords.json"), vault.slice(0, 300));
}

async function vaultPublic() {
  const vault = await readVault();
  return vault.map(({ id, origin, username, at }) => ({ id, origin, username, at }));
}

function vaultDecrypt(entry) {
  try {
    if (!entry?.secret || !safeStorage.isEncryptionAvailable()) return "";
    return safeStorage.decryptString(Buffer.from(entry.secret, "base64"));
  } catch {
    return "";
  }
}

module.exports = {
  DEFAULT_SETTINGS,
  readJson,
  writeJson,
  ensureData,
  readSettings,
  writeSettings,
  readSessionTabs,
  writeSessionTabs,
  fetchSessionUser,
  accountKey,
  emailToAccountKey,
  userFile,
  pushHistory,
  readVault,
  writeVault,
  vaultPublic,
  vaultDecrypt,
  safeStorageAvailable: () => safeStorage.isEncryptionAvailable(),
  encryptString: (s) => safeStorage.encryptString(s),
  downloadsPath: () => app.getPath("downloads"),
};
