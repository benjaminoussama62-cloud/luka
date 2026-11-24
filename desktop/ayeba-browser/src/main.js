const { app, nativeTheme, dialog, session, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

// Must run before app ready — avoid cache lock / multi-instance GPU errors on Windows
app.setName("AYEBA");
app.setPath("userData", path.join(app.getPath("appData"), "AyebaBrowser"));

const { GPU_FLAG_FILE } = require("./main/paths");
const { log } = require("./main/log");

// GPU : accélération matérielle par défaut (vidéo/WebGL fluides). Le mode
// logiciel reste un filet de sécurité : écrit automatiquement après un crash
// du processus GPU (fichier gpu-safe-mode), ou forcé via AYEBA_GPU=0.
// AYEBA_GPU=1 réactive le matériel et supprime le drapeau.
let gpuDisabled = false;
if (process.platform === "win32") {
  app.setAppUserModelId("app.ayeba.browser");
  if (process.env.AYEBA_GPU === "1") {
    try {
      fs.rmSync(GPU_FLAG_FILE);
    } catch {}
  }
  if (process.env.AYEBA_GPU === "0" || fs.existsSync(GPU_FLAG_FILE)) {
    gpuDisabled = true;
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch("disable-gpu");
    app.commandLine.appendSwitch("disable-gpu-compositing");
  }
}

process.on("uncaughtException", (err) => {
  log(`uncaughtException: ${err?.stack || err}`);
  try {
    const desk = path.join(app.getPath("desktop"), "AYEBA-ERREUR.txt");
    fs.writeFileSync(
      desk,
      `AYEBA n'a pas pu démarrer.\n\n${err?.stack || err}\n\nJournal: ${require("./main/paths").LOG_FILE}\n`,
      "utf8",
    );
  } catch {}
  try {
    dialog.showErrorBox(
      "AYEBA — erreur au démarrage",
      `${err?.message || err}\n\nUn fichier AYEBA-ERREUR.txt a été créé sur le Bureau.`,
    );
  } catch {}
});

process.on("unhandledRejection", (reason) => {
  log(`unhandledRejection: ${reason?.stack || reason}`);
});

if (process.platform === "win32") {
  app.commandLine.appendSwitch("enable-transparent-visuals");
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  log("second instance blocked (AYEBA déjà lancé)");
  app.quit();
  process.exit(0);
}

nativeTheme.themeSource = "dark";

const { state } = require("./main/state");
const { ensureData } = require("./main/store");
const { applyPrivacyTo } = require("./main/privacy");
const { bindPermissions } = require("./main/permissions");
const { bindDownloads } = require("./main/downloads");
const { restoreExtensions } = require("./main/extensions");
const { setupUpdates } = require("./main/updater");
const { bindIpc } = require("./main/ipc");
const { createBrowserWindow } = require("./main/window");

function revealWindow(win) {
  if (!win || win.isDestroyed()) return;
  if (!win.isVisible()) win.show();
  win.focus();
}

let gpuCrashHandled = false;
function onGpuProcessGone(reason) {
  // Le GPU est réactivé par défaut : si le processus GPU meurt (pilote
  // défectueux, antivirus…), on bascule en mode logiciel pour le prochain
  // lancement puis on redémarre — l'utilisateur ne reste jamais sans fenêtre.
  if (gpuCrashHandled || gpuDisabled || process.platform !== "win32") return;
  gpuCrashHandled = true;
  log(`GPU crash (${reason}) → passage en mode logiciel au prochain lancement`);
  try {
    fs.writeFileSync(GPU_FLAG_FILE, `${reason} ${new Date().toISOString()}`);
  } catch {}
  app.relaunch();
  app.exit(0);
}

app.whenReady().then(() => {
  log(`ready v${app.getVersion()} userData=${app.getPath("userData")} gpu=${gpuDisabled ? "software" : "hardware"}`);
  ensureData();
  Menu.setApplicationMenu(null);
  applyPrivacyTo(session.defaultSession);
  void restoreExtensions();
  bindPermissions(session.defaultSession);
  app.on("gpu-process-crashed", (_e, killed) =>
    onGpuProcessGone(`gpu-process-crashed killed=${killed}`),
  );
  app.on("child-process-gone", (_e, details) => {
    if (details?.type === "GPU") onGpuProcessGone(`child-process-gone ${details?.reason}`);
  });
  bindIpc();
  setupUpdates();
  bindDownloads(session.defaultSession);

  app.on("second-instance", () => {
    log("second-instance → focus existing window");
    const first = [...state.windows][0];
    if (first?.win && !first.win.isDestroyed()) {
      if (first.win.isMinimized()) first.win.restore();
      revealWindow(first.win);
      return;
    }
    createBrowserWindow();
  });

  const created = createBrowserWindow();
  if (!created) log("createBrowserWindow returned null");

  app.on("activate", () => {
    if (![...state.windows].length) createBrowserWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
