// État partagé mutable entre les modules du processus principal.
// Centralisé ici pour éviter les imports circulaires : tout module peut
// lire/écrire ces références sans dépendre de window.js ou main.js.
const state = {
  /** Fenêtres navigateur ouvertes (objets retournés par createBrowserWindow). */
  windows: new Set(),
  /** Téléchargements récents (Edge-like flyout). */
  downloadLog: [],
  /** État courant de la mise à jour automatique. */
  updateState: { status: "idle", version: "", progress: 0 },
  /** Décisions de permission consenties par origine (persistées dans settings). */
  permissionDecisions: new Map(),
  /** Cache de la clé de compte (email hashé) pour userFile(). */
  keyCache: { key: "invite", at: 0 },
  /** Migration des fichiers data/ hérités déjà tentée ? */
  migrated: false,
};

/** Pousse l'état navigateur vers toutes les vues chrome ouvertes. */
function pushAllChrome() {
  for (const w of state.windows) {
    if (w.pushChromeState) w.pushChromeState();
  }
}

module.exports = { state, pushAllChrome };
