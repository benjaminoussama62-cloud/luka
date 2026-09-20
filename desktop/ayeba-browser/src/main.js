const {
  app,
  BaseWindow,
  WebContentsView,
  ipcMain,
  shell,
  session,
  Menu,
  dialog,
  nativeTheme,
  safeStorage,
  clipboard,
} = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

// Must run before app ready — avoid cache lock / multi-instance GPU errors on Windows
app.setName("AYEBA");
app.setPath("userData", path.join(app.getPath("appData"), "AyebaBrowser"));
if (process.platform === "win32") {
  app.setAppUserModelId("app.ayeba.browser");
  // 360 / anciens pilotes GPU : Electron peut mourir sans fenêtre — forcer le mode logiciel
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("disable-gpu-compositing");
}

const LOG_FILE = path.join(app.getPath("userData"), "ayeba.log");
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch {}
  if (process.env.AYEBA_DEBUG) console.error(line.trim());
}

process.on("uncaughtException", (err) => {
  log(`uncaughtException: ${err?.stack || err}`);
  try {
    const desk = path.join(app.getPath("desktop"), "AYEBA-ERREUR.txt");
    fs.writeFileSync(
      desk,
      `AYEBA n'a pas pu démarrer.\n\n${err?.stack || err}\n\nJournal: ${LOG_FILE}\n`,
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

const {
  DEFAULT_ENGINE,
  buildSearchUrl,
  normalizeOmni: normalizeOmniForEngine,
  engineList,
  isEngine,
} = require("./search-engines");

// Le nouvel onglet EST le vrai site — comme Yandex ouvre yandex.ru.
// La page locale newtab/ sert uniquement de repli hors-ligne.
const HOME_URL = "https://ayeba.app/";
const LOCAL_NTP_URL = pathToFileURL(path.join(__dirname, "..", "newtab", "index.html")).href;
const CHROME_URL = pathToFileURL(path.join(__dirname, "..", "chrome", "index.html")).href;
const RAIL_URL = pathToFileURL(path.join(__dirname, "..", "chrome", "rail.html")).href;
const DATA_DIR = path.join(app.getPath("userData"), "data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const FAV_FILE = path.join(DATA_DIR, "favorites.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const PASS_FILE = path.join(DATA_DIR, "passwords.json");

const CHROME_H = 96;
const RAIL_W = 52;

/** Téléchargements récents (Edge-like flyout). */
const downloadLog = [];

function pushAllChrome() {
  for (const state of windows) {
    if (state.pushChromeState) state.pushChromeState();
  }
}
const windows = new Set();
const permissionDecisions = new Map();

function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, "[]");
  if (!fs.existsSync(FAV_FILE)) fs.writeFileSync(FAV_FILE, "[]");
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ searchEngine: DEFAULT_ENGINE }, null, 2));
  }
}

function readSettings() {
  const raw = readJson(SETTINGS_FILE, { searchEngine: DEFAULT_ENGINE, extensions: [] });
  const searchEngine = isEngine(raw.searchEngine) ? raw.searchEngine : DEFAULT_ENGINE;
  const extensions = Array.isArray(raw.extensions)
    ? raw.extensions.filter((p) => typeof p === "string" && p)
    : [];
  return { searchEngine, extensions };
}

function writeSettings(patch) {
  const next = { ...readSettings(), ...patch };
  if (!isEngine(next.searchEngine)) next.searchEngine = DEFAULT_ENGINE;
  writeJson(SETTINGS_FILE, next);
  for (const state of windows) {
    if (state.pushChromeState) state.pushChromeState();
  }
  return next;
}

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

function pushHistory(entry) {
  const list = readJson(HISTORY_FILE, []);
  list.unshift({ ...entry, at: Date.now() });
  writeJson(HISTORY_FILE, list.slice(0, 500));
}

// ── Coffre de mots de passe local (chiffré via safeStorage / DPAPI) ──
function readVault() {
  return readJson(PASS_FILE, []);
}

function writeVault(vault) {
  writeJson(PASS_FILE, vault.slice(0, 300));
}

