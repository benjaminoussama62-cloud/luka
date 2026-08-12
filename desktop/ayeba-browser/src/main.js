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
} = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

// Must run before app ready — avoid cache lock / multi-instance GPU errors on Windows
app.setName("AYEBA");
app.setPath("userData", path.join(app.getPath("appData"), "AyebaBrowser"));

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

nativeTheme.themeSource = "dark";

const AYEBA_SEARCH = "https://ayeba.app/?q=";
const HOME_URL = pathToFileURL(path.join(__dirname, "..", "newtab", "index.html")).href;
const CHROME_URL = pathToFileURL(path.join(__dirname, "..", "chrome", "index.html")).href;
const DATA_DIR = path.join(app.getPath("userData"), "data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const FAV_FILE = path.join(DATA_DIR, "favorites.json");

const CHROME_H = 94;
const windows = new Set();

function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, "[]");
  if (!fs.existsSync(FAV_FILE)) fs.writeFileSync(FAV_FILE, "[]");
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

function isNewTab(url = "") {
  return url.startsWith("file:") && url.includes("/newtab/");
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
  if (/^(https?|file|ayeba):\/\//i.test(raw)) return raw;
  if (raw.includes(" ") || !raw.includes(".")) {
    return `${AYEBA_SEARCH}${encodeURIComponent(raw)}`;
  }
  return `https://${raw}`;
}

function createBrowserWindow() {
  ensureData();

  const win = new BaseWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#050507",
    title: "AYEBA",
    autoHideMenuBar: true,
    show: false,
  });

  const state = {
    win,
    chrome: null,
    tabs: [],
    activeId: null,
    nextId: 1,
    findOpen: false,
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
  win.contentView.addChildView(chrome);
  chrome.webContents.loadURL(CHROME_URL);

  function layout() {
    const { width, height } = win.getContentBounds();
    chrome.setBounds({ x: 0, y: 0, width, height: CHROME_H });
    const tab = state.tabs.find((t) => t.id === state.activeId);
    if (tab) {
      tab.view.setBounds({ x: 0, y: CHROME_H, width, height: Math.max(0, height - CHROME_H) });
    }
  }

  function emitChrome(channel, payload) {
    if (!chrome.webContents.isDestroyed()) {
      chrome.webContents.send(channel, payload);
    }
  }

  function tabSnapshot() {
    return state.tabs.map((t) => ({
      id: t.id,
      title: t.title,
      url: t.url,
      favicon: t.favicon,
      loading: t.loading,
      active: t.id === state.activeId,
      canGoBack: canBack(t.view.webContents),
      canGoForward: canForward(t.view.webContents),
    }));
  }

  function pushChromeState() {
    const active = state.tabs.find((t) => t.id === state.activeId);
    emitChrome("browser:state", {
      tabs: tabSnapshot(),
      activeId: state.activeId,
      url: active?.url || "",
      title: active?.title || "AYEBA",
      loading: !!active?.loading,
      canGoBack: active ? canBack(active.view.webContents) : false,
      canGoForward: active ? canForward(active.view.webContents) : false,
      zoomFactor: active && !active.view.webContents.isDestroyed() ? active.view.webContents.getZoomFactor() : 1,
    });
  }

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
      if (!isNewTab(tab.url) && tab.url.startsWith("http")) {
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

    wc.on("dom-ready", () => {
      // Speed: block heavy media autoplay noise by default policy already set on session
      pushChromeState();
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
    win.show();
    layout();
  });
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
    "find:stop": () => {
      const t = activeTab();
      if (t) t.view.webContents.stopFindInPage("clearSelection");
    },
    "page:print": () => {
      const t = activeTab();
      if (t) t.view.webContents.print({});
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
    "shell:open-external": (_e, url) => {
      if (typeof url === "string" && /^https?:/i.test(url)) shell.openExternal(url);
    },
    "window:new": () => createBrowserWindow(),
    "app:about": () => {
      dialog.showMessageBox(win, {
        type: "info",
        title: "À propos d’AYEBA",
        message: "AYEBA Browser",
        detail:
          `Version ${app.getVersion()}\n` +
          "Navigateur + recherche mondiale.\n" +
          "https://ayeba.app\n\n" +
          "Onglets Chromium réels — comme Edge, pensé Ayeba.",
        buttons: ["OK"],
      });
    },
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
    "nav:back",
    "nav:forward",
    "nav:reload",
    "nav:home",
    "nav:go",
    "zoom:set",
    "zoom:step",
    "find:start",
    "find:next",
    "find:stop",
    "page:print",
    "fav:list",
    "fav:add",
    "fav:remove",
    "history:list",
    "history:clear",
    "data:clear",
    "shell:open-downloads",
    "shell:open-external",
    "window:new",
    "app:about",
  ];

  for (const channel of channels) {
    ipcMain.handle(channel, (event, ...args) => {
      const state = [...windows].find((w) => w.chrome?.webContents?.id === event.sender.id);
      if (!state) return null;
      const fn = state.handlers[channel];
      return fn ? fn(event, ...args) : null;
    });
  }

  ipcMain.handle("app:get-paths", () => ({
    home: HOME_URL,
    searchBase: AYEBA_SEARCH,
  }));
}

app.whenReady().then(() => {
  ensureData();
  Menu.setApplicationMenu(null);
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
  bindIpc();

  app.on("second-instance", () => {
    const first = [...windows][0];
    if (first?.win && !first.win.isDestroyed()) {
      if (first.win.isMinimized()) first.win.restore();
      first.win.focus();
      return;
    }
    createBrowserWindow();
  });

  createBrowserWindow();

  app.on("activate", () => {
    if (![...windows].length) createBrowserWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
