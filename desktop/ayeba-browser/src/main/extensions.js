const fs = require("fs");
const { session } = require("electron");
const { readSettings, writeSettings } = require("./store");
const { log } = require("./log");

// ── Extensions Chromium réelles (session.loadExtension) ──
// allowFileAccess: false — une extension non empaquetée chargée par
// l'utilisateur n'a pas besoin de lire file:// ; ce drapeau était le plus
// permissif possible sans justification.
function extPublic() {
  return session.defaultSession.getAllExtensions().map((e) => ({
    id: e.id,
    name: e.name || e.id,
    version: e.version || "",
    path: e.path,
  }));
}

async function loadExtensionDir(dir) {
  const ext = await session.defaultSession.loadExtension(dir, { allowFileAccess: false });
  const s = readSettings();
  if (!s.extensions.includes(dir)) writeSettings({ extensions: [...s.extensions, dir] });
  return { id: ext.id, name: ext.name, version: ext.version, path: ext.path };
}

async function restoreExtensions() {
  for (const dir of readSettings().extensions) {
    try {
      if (fs.existsSync(dir)) await session.defaultSession.loadExtension(dir, { allowFileAccess: false });
    } catch (err) {
      log(`extension load failed ${dir}: ${err?.message || err}`);
    }
  }
}

module.exports = { extPublic, loadExtensionDir, restoreExtensions };
