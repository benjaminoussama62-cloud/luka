const { app, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const { state, pushAllChrome } = require("./state");
const { pushDownloadsSoon } = require("./downloads");
const { log } = require("./log");

// Mises à jour via GitHub Releases : electron-updater vérifie les sommes
// sha512 embarquées dans latest.yml, et Windows exige en plus que
// l'installeur soit signé Authenticode (le workflow browser-windows.yml
// applique le certificat CSC_*). La confiance repose donc sur deux ancres :
// l'intégrité du compte GitHub + la signature du binaire.
function setupUpdates() {
  if (!app.isPackaged) return;
  // Provider GitHub avec filtrage par tag "browser-v*" pour distinguer les
  // releases navigateur des releases mobile dans le même repo.
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "benjaminoussama62-cloud",
    repo: "luka",
    vPrefixedTagName: false,
  });
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("update-available", (info) => {
    state.updateState = { status: "downloading", version: info?.version || "", progress: 0 };
    pushAllChrome();
  });
  autoUpdater.on("download-progress", (p) => {
    state.updateState = { ...state.updateState, status: "downloading", progress: Math.round(p?.percent || 0) };
    pushDownloadsSoon();
  });
  autoUpdater.on("update-downloaded", async (info) => {
    state.updateState = { status: "ready", version: info?.version || state.updateState.version, progress: 100 };
    pushAllChrome();
    const result = await dialog.showMessageBox({
      type: "info",
      buttons: ["Redémarrer maintenant", "Plus tard"],
      defaultId: 0,
      cancelId: 1,
      title: "Mise à jour AYEBA disponible",
      message: `AYEBA ${state.updateState.version} est prête. Elle s'installera au prochain redémarrage.`,
    });
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
  autoUpdater.on("error", (error) => {
    state.updateState = { status: "idle", version: "", progress: 0 };
    log(`auto-update error: ${error?.message || error}`);
  });
  const checkUpdates = () =>
    autoUpdater.checkForUpdates().catch((error) => log(`auto-update check failed: ${error?.message || error}`));
  void checkUpdates();
  setInterval(checkUpdates, 6 * 60 * 60 * 1000).unref();
}

module.exports = { setupUpdates, autoUpdater };
