const fs = require("fs");
const { LOG_FILE } = require("./paths");

// Rotation simple : au-delà de ~512 Ko, le journal courant devient
// ayeba.log.1 (un seul fichier d'archive — le disque ne grossit jamais).
const LOG_MAX_BYTES = 512 * 1024;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    try {
      if (fs.statSync(LOG_FILE).size > LOG_MAX_BYTES) {
        fs.renameSync(LOG_FILE, `${LOG_FILE}.1`);
      }
    } catch {}
    fs.appendFileSync(LOG_FILE, line);
  } catch {}
  if (process.env.AYEBA_DEBUG) console.error(line.trim());
}

// Le journal reste sur disque en clair : n'y écrire que l'origine des URL —
// jamais le chemin ni la query (une recherche ou un mail est une donnée
// privée). AYEBA_DEBUG réactive l'URL complète pour le débogage local.
function urlForLog(url) {
  if (process.env.AYEBA_DEBUG) return String(url);
  try {
    const u = new URL(String(url));
    return `${u.protocol}//${u.host}/…`;
  } catch {
    return "(url invalide)";
  }
}

module.exports = { log, urlForLog };