function vaultPublic() {
  return readVault().map(({ id, origin, username, at }) => ({ id, origin, username, at }));
}

function vaultDecrypt(entry) {
  try {
    if (!entry?.secret || !safeStorage.isEncryptionAvailable()) return "";
    return safeStorage.decryptString(Buffer.from(entry.secret, "base64"));
  } catch {
    return "";
  }
}

// ── Extensions Chromium réelles (session.loadExtension) ──
function extPublic() {
  return session.defaultSession.getAllExtensions().map((e) => ({
    id: e.id,
    name: e.name || e.id,
    version: e.version || "",
    path: e.path,
  }));
}

async function loadExtensionDir(dir) {
  const ext = await session.defaultSession.loadExtension(dir, { allowFileAccess: true });
  const s = readSettings();
  if (!s.extensions.includes(dir)) writeSettings({ extensions: [...s.extensions, dir] });
  return { id: ext.id, name: ext.name, version: ext.version, path: ext.path };
}

async function restoreExtensions() {
  for (const dir of readSettings().extensions) {
    try {
      if (fs.existsSync(dir)) await session.defaultSession.loadExtension(dir, { allowFileAccess: true });
    } catch (err) {
      log(`extension load failed ${dir}: ${err?.message || err}`);
    }
  }
}

function isNewTab(url = "") {
  if (url.startsWith("file:") && url.includes("/newtab/")) return true;
  // La racine d'ayeba.app = l'accueil : ne pas encombrer l'historique.
  return url === HOME_URL || url === "https://ayeba.app";
}

function canBack(wc) {
  if (!wc || wc.isDestroyed()) return false;
  try {
    return wc.navigationHistory?.canGoBack?.() ?? wc.canGoBack();
  } catch {
    return false;
  }
}

function canForward(wc) {
  if (!wc || wc.isDestroyed()) return false;
  try {
    return wc.navigationHistory?.canGoForward?.() ?? wc.canGoForward();
  } catch {
    return false;
  }
}

function normalizeOmni(input) {
  const raw = String(input || "").trim();
  if (!raw) return HOME_URL;
  const { searchEngine } = readSettings();
  const target = normalizeOmniForEngine(raw, searchEngine);
  return target || HOME_URL;
}

function revealWindow(win) {
  if (!win || win.isDestroyed()) return;
  if (!win.isVisible()) win.show();
  win.focus();
}

