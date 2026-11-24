const { dialog } = require("electron");
const { state } = require("./state");
const { readSettings, writeSettings } = require("./store");

// Permissions « sensibles » : « pas encore décidé » doit rester « pas
// accordé » dans permissions.query / Notification.permission — sinon un site
// pourrait déclencher l'action sans jamais passer par le prompt (le check
// Electron est binaire : impossible d'exprimer « demander » comme Chrome).
// Pour les API inoffensives (fullscreen, pointer-lock…), on évite le faux
// « denied » qui fait croire aux sites que la permission est bloquée.
const CHECK_GATED_SENSITIVE = new Set([
  "media",
  "geolocation",
  "notifications",
  "clipboard-read",
  "clipboard-sanitized-write",
  "display-capture",
  "persistent-storage",
  "midi",
  "midi-sysex",
  "idle-detection",
  "window-management",
  "local-fonts",
  "serial",
  "hid",
  "usb",
  "bluetooth",
  "bluetoothScanning",
  "payment-handler",
  "accelerometer",
  "gyroscope",
  "magnetometer",
  "ambient-light-sensor",
  "background-sync",
  "accessibility-events",
  "speaker-selection",
  "storage-access",
  "top-level-storage-access",
  "file-system-access",
  "nfc",
]);

// Les consentements survivent au redémarrage (comme Chrome) — sinon
// l'utilisateur re-décide à chaque lancement et finit par tout refuser en
// masse, ou pire, tout autoriser pour que ça s'arrête.
let decisionsLoaded = false;
function ensureDecisionsLoaded() {
  if (decisionsLoaded) return;
  decisionsLoaded = true;
  const persisted = readSettings().permissions;
  for (const [key, value] of Object.entries(persisted)) {
    if (typeof value === "boolean") state.permissionDecisions.set(key, value);
  }
}

function rememberDecision(key, allowed) {
  state.permissionDecisions.set(key, allowed);
  const persisted = readSettings().permissions;
  writeSettings({ permissions: { ...persisted, [key]: allowed } });
}

// Effacement des données de site : les consentements repartent à zéro,
// comme « Paramètres des sites → effacer » dans Chrome.
function clearDecisions() {
  state.permissionDecisions.clear();
  writeSettings({ permissions: {} });
}

// Liste exploitable par l'UI : [{ key, origin, permission, allowed }].
function listDecisions() {
  ensureDecisionsLoaded();
  return [...state.permissionDecisions.entries()].map(([key, allowed]) => {
    const sep = key.lastIndexOf(":");
    return { key, origin: key.slice(0, sep), permission: key.slice(sep + 1), allowed };
  });
}

// Révoque une décision — le site re-prompt la prochaine fois.
function revokeDecision(key) {
  ensureDecisionsLoaded();
  state.permissionDecisions.delete(key);
  const persisted = { ...readSettings().permissions };
  delete persisted[key];
  writeSettings({ permissions: persisted });
  return listDecisions();
}

function bindPermissions(ses) {
  ensureDecisionsLoaded();
  ses.setPermissionRequestHandler(async (webContents, permission, callback, details) => {
    const requestingUrl = details?.requestingUrl || webContents.getURL();
    let origin;
    try {
      origin = new URL(requestingUrl).origin;
    } catch {
      callback(false);
      return;
    }
    if (!origin.startsWith("https://")) {
      callback(false);
      return;
    }
    const supported = new Set(["media", "geolocation", "notifications", "fullscreen"]);
    if (!supported.has(permission)) {
      callback(false);
      return;
    }
    const key = `${origin}:${permission}`;
    if (state.permissionDecisions.has(key)) {
      callback(state.permissionDecisions.get(key));
      return;
    }
    const result = await dialog.showMessageBox({
      type: "question",
      buttons: ["Refuser", "Autoriser"],
      defaultId: 0,
      cancelId: 0,
      title: "Autorisation du site",
      message: `${new URL(origin).hostname} demande l'accès à ${permission}.`,
    });
    const allowed = result.response === 1;
    rememberDecision(key, allowed);
    callback(allowed);
  });
  ses.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    const decided = state.permissionDecisions.get(`${requestingOrigin}:${permission}`);
    if (typeof decided === "boolean") return decided;
    return !CHECK_GATED_SENSITIVE.has(permission);
  });
}

module.exports = { bindPermissions, clearDecisions, listDecisions, revokeDecision };