function createBrowserWindow(isPrivate = false) {
  ensureData();
  log(`createBrowserWindow execPath=${process.execPath} private=${isPrivate}`);

  let win;
  try {
    win = new BaseWindow({
      width: 1280,
      height: 840,
      minWidth: 720,
      minHeight: 480,
      backgroundColor: "#0a0c11",
      title: isPrivate ? "AYEBA — InPrivate" : "AYEBA",
      autoHideMenuBar: true,
      // Fenêtre sans cadre : onglets intégrés comme Yandex/Edge, boutons
      // réduire/agrandir/fermer dessinés par Windows via titleBarOverlay.
      frame: false,
      titleBarStyle: "hidden",
      titleBarOverlay: {
        color: "#0a0c11",
        symbolColor: "#e9ecf3",
        height: 40,
      },
      show: true,
      icon: path.join(__dirname, "..", "assets", "icon.ico"),
    });
  } catch (err) {
    log(`BaseWindow failed: ${err?.stack || err}`);
    dialog.showErrorBox(
      "AYEBA — impossible d’ouvrir la fenêtre",
      `${err?.message || err}\n\nJournal : ${LOG_FILE}`,
    );
    app.quit();
    return null;
  }

  const state = {
    win,
    chrome: null,
    tabs: [],
    activeId: null,
    nextId: 1,
    findOpen: false,
    isPrivate,
    overlayOpen: false,
  };

  const chrome = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "preload-chrome.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  state.chrome = chrome;
  chrome.setBackgroundColor("#0a0c11");
  win.contentView.addChildView(chrome);
  chrome.webContents.loadURL(CHROME_URL);

  // Rail vertical gauche (style Yandex) — vue dédiée pour ne pas bloquer
  // les clics : chaque vue ne couvre que sa propre zone rectangulaire.
  const rail = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "preload-chrome.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  state.rail = rail;
  rail.setBackgroundColor("#0a0c11");
  win.contentView.addChildView(rail);
  rail.webContents.loadURL(RAIL_URL);

  function raiseChrome() {
    if (win.isDestroyed() || chrome.webContents.isDestroyed()) return;
    try {
      win.contentView.removeChildView(chrome);
      win.contentView.addChildView(chrome);
    } catch {}
  }

  function layout() {
    const { width, height } = win.getContentBounds();
    // The chrome view is the topmost view: it must only cover the toolbar,
    // otherwise it swallows every click meant for the page below. It expands
    // to full height only while an overlay (menu, flyouts, findbar) is open.
    chrome.setBounds({ x: 0, y: 0, width, height: state.overlayOpen ? height : CHROME_H });
    if (state.rail && !state.rail.webContents.isDestroyed()) {
      state.rail.setBounds({ x: 0, y: CHROME_H, width: RAIL_W, height: Math.max(0, height - CHROME_H) });
    }
    for (const t of state.tabs) {
      t.view.setBounds({
        x: RAIL_W,
        y: CHROME_H,
        width: Math.max(0, width - RAIL_W),
        height: Math.max(0, height - CHROME_H),
      });
    }
    raiseChrome();
  }

  function emitChrome(channel, payload) {
    if (!chrome.webContents.isDestroyed()) {
      chrome.webContents.send(channel, payload);
    }
  }

  function tabSnapshot() {
    const sorted = [...state.tabs].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    return sorted.map((t) => ({
      id: t.id,
      title: t.title,
      url: t.url,
      favicon: t.favicon,
      loading: t.loading,
      pinned: !!t.pinned,
      active: t.id === state.activeId,
      canGoBack: canBack(t.view.webContents),
      canGoForward: canForward(t.view.webContents),
    }));
  }

  function pushChromeState() {
    const active = state.tabs.find((t) => t.id === state.activeId);
    const settings = readSettings();
    emitChrome("browser:state", {
      tabs: tabSnapshot(),
      activeId: state.activeId,
      url: active?.url || "",
      title: active?.title || "AYEBA",
      loading: !!active?.loading,
      isPrivate: !!state.isPrivate,
      canGoBack: active ? canBack(active.view.webContents) : false,
      canGoForward: active ? canForward(active.view.webContents) : false,
      zoomFactor: active && !active.view.webContents.isDestroyed() ? active.view.webContents.getZoomFactor() : 1,
      searchEngine: settings.searchEngine,
      searchEngines: engineList().map(({ id, name }) => ({ id, name })),
      downloads: downloadLog.slice(0, 12).map((d) => ({
        id: d.id,
        filename: d.filename,
        url: d.url,
        path: d.path,
        state: d.state,
        received: d.received,
        total: d.total,
        at: d.at,
      })),
    });
    if (state.rail && !state.rail.webContents.isDestroyed()) {
      state.rail.webContents.send("browser:state", { isPrivate: !!state.isPrivate });
    }
  }

  state.pushChromeState = pushChromeState;

  function showTab(id) {
    for (const t of state.tabs) {
      t.view.setVisible(t.id === id);
    }
    state.activeId = id;
    layout();
    pushChromeState();
  }

  function attachTabEvents(tab) {
    const wc = tab.view.webContents;

    wc.setWindowOpenHandler(({ url }) => {
      createTab(url, true);
      return { action: "deny" };
    });

    wc.on("page-title-updated", (_e, title) => {
      tab.title = title || "AYEBA";
      pushChromeState();
    });

    wc.on("page-favicon-updated", (_e, favicons) => {
      tab.favicon = favicons?.[0] || "";
      pushChromeState();
    });

    wc.on("did-start-loading", () => {
      tab.loading = true;
      pushChromeState();
    });

    wc.on("did-stop-loading", () => {
      tab.loading = false;
      tab.url = wc.getURL();
      tab.title = wc.getTitle() || tab.title;
      if (!state.isPrivate && !isNewTab(tab.url) && tab.url.startsWith("http")) {
        pushHistory({ title: tab.title, url: tab.url });
      }
      pushChromeState();
    });

    wc.on("did-navigate", (_e, url) => {
      tab.url = url;
      pushChromeState();
    });

    wc.on("did-navigate-in-page", (_e, url) => {
      tab.url = url;
      pushChromeState();
    });

    // Hors-ligne : si l'accueil ayeba.app ne charge pas, on sert la page locale.
    wc.on("did-fail-load", (_e, errorCode, _desc, validatedURL, isMainFrame) => {
      if (!isMainFrame || errorCode === -3) return; // -3 = navigation interrompue (normal)
      if (validatedURL === HOME_URL || validatedURL === "https://ayeba.app") {
        wc.loadURL(LOCAL_NTP_URL).catch(() => {});
      }
    });

    wc.on("dom-ready", () => {
      // Speed: block heavy media autoplay noise by default policy already set on session
      pushChromeState();
    });

    // Real browser context menu (Edge-style right click on pages).
    wc.on("context-menu", (_e, params) => {
      const items = [];
      if (params.linkURL) {
        items.push(
          {
            label: "Ouvrir le lien dans un nouvel onglet",
            click: () => createTab(params.linkURL, true),
          },
          {
            label: "Copier l'adresse du lien",
            click: () => require("electron").clipboard.writeText(params.linkURL),
          },
          { type: "separator" },
        );
      }
      if (params.mediaType === "image" && params.srcURL) {
        items.push(
          {
            label: "Ouvrir l'image dans un nouvel onglet",
            click: () => createTab(params.srcURL, true),
          },
          {
            label: "Copier l'adresse de l'image",
            click: () => require("electron").clipboard.writeText(params.srcURL),
          },
          { type: "separator" },
        );
      }
      if (params.isEditable) {
        items.push(
          { role: "undo", label: "Annuler" },
          { role: "redo", label: "Rétablir" },
          { type: "separator" },
          { role: "cut", label: "Couper" },
          { role: "copy", label: "Copier" },
          { role: "paste", label: "Coller" },
          { role: "selectAll", label: "Tout sélectionner" },
          { type: "separator" },
        );
      } else if (params.selectionText) {
        items.push(
          { role: "copy", label: "Copier" },
          {
            label: `Rechercher « ${String(params.selectionText).slice(0, 40)} » avec Ayeba`,
            click: () =>
              createTab(buildSearchUrl(String(params.selectionText), readSettings().searchEngine), true),
          },
          { type: "separator" },
        );
      }
      items.push(
        {
          label: "Précédent",
          enabled: canBack(wc),
          click: () => wc.goBack(),
        },
        {
          label: "Suivant",
          enabled: canForward(wc),
          click: () => wc.goForward(),
        },
        { label: "Actualiser", click: () => wc.reload() },
        { type: "separator" },
        { label: "Inspecter", click: () => wc.openDevTools({ mode: "detach" }) },
      );
      Menu.buildFromTemplate(items).popup({ window: win });
    });
  }

  function createTab(url = HOME_URL, activate = true) {
    const id = state.nextId++;
    const view = new WebContentsView({
      webPreferences: {
        preload: path.join(__dirname, "preload-tab.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
        spellcheck: true,
        // InPrivate: in-memory partition — cookies/cache wiped when the window closes.
        ...(state.isPrivate ? { partition: "ayeba-inprivate" } : {}),
      },
    });

    const tab = {
      id,
      title: "Nouvel onglet",
      url,
      favicon: "",
      loading: true,
      view,
    };

    state.tabs.push(tab);
    win.contentView.addChildView(view);
    attachTabEvents(tab);
    view.webContents.loadURL(url);

    if (activate) showTab(id);
    else {
      view.setVisible(false);
      pushChromeState();
    }
    layout();
    return id;
  }

  function closeTab(id) {
    const idx = state.tabs.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const [tab] = state.tabs.splice(idx, 1);
    try {
      win.contentView.removeChildView(tab.view);
      if (!tab.view.webContents.isDestroyed()) tab.view.webContents.close();
    } catch {}
    if (!state.tabs.length) {
      createTab(HOME_URL, true);
      return;
    }
    if (state.activeId === id) {
      const next = state.tabs[Math.max(0, idx - 1)] || state.tabs[0];
      showTab(next.id);
    } else {
      pushChromeState();
    }
    layout();
  }

  function activeTab() {
    return state.tabs.find((t) => t.id === state.activeId);
  }

  win.on("resize", layout);
  win.on("maximize", layout);
  win.on("unmaximize", layout);
  win.once("ready-to-show", () => {
    revealWindow(win);
    layout();
  });

  // Always force visibility — ready-to-show is unreliable with BaseWindow + GPU off
  revealWindow(win);
  layout();
  setTimeout(() => {
    revealWindow(win);
    layout();
  }, 400);
  setTimeout(() => revealWindow(win), 1500);
  win.on("closed", () => {
    windows.delete(state);
  });

  chrome.webContents.on("did-finish-load", () => {
    pushChromeState();
  });

  // IPC bound per-window via webContents id check
  state.handlers = {
    "tabs:new": () => createTab(HOME_URL, true),
    "tabs:close": (_e, id) => closeTab(id || state.activeId),
    "tabs:activate": (_e, id) => showTab(id),
    "tabs:duplicate": (_e, id) => {
      const src = state.tabs.find((t) => t.id === (id ?? state.activeId));
      if (src) createTab(src.url, true);
    },
    "tabs:close-others": (_e, id) => {
      const keep = id ?? state.activeId;
      for (const t of [...state.tabs]) {
        if (t.id !== keep) closeTab(t.id);
      }
    },
    "tabs:toggle-pin": (_e, id) => {
      const t = state.tabs.find((x) => x.id === (id ?? state.activeId));
      if (!t) return;
      t.pinned = !t.pinned;
      pushChromeState();
    },
    "tabs:menu": (_e, id) => {
      const t = state.tabs.find((x) => x.id === id);
      if (!t) return;
      Menu.buildFromTemplate([
        { label: "Nouvel onglet", click: () => createTab(HOME_URL, true) },
        { label: "Dupliquer", click: () => state.handlers["tabs:duplicate"](_e, id) },
        { label: t.pinned ? "Détacher l'onglet" : "Épingler l'onglet", click: () => state.handlers["tabs:toggle-pin"](_e, id) },
        { type: "separator" },
        { label: "Actualiser l'onglet", click: () => t.view.webContents.reload() },
        { type: "separator" },
        { label: "Fermer les autres onglets", click: () => state.handlers["tabs:close-others"](_e, id) },
        { label: "Fermer l'onglet", click: () => closeTab(id) },
      ]).popup({ window: win });
    },
    "nav:back": () => {
      const t = activeTab();
      if (t && canBack(t.view.webContents)) t.view.webContents.goBack();
    },
    "nav:forward": () => {
      const t = activeTab();
      if (t && canForward(t.view.webContents)) t.view.webContents.goForward();
    },
    "nav:reload": (_e, hard) => {
      const t = activeTab();
      if (!t) return;
      if (hard) t.view.webContents.reloadIgnoringCache();
      else t.view.webContents.reload();
    },
    "nav:home": () => {
      const t = activeTab();
      if (t) t.view.webContents.loadURL(HOME_URL);
    },
    "nav:go": (_e, input) => {
      const t = activeTab();
      if (!t) return;
      t.view.webContents.loadURL(normalizeOmni(input));
    },
    "zoom:set": (_e, factor) => {
      const t = activeTab();
      if (!t) return;
      const next = Math.min(3, Math.max(0.5, Number(factor) || 1));
      t.view.webContents.setZoomFactor(next);
      pushChromeState();
    },
    "zoom:step": (_e, delta) => {
      const t = activeTab();
      if (!t) return;
      const cur = t.view.webContents.getZoomFactor();
      t.view.webContents.setZoomFactor(Math.min(3, Math.max(0.5, cur + Number(delta || 0))));
      pushChromeState();
    },
    "find:start": (_e, text) => {
      const t = activeTab();
      if (!t) return;
      t.view.webContents.findInPage(String(text || ""), { forward: true, findNext: false });
    },
    "find:next": (_e, text) => {
      const t = activeTab();
      if (!t) return;
      t.view.webContents.findInPage(String(text || ""), { forward: true, findNext: true });
    },
    "find:prev": (_e, text) => {
      const t = activeTab();
      if (!t) return;
      t.view.webContents.findInPage(String(text || ""), { forward: false, findNext: true });
    },
    "find:stop": () => {
      const t = activeTab();
      if (t) t.view.webContents.stopFindInPage("clearSelection");
    },
    "page:print": () => {
      const t = activeTab();
      if (t) t.view.webContents.print({});
    },
    "page:screenshot": async () => {
      const t = activeTab();
      if (!t) return false;
      try {
        const image = await t.view.webContents.capturePage();
        const file = path.join(
          app.getPath("downloads"),
          `capture-ayeba-${new Date().toISOString().replace(/[:.]/g, "-")}.png`,
        );
        fs.writeFileSync(file, image.toPNG());
        downloadLog.unshift({
          id: `${Date.now()}-shot`,
          filename: path.basename(file),
          url: t.url,
          path: file,
          state: "completed",
          received: image.getSize().width * image.getSize().height * 4,
          total: image.getSize().width * image.getSize().height * 4,
          at: Date.now(),
        });
        pushAllChrome();
        return file;
      } catch (err) {
        log(`screenshot failed: ${err?.message || err}`);
        return false;
      }
    },
    "fav:list": () => readJson(FAV_FILE, []),
    "fav:add": (_e, item) => {
      const t = activeTab();
      const list = readJson(FAV_FILE, []);
      const entry = {
        title: item?.title || t?.title || "Favori",
        url: item?.url || t?.url || "",
        at: Date.now(),
      };
      if (!entry.url) return list;
      const next = [entry, ...list.filter((f) => f.url !== entry.url)].slice(0, 200);
      writeJson(FAV_FILE, next);
      return next;
    },
    "fav:remove": (_e, url) => {
      const next = readJson(FAV_FILE, []).filter((f) => f.url !== url);
      writeJson(FAV_FILE, next);
      return next;
    },
    "history:list": () => readJson(HISTORY_FILE, []),
    "history:clear": () => {
      writeJson(HISTORY_FILE, []);
      return [];
    },
    "data:clear": async () => {
      await session.defaultSession.clearCache();
      await session.defaultSession.clearStorageData();
      writeJson(HISTORY_FILE, []);
      return true;
    },
    "shell:open-downloads": () => {
      shell.openPath(app.getPath("downloads"));
    },
    "downloads:list": () => downloadLog.slice(0, 20),
    "downloads:open": (_e, filePath) => {
      if (typeof filePath === "string" && filePath) shell.openPath(filePath);
    },
    "downloads:show-folder": () => shell.openPath(app.getPath("downloads")),
    "shell:open-external": (_e, url) => {
      if (typeof url === "string" && /^https?:/i.test(url)) shell.openExternal(url);
    },
    "window:new": () => createBrowserWindow(),
    "window:new-private": () => createBrowserWindow(true),
    "app:about": () => {
      dialog.showMessageBox(win, {
        type: "info",
        title: "À propos d’AYEBA",
        message: "AYEBA Browser",
        detail:
          `Version ${app.getVersion()}\n` +
          "Navigateur + recherche mondiale.\n" +
          "https://ayeba.app\n\n" +
          "Onglets Chromium réels — comme Edge, pensé Ayeba.\n" +
          "Ayebi : encyclopédie RDC — toujours sur ayeba.app/ayebi",
        buttons: ["OK"],
      });
    },
    "settings:get": () => ({ ...readSettings(), engines: engineList().map(({ id, name }) => ({ id, name })) }),
    "settings:set": (_e, patch) => writeSettings(patch || {}),
    "settings:search-url": (_e, query) => {
      const { searchEngine } = readSettings();
      return buildSearchUrl(query, searchEngine);
    },
    "nav:ayebi": () => {
      const t = activeTab();
      if (t) t.view.webContents.loadURL("https://ayeba.app/ayebi");
    },
    "chrome:overlay": (_e, open) => {
      state.overlayOpen = !!open;
      layout();
    },
    // Le rail envoie ses actions ici ; le main les relaie au chrome qui
    // affiche l'overlay correspondant (ui:open).
    "rail:action": (_e, name) => {
      emitChrome("ui:open", name);
      return true;
    },
    // ── Extensions réelles ──
    "ext:list": () => extPublic(),
    "ext:load": async () => {
      const r = await dialog.showOpenDialog(win, {
        title: "Choisir le dossier de l'extension (contient manifest.json)",
        properties: ["openDirectory"],
      });
      if (r.canceled || !r.filePaths[0]) return { cancelled: true };
      try {
        const ext = await loadExtensionDir(r.filePaths[0]);
        return { ok: true, ext };
      } catch (err) {
        return { error: String(err?.message || err) };
      }
    },
    "ext:remove": (_e, id) => {
      const ext = session.defaultSession.getAllExtensions().find((e) => e.id === id);
      try {
        if (ext) session.defaultSession.removeExtension(id);
      } catch {}
      const s = readSettings();
      writeSettings({ extensions: s.extensions.filter((p) => p !== ext?.path) });
      return extPublic();
    },
    // ── Coffre de mots de passe (safeStorage → DPAPI Windows) ──
    "pass:list": () => vaultPublic(),
    "pass:add": (_e, entry) => {
      const origin = String(entry?.origin || "").trim();
      const username = String(entry?.username || "").trim();
      const password = String(entry?.password || "");
      if (!origin || !password || !safeStorage.isEncryptionAvailable()) return vaultPublic();
      const vault = readVault();
      vault.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        origin,
        username,
        secret: safeStorage.encryptString(password).toString("base64"),
        at: Date.now(),
      });
      writeVault(vault);
      return vaultPublic();
    },
    "pass:remove": (_e, id) => {
      writeVault(readVault().filter((p) => p.id !== id));
      return vaultPublic();
    },
    "pass:reveal": (_e, id) => {
      const entry = readVault().find((p) => p.id === id);
      return entry ? vaultDecrypt(entry) : "";
    },
    "pass:copy": (_e, id) => {
      const entry = readVault().find((p) => p.id === id);
      const pw = entry ? vaultDecrypt(entry) : "";
      if (pw) {
        clipboard.writeText(pw);
        setTimeout(() => clipboard.clear(), 30000);
      }
      return !!pw;
    },
    // Remplit le formulaire de connexion visible de l'onglet actif.
    "pass:fill": async (_e, id) => {
      const t = activeTab();
      const entry = readVault().find((p) => p.id === id);
      const pw = entry ? vaultDecrypt(entry) : "";
      if (!t || !pw || t.view.webContents.isDestroyed()) return false;
      const js = `(() => {
        const pw = document.querySelector('input[type="password"]');
        if (!pw) return false;
        const root = pw.closest('form') || document;
        const user = root.querySelector('input[type="email"],input[type="text"],input[name*="user" i],input[name*="mail" i],input[name*="login" i]');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        const put = (el, v) => { setter.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
        if (user) put(user, ${JSON.stringify(entry.username)});
        put(pw, ${JSON.stringify(pw)});
        return true;
      })()`;
      try {
        return await t.view.webContents.executeJavaScript(js);
      } catch {
        return false;
      }
    },
    "app:quit": () => app.quit(),
  };

  windows.add(state);
  createTab(HOME_URL, true);
  return state;
}

function bindIpc() {
  const channels = [
    "tabs:new",
    "tabs:close",
    "tabs:activate",
    "tabs:duplicate",
    "tabs:close-others",
    "tabs:toggle-pin",
    "tabs:menu",
    "nav:back",
    "nav:forward",
    "nav:reload",
    "nav:home",
    "nav:go",
    "zoom:set",
    "zoom:step",
    "find:start",
    "find:next",
    "find:prev",
    "find:stop",
    "page:print",
    "page:screenshot",
    "fav:list",
    "fav:add",
    "fav:remove",
    "history:list",
    "history:clear",
    "data:clear",
    "shell:open-downloads",
    "downloads:list",
    "downloads:open",
    "downloads:show-folder",
    "shell:open-external",
    "window:new",
    "window:new-private",
    "app:about",
    "settings:get",
    "settings:set",
    "settings:search-url",
    "nav:ayebi",
    "chrome:overlay",
    "rail:action",
    "ext:list",
    "ext:load",
    "ext:remove",
    "pass:list",
    "pass:add",
    "pass:remove",
    "pass:reveal",
    "pass:copy",
    "pass:fill",
    "app:quit",
  ];

  for (const channel of channels) {
    ipcMain.handle(channel, (event, ...args) => {
      const state = [...windows].find(
        (w) =>
          w.chrome?.webContents?.id === event.sender.id ||
          w.rail?.webContents?.id === event.sender.id,
      );
      if (!state) return null;
      const fn = state.handlers[channel];
      return fn ? fn(event, ...args) : null;
    });
  }

  ipcMain.handle("app:get-paths", () => {
    const { searchEngine } = readSettings();
    return {
      home: HOME_URL,
      searchBase: `${buildSearchUrl("", searchEngine).replace(/=$/, "")}=`,
      searchEngine,
      engines: engineList().map(({ id, name }) => ({ id, name })),
    };
  });

  ipcMain.handle("settings:search-url-global", (_e, query) => {
    const { searchEngine } = readSettings();
    return buildSearchUrl(query, searchEngine);
  });
}

app.whenReady().then(() => {
  log(`ready v${app.getVersion()} userData=${app.getPath("userData")}`);
  ensureData();
  Menu.setApplicationMenu(null);
  void restoreExtensions();
  session.defaultSession.setPermissionRequestHandler(async (webContents, permission, callback, details) => {
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
    if (permissionDecisions.has(key)) {
      callback(permissionDecisions.get(key));
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
    permissionDecisions.set(key, allowed);
    callback(allowed);
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    return permissionDecisions.get(`${requestingOrigin}:${permission}`) === true;
  });
  bindIpc();

  if (app.isPackaged) {
    autoUpdater.on("error", (error) => log(`auto-update error: ${error?.message || error}`));
    autoUpdater.on("update-downloaded", async () => {
      const result = await dialog.showMessageBox({
        type: "info",
        buttons: ["Redémarrer maintenant", "Plus tard"],
        defaultId: 0,
        cancelId: 1,
        title: "Mise à jour AYEBA disponible",
        message: "La mise à jour est prête à être installée.",
      });
      if (result.response === 0) autoUpdater.quitAndInstall();
    });
    autoUpdater.checkForUpdatesAndNotify().catch((error) => log(`auto-update check failed: ${error?.message || error}`));
  }

  session.defaultSession.on("will-download", (_event, item) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      filename: item.getFilename(),
      url: item.getURL(),
      path: "",
      state: "progressing",
      received: 0,
      total: item.getTotalBytes(),
      at: Date.now(),
    };
    downloadLog.unshift(entry);
    if (downloadLog.length > 40) downloadLog.length = 40;
    item.on("updated", (_e, state) => {
      entry.state = state;
      entry.received = item.getReceivedBytes();
      entry.total = item.getTotalBytes();
      pushAllChrome();
    });
    item.on("done", (_e, state) => {
      entry.state = state;
      entry.path = item.getSavePath();
      entry.received = item.getTotalBytes();
      pushAllChrome();
    });
    pushAllChrome();
  });

  app.on("second-instance", () => {
    log("second-instance → focus existing window");
    const first = [...windows][0];
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
    if (![...windows].length) createBrowserWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
