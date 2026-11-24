const path = require("path");
const fs = require("fs");
const {
  app,
  BaseWindow,
  WebContentsView,
  session,
  shell,
  Menu,
  dialog,
  clipboard,
  net,
} = require("electron");
const { state, pushAllChrome } = require("./state");
const { log, urlForLog } = require("./log");
const {
  HOME_URL,
  LOCAL_NTP_URL,
  CHROME_URL,
  RAIL_URL,
  PRIVATE_PARTITION,
  FETCH_TIMEOUT_MS,
  CHROME_H,
  RAIL_W,
} = require("./paths");
const {
  readJson,
  writeJson,
  ensureData,
  readSettings,
  writeSettings,
  fetchSessionUser,
  emailToAccountKey,
  userFile,
  pushHistory,
  readSessionTabs,
  writeSessionTabs,
  readVault,
  writeVault,
  vaultPublic,
  vaultDecrypt,
  safeStorageAvailable,
  encryptString,
  downloadsPath,
} = require("./store");
const { applyPrivacyTo, trackerBlockedCount, shouldFallbackToHttp, httpUrlFor } = require("./privacy");
const { bindPermissions, clearDecisions, listDecisions, revokeDecision } = require("./permissions");
const { bindDownloads } = require("./downloads");
const { buildSearchUrl, engineList, normalizeOmni } = require("./search");
const { hostOf, certErrorUrl, isNewTab } = require("./net-utils");
const { extPublic, loadExtensionDir } = require("./extensions");
const { autoUpdater } = require("./updater");

// DevTools disponibles uniquement en développement : une build empaquetée ne
// doit jamais ouvrir la console — vecteur classique d'attaque par ingénierie
// sociale (« appuie sur F12 et colle ce code »). AYEBA_DEVTOOLS=1 force
// l'accès sur une build packagée pour le support.
function devToolsAllowed() {
  return !app.isPackaged || !!process.env.AYEBA_DEVTOOLS;
}

function revealWindow(win) {
  if (!win || win.isDestroyed()) return;
  if (!win.isVisible()) win.show();
  win.focus();
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

function createBrowserWindow(isPrivate = false, initialUrl = HOME_URL) {
  ensureData();
  log(`createBrowserWindow execPath=${process.execPath} private=${isPrivate}`);
  if (isPrivate) {
    // La session InPrivate reçoit les mêmes protections que la session
    // principale : DNT/cookies tiers, permissions consenties, downloads gérés.
    const priv = session.fromPartition(PRIVATE_PARTITION);
    applyPrivacyTo(priv);
    bindPermissions(priv);
    bindDownloads(priv);
  }

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
      icon: path.join(__dirname, "..", "..", "assets", "icon.ico"),
    });
  } catch (err) {
    log(`BaseWindow failed: ${err?.stack || err}`);
    dialog.showErrorBox(
      "AYEBA — impossible d’ouvrir la fenêtre",
      `${err?.message || err}\n\nJournal : ${require("./paths").LOG_FILE}`,
    );
    app.quit();
    return null;
  }

  const winState = {
    win,
    chrome: null,
    rail: null,
    tabs: [],
    activeId: null,
    nextId: 1,
    findOpen: false,
    isPrivate,
    overlayOpen: false,
  };
  let tabPersistTimer = null;

  const chrome = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "..", "preload-chrome.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  winState.chrome = chrome;
  // Transparent : quand la vue s'étend pour un panneau, la page web reste
  // visible derrière (floutée par le backdrop CSS), comme sur ayeba.app.
  chrome.setBackgroundColor("#00000000");
  win.contentView.addChildView(chrome);
  chrome.webContents.loadURL(CHROME_URL).catch((err) => log(`chrome loadURL: ${err?.message || err}`));

  // Rail vertical gauche (style Yandex) — vue dédiée pour ne pas bloquer
  // les clics : chaque vue ne couvre que sa propre zone rectangulaire.
  const rail = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "..", "preload-chrome.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  winState.rail = rail;
  rail.setBackgroundColor("#0a0c11");
  win.contentView.addChildView(rail);
  rail.webContents.loadURL(RAIL_URL).catch((err) => log(`rail loadURL: ${err?.message || err}`));

  function raiseChrome() {
    if (win.isDestroyed() || chrome.webContents.isDestroyed()) return;
    try {
      win.contentView.removeChildView(chrome);
      win.contentView.addChildView(chrome);
      // Quand l'overlay est ouvert, la vue chrome couvre toute la fenêtre :
      // le rail repasse au-dessus pour rester visible et cliquable.
      if (winState.overlayOpen && winState.rail && !winState.rail.webContents.isDestroyed()) {
        win.contentView.removeChildView(winState.rail);
        win.contentView.addChildView(winState.rail);
      }
    } catch {}
  }

  function layout() {
    const { width, height } = win.getContentBounds();
    // The chrome view is the topmost view: it must only cover the toolbar,
    // otherwise it swallows every click meant for the page below. It expands
    // to full height only while an overlay (menu, flyouts, findbar) is open.
    chrome.setBounds({ x: 0, y: 0, width, height: winState.overlayOpen ? height : CHROME_H });
    if (winState.rail && !winState.rail.webContents.isDestroyed()) {
      winState.rail.setBounds({ x: 0, y: CHROME_H, width: RAIL_W, height: Math.max(0, height - CHROME_H) });
    }
    for (const t of winState.tabs) {
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
    const sorted = [...winState.tabs].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    return sorted.map((t) => ({
      id: t.id,
      title: t.title,
      url: t.url,
      favicon: t.favicon,
      loading: t.loading,
      pinned: !!t.pinned,
      active: t.id === winState.activeId,
      canGoBack: canBack(t.view.webContents),
      canGoForward: canForward(t.view.webContents),
      // Traqueurs annulés sur cet onglet — affiché par le badge bouclier.
      blocked: trackerBlockedCount(t.view.webContents.id),
    }));
  }

  function pushChromeState() {
    const active = winState.tabs.find((t) => t.id === winState.activeId);
    const settings = readSettings();
    emitChrome("browser:state", {
      tabs: tabSnapshot(),
      activeId: winState.activeId,
      url: active?.url || "",
      title: active?.title || "AYEBA",
      loading: !!active?.loading,
      isPrivate: !!winState.isPrivate,
      canGoBack: active ? canBack(active.view.webContents) : false,
      canGoForward: active ? canForward(active.view.webContents) : false,
      zoomFactor: active && !active.view.webContents.isDestroyed() ? active.view.webContents.getZoomFactor() : 1,
      searchEngine: settings.searchEngine,
      searchEngines: engineList().map(({ id, name }) => ({ id, name })),
      downloads: state.downloadLog.slice(0, 12).map((d) => ({
        id: d.id,
        filename: d.filename,
        url: d.url,
        path: d.path,
        state: d.state,
        received: d.received,
        total: d.total,
        icon: d.icon || "",
        dangerous: !!d.dangerous,
        at: d.at,
      })),
      update: state.updateState,
    });
    if (winState.rail && !winState.rail.webContents.isDestroyed()) {
      winState.rail.webContents.send("rail:state", {
        isPrivate: !!winState.isPrivate,
        downloading: state.downloadLog.some((d) => d.state === "progressing"),
      });
    }
    persistTabsSoon();
  }

  // Restauration de session : les URL des onglets ouverts sont réécrites
  // (debounced) à chaque changement — jamais depuis une fenêtre InPrivate,
  // jamais si l'utilisateur a désactivé la reprise.
  function persistTabsSoon() {
    if (winState.isPrivate || !readSettings().restoreTabs) return;
    if (tabPersistTimer) return;
    tabPersistTimer = setTimeout(() => {
      tabPersistTimer = null;
      if (win.isDestroyed() || winState.isPrivate) return;
      const tabs = winState.tabs.map((t) => t.url).filter((u) => /^https?:/i.test(u));
      if (!tabs.length) return;
      const active = Math.max(0, winState.tabs.findIndex((t) => t.id === winState.activeId));
      writeSessionTabs(tabs, active);
    }, 1000);
  }

  winState.pushChromeState = pushChromeState;

  function showTab(id) {
    for (const t of winState.tabs) {
      t.view.setVisible(t.id === id);
    }
    winState.activeId = id;
    layout();
    pushChromeState();
  }

  function attachTabEvents(tab) {
    const wc = tab.view.webContents;

    // Liens et popups : target=_blank / ctrl+clic → vrai onglet ; window.open()
    // (OAuth, postMessage vers l'ouvreur…) → vraie fenêtre popup sandboxée,
    // sinon le handle renvoyé à la page serait null et casserait le flow.
    wc.setWindowOpenHandler(({ url, disposition }) => {
      if (disposition === "new-window") {
        return {
          action: "allow",
          overrideBrowserWindowOptions: {
            width: 1040,
            height: 720,
            autoHideMenuBar: true,
            backgroundColor: "#0a0c11",
            webPreferences: {
              contextIsolation: true,
              nodeIntegration: false,
              sandbox: true,
              spellcheck: true,
              ...(winState.isPrivate ? { partition: PRIVATE_PARTITION } : {}),
            },
          },
        };
      }
      if (url) createTab(url, disposition !== "background-tab");
      return { action: "deny" };
    });

    // Raccourcis navigateur : les WebContentsView sont des renderers séparés,
    // le keydown de chrome.js ne reçoit rien quand la page a le focus.
    // before-input-event capte les touches côté processus principal.
    let lastKeySig = "";
    let lastKeyAt = 0;
    wc.on("before-input-event", (event, input) => {
      if (input.type === "keyUp") {
        lastKeySig = "";
        return;
      }
      if (input.type !== "keyDown" && input.type !== "rawKeyDown") return;
      if (input.isAutoRepeat) return;
      const key = String(input.key || "").toLowerCase();
      const mod = input.control || input.meta;
      // Un même appui peut émettre rawKeyDown puis keyDown : dédupliquer.
      const sig = `${key}|${mod ? 1 : 0}${input.alt ? 1 : 0}${input.shift ? 1 : 0}`;
      const now = Date.now();
      const markHandled = () => {
        event.preventDefault();
        lastKeySig = sig;
        lastKeyAt = now;
      };
      if (sig === lastKeySig && now - lastKeyAt < 200) return;

      if ((input.key === "F12" || (mod && input.shift && key === "i")) && devToolsAllowed()) {
        markHandled();
        wc.openDevTools({ mode: "detach" });
        return;
      }
      if (mod && key === "tab") {
        markHandled();
        if (winState.tabs.length < 2) return;
        const idx = winState.tabs.findIndex((t) => t.id === winState.activeId);
        showTab(
          winState.tabs[(idx + (input.shift ? -1 : 1) + winState.tabs.length) % winState.tabs.length].id,
        );
        return;
      }
      if (input.alt && !mod) {
        if (key === "arrowleft" && canBack(wc)) {
          markHandled();
          wc.goBack();
        } else if (key === "arrowright" && canForward(wc)) {
          markHandled();
          wc.goForward();
        }
        return;
      }
      if (!mod || input.alt) return;

      // Panneaux du chrome : donner le focus à la vue chrome puis cibler.
      const focusChrome = (name, payload = {}) => {
        markHandled();
        chrome.webContents.focus();
        emitChrome("ui:open", { name, ...payload });
      };
      if (key === "t") {
        markHandled();
        createTab(HOME_URL, true);
      } else if (key === "w") {
        markHandled();
        closeTab(winState.activeId);
      } else if (key === "n") {
        markHandled();
        if (input.shift) createBrowserWindow(true);
        else createBrowserWindow();
      } else if (key === "j") focusChrome("downloads", { y: 140, side: "right" });
      else if (key === "h") focusChrome("history", { y: 130, side: "right" });
      else if (key === "l") focusChrome("omnibox");
      else if (key === "r") {
        markHandled();
        if (input.shift) wc.reloadIgnoringCache();
        else wc.reload();
      } else if (key === "f") focusChrome("find");
      else if (key === "p") {
        markHandled();
        wc.print({});
      } else if (key === "d") focusChrome("fav-add");
      else if (key === "o" && input.shift) focusChrome("favorites");
    });

    // Onglet crashé (OOM, renderer tué) : recharger, ou recréer la vue si le
    // processus est mort — jamais laisser une page noire silencieuse.
    wc.on("render-process-gone", (_e, details) => {
      log(`render-process-gone tab=${tab.id} reason=${details?.reason || "?"}`);
      setTimeout(() => {
        if (win.isDestroyed()) return;
        try {
          if (!wc.isDestroyed()) {
            wc.reload();
            return;
          }
        } catch {}
        const idx = winState.tabs.findIndex((t) => t.id === tab.id);
        if (idx < 0) return;
        winState.tabs.splice(idx, 1);
        try {
          win.contentView.removeChildView(tab.view);
        } catch {}
        const wasActive = winState.activeId === tab.id;
        if (wasActive) winState.activeId = null;
        createTab(tab.url || HOME_URL, wasActive || winState.tabs.length === 0);
        if (!wasActive) pushChromeState();
      }, 300);
    });

    wc.on("page-title-updated", (_e, title) => {
      tab.title = isNewTab(tab.url) ? "Nouvel onglet" : (title || "AYEBA");
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
      tab.title = isNewTab(tab.url) ? "Nouvel onglet" : (wc.getTitle() || tab.title);
      if (!winState.isPrivate && !isNewTab(tab.url) && tab.url.startsWith("http")) {
        pushHistory({ title: tab.title, url: tab.url }, winState.isPrivate);
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

    // Échecs de navigation (frame principale) : interstitiel dédié pour les
    // erreurs de certificat (ERR_CERT_* : -200..-299), repli local pour l'accueil.
    function handleMainFrameFail(errorCode, errorDesc, validatedURL) {
      if (errorCode === -3) return; // navigation interrompue (normal)
      // HTTPS-First : la version https d'un site promu automatiquement ne
      // répond pas → repli http mémorisé pour ce domaine (comme Chrome).
      if (shouldFallbackToHttp(errorCode, validatedURL)) {
        wc.loadURL(httpUrlFor(validatedURL)).catch(() => {});
        return;
      }
      if (errorCode <= -200 && errorCode >= -299) {
        wc.loadURL(certErrorUrl(validatedURL, errorDesc)).catch(() => {});
        return;
      }
      // Hors-ligne : si l'accueil ayeba.app ne charge pas, on sert la page locale.
      if (validatedURL === HOME_URL || validatedURL === "https://ayeba.app") {
        wc.loadURL(LOCAL_NTP_URL).catch(() => {});
      }
    }
    wc.on("did-fail-load", (_e, errorCode, desc, url, isMainFrame) => {
      if (isMainFrame) handleMainFrameFail(errorCode, desc, url);
    });
    wc.on("did-fail-provisional-load", (_e, errorCode, desc, url, isMainFrame) => {
      if (isMainFrame) handleMainFrameFail(errorCode, desc, url);
    });

    wc.on("dom-ready", () => {
      pushChromeState();
    });

    // Menu contextuel complet façon Chrome : variantes selon la cible
    // (lien, image, média, champ éditable, sélection, page).
    wc.on("context-menu", (_e, params) => {
      const ses = wc.session;
      const pageURL = params.pageURL || wc.getURL() || "";
      const items = [];

      // Suggestions orthographiques en tête dans un champ éditable (Chrome).
      if (params.isEditable && params.misspelledWord) {
        const sugg = (params.dictionarySuggestions || []).slice(0, 3);
        if (sugg.length) {
          for (const s of sugg) {
            items.push({ label: s, click: () => wc.replaceMisspelling(s) });
          }
        } else {
          items.push({ label: "Aucune suggestion", enabled: false });
        }
        items.push(
          {
            label: "Ajouter au dictionnaire",
            click: () => ses.addWordToSpellCheckerDictionary(params.misspelledWord),
          },
          { type: "separator" },
        );
      }

      if (params.linkURL) {
        items.push(
          { label: "Ouvrir le lien dans un nouvel onglet", click: () => createTab(params.linkURL, true) },
          { label: "Ouvrir le lien dans un nouvel onglet en arrière-plan", click: () => createTab(params.linkURL, false) },
          { label: "Ouvrir le lien dans une nouvelle fenêtre", click: () => createBrowserWindow(false, params.linkURL) },
          { type: "separator" },
          { label: "Enregistrer le lien sous…", click: () => ses.downloadURL(params.linkURL) },
          { label: "Copier l'adresse du lien", click: () => clipboard.writeText(params.linkURL) },
          { type: "separator" },
        );
        if (!winState.isPrivate) {
          items.push(
            { label: "Ouvrir le lien dans une fenêtre privée", click: () => createBrowserWindow(true, params.linkURL) },
            { type: "separator" },
          );
        }
      }

      if (params.mediaType === "image" && params.srcURL) {
        items.push(
          { label: "Ouvrir l'image dans un nouvel onglet", click: () => createTab(params.srcURL, true) },
          { label: "Enregistrer l'image sous…", click: () => ses.downloadURL(params.srcURL) },
          { label: "Copier l'image", click: () => wc.copyImageAt(params.x, params.y) },
          { label: "Copier l'adresse de l'image", click: () => clipboard.writeText(params.srcURL) },
          { type: "separator" },
        );
      }

      if ((params.mediaType === "video" || params.mediaType === "audio") && params.srcURL) {
        const kind = params.mediaType === "video" ? "la vidéo" : "l'audio";
        items.push(
          { label: `Enregistrer ${kind} sous…`, click: () => ses.downloadURL(params.srcURL) },
          { label: `Copier l'adresse de ${kind}`, click: () => clipboard.writeText(params.srcURL) },
          { type: "separator" },
        );
      }

      if (params.isEditable) {
        items.push(
          { role: "undo", label: "Annuler", enabled: params.editFlags?.canUndo },
          { role: "redo", label: "Rétablir", enabled: params.editFlags?.canRedo },
          { type: "separator" },
          { role: "cut", label: "Couper", enabled: params.editFlags?.canCut },
          { role: "copy", label: "Copier", enabled: params.editFlags?.canCopy },
          { role: "paste", label: "Coller", enabled: params.editFlags?.canPaste },
          { role: "pasteAndMatchStyle", label: "Coller sans mise en forme", enabled: params.editFlags?.canPaste },
          { label: "Supprimer", enabled: params.editFlags?.canDelete, click: () => wc.delete() },
          { type: "separator" },
          { role: "selectAll", label: "Tout sélectionner" },
          { type: "separator" },
        );
      } else if (params.selectionText && params.selectionText.trim()) {
        const sel = String(params.selectionText).trim();
        items.push(
          { role: "copy", label: "Copier" },
          {
            label: `Rechercher « ${sel.slice(0, 40)} » avec Ayeba`,
            click: () => createTab(buildSearchUrl(sel, readSettings().searchEngine), true),
          },
          {
            label: "Traduire la sélection",
            click: () =>
              createTab(`https://translate.google.com/?sl=auto&tl=fr&text=${encodeURIComponent(sel)}`, true),
          },
          { type: "separator" },
        );
      }

      items.push(
        { label: "Précédent", enabled: canBack(wc), click: () => wc.goBack() },
        { label: "Suivant", enabled: canForward(wc), click: () => wc.goForward() },
        { label: "Actualiser", click: () => wc.reload() },
        { type: "separator" },
      );

      if (!params.isEditable && /^https?:/.test(pageURL)) {
        items.push(
          {
            label: "Enregistrer sous…",
            click: async () => {
              try {
                const { canceled, filePath } = await dialog.showSaveDialog(win, {
                  title: "Enregistrer sous",
                  defaultPath: path.join(
                    downloadsPath(),
                    `${hostOf(pageURL) || "page"}.html`,
                  ),
                });
                if (!canceled && filePath) await wc.savePage(filePath, "HTMLComplete");
              } catch (err) {
                log(`savePage: ${err?.message || err}`);
              }
            },
          },
          { label: "Imprimer…", click: () => wc.print({}) },
          {
            label: "Traduire en français",
            click: () =>
              createTab(
                `https://translate.google.com/translate?sl=auto&tl=fr&u=${encodeURIComponent(pageURL)}`,
                true,
              ),
          },
          { type: "separator" },
        );
      }

      items.push({
        label: "Afficher le code source de la page",
        enabled: /^https?:/.test(pageURL),
        click: () => createTab(`view-source:${pageURL}`, true),
      });
      // « Inspecter » ouvre DevTools : réservé au développement, comme F12.
      if (devToolsAllowed()) {
        items.push({ label: "Inspecter", click: () => wc.inspectElement(params.x, params.y) });
      }

      Menu.buildFromTemplate(items).popup({ window: win });
    });
  }

  function createTab(url = HOME_URL, activate = true) {
    const id = winState.nextId++;
    const view = new WebContentsView({
      webPreferences: {
        preload: path.join(__dirname, "..", "preload-tab.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        // Onglets en arrière-plan bridés (CPU/batterie) — l'audio n'est pas
        // affecté, les timers des onglets cachés ralentissent comme sur Chrome.
        backgroundThrottling: true,
        spellcheck: true,
        // InPrivate: in-memory partition — cookies/cache wiped when the window closes.
        ...(winState.isPrivate ? { partition: PRIVATE_PARTITION } : {}),
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

    winState.tabs.push(tab);
    win.contentView.addChildView(view);
    attachTabEvents(tab);
    view.webContents.loadURL(url).catch((err) => log(`loadURL ${urlForLog(url)}: ${err?.message || err}`));

    if (activate) showTab(id);
    else {
      view.setVisible(false);
      pushChromeState();
    }
    layout();
    return id;
  }

  function closeTab(id) {
    const idx = winState.tabs.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const [tab] = winState.tabs.splice(idx, 1);
    try {
      win.contentView.removeChildView(tab.view);
      if (!tab.view.webContents.isDestroyed()) tab.view.webContents.close();
    } catch {}
    if (!winState.tabs.length) {
      createTab(HOME_URL, true);
      return;
    }
    if (winState.activeId === id) {
      const next = winState.tabs[Math.max(0, idx - 1)] || winState.tabs[0];
      showTab(next.id);
    } else {
      pushChromeState();
    }
    layout();
  }

  function activeTab() {
    return winState.tabs.find((t) => t.id === winState.activeId);
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
    state.windows.delete(winState);
  });

  chrome.webContents.on("did-finish-load", () => {
    pushChromeState();
  });

  // IPC bound per-window via webContents id check
  winState.handlers = {
    "tabs:new": () => createTab(HOME_URL, true),
    "tabs:close": (_e, id) => closeTab(id || winState.activeId),
    "tabs:activate": (_e, id) => showTab(id),
    "tabs:duplicate": (_e, id) => {
      const src = winState.tabs.find((t) => t.id === (id ?? winState.activeId));
      if (src) createTab(src.url, true);
    },
    "tabs:close-others": (_e, id) => {
      const keep = id ?? winState.activeId;
      for (const t of [...winState.tabs]) {
        if (t.id !== keep) closeTab(t.id);
      }
    },
    "tabs:toggle-pin": (_e, id) => {
      const t = winState.tabs.find((x) => x.id === (id ?? winState.activeId));
      if (!t) return;
      t.pinned = !t.pinned;
      pushChromeState();
    },
    "tabs:menu": (_e, id) => {
      const t = winState.tabs.find((x) => x.id === id);
      if (!t) return;
      Menu.buildFromTemplate([
        { label: "Nouvel onglet", click: () => createTab(HOME_URL, true) },
        { label: "Dupliquer", click: () => winState.handlers["tabs:duplicate"](_e, id) },
        { label: t.pinned ? "Détacher l'onglet" : "Épingler l'onglet", click: () => winState.handlers["tabs:toggle-pin"](_e, id) },
        { type: "separator" },
        { label: "Actualiser l'onglet", click: () => t.view.webContents.reload() },
        { type: "separator" },
        { label: "Fermer les autres onglets", click: () => winState.handlers["tabs:close-others"](_e, id) },
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
      if (t) t.view.webContents.loadURL(HOME_URL).catch(() => {});
    },
    "nav:go": (_e, input) => {
      const t = activeTab();
      if (!t) return;
      t.view.webContents.loadURL(normalizeOmni(input)).catch((err) => log(`nav:go ${urlForLog(input)}: ${err?.message || err}`));
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
          downloadsPath(),
          `capture-ayeba-${new Date().toISOString().replace(/[:.]/g, "-")}.png`,
        );
        fs.writeFileSync(file, image.toPNG());
        state.downloadLog.unshift({
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
    "fav:list": async () => readJson(await userFile("favorites.json", winState.isPrivate), []),
    "fav:add": async (_e, item) => {
      const t = activeTab();
      const file = await userFile("favorites.json", winState.isPrivate);
      const list = readJson(file, []);
      const entry = {
        title: item?.title || t?.title || "Favori",
        url: item?.url || t?.url || "",
        at: Date.now(),
      };
      if (!entry.url) return list;
      const next = [entry, ...list.filter((f) => f.url !== entry.url)].slice(0, 200);
      writeJson(file, next);
      return next;
    },
    "fav:remove": async (_e, url) => {
      const file = await userFile("favorites.json", winState.isPrivate);
      const next = readJson(file, []).filter((f) => f.url !== url);
      writeJson(file, next);
      return next;
    },
    "history:list": async () => readJson(await userFile("history.json", winState.isPrivate), []),
    "history:clear": async () => {
      writeJson(await userFile("history.json", winState.isPrivate), []);
      return [];
    },
    // Recherches du compte (même historique que le site — cookie partagé).
    "history:searches": async () => {
      if (winState.isPrivate) return { history: [] };
      try {
        const jar = await session.defaultSession.cookies.get({
          url: "https://ayeba.app",
          name: "ayeba_session",
        });
        if (!jar[0]?.value) return { history: [] };
        const res = await net.fetch("https://ayeba.app/api/history", {
          headers: { Cookie: `ayeba_session=${jar[0].value}` },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        const data = await res.json();
        return { history: Array.isArray(data?.history) ? data.history : [] };
      } catch {
        return { history: [] };
      }
    },
    // Suggestions de l'omnibox : vrai endpoint /api/suggest du site +
    // correspondances dans l'historique local du compte courant.
    "suggest:get": async (_e, q) => {
      const query = String(q || "").trim();
      if (!query) return { suggestions: [], history: [] };
      let remote = [];
      try {
        const res = await net.fetch(
          `https://ayeba.app/api/suggest?q=${encodeURIComponent(query)}`,
          { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
        );
        const data = await res.json();
        remote = Array.isArray(data?.suggestions) ? data.suggestions : [];
      } catch {}
      let local = [];
      try {
        const hist = readJson(await userFile("history.json", winState.isPrivate), []);
        const ql = query.toLowerCase();
        local = hist
          .filter((h) => (h.title || "").toLowerCase().includes(ql) || (h.url || "").includes(ql))
          .slice(0, 3)
          .map((h) => ({ title: h.title || h.url, url: h.url }));
      } catch {}
      return { suggestions: remote.slice(0, 8), history: local };
    },
    "data:clear": async (_e, scope = {}) => {
      // InPrivate : purger la partition privée, jamais les vrais cookies/compte.
      const ses = winState.isPrivate
        ? session.fromPartition(PRIVATE_PARTITION)
        : session.defaultSession;
      const jobs = [];
      if (scope.cache !== false) jobs.push(ses.clearCache());
      if (scope.cookies) {
        jobs.push(ses.clearStorageData({ storages: ["cookies"] }));
      }
      if (scope.siteData) jobs.push(ses.clearStorageData());
      // « Données de site » = aussi les consentements de permission, sinon un
      // site pourrait réutiliser un accord dont l'utilisateur a oublié l'origine.
      if (scope.siteData && !winState.isPrivate) clearDecisions();
      if (scope.history !== false) writeJson(await userFile("history.json", winState.isPrivate), []);
      if (scope.downloads) {
        state.downloadLog.length = 0;
        pushAllChrome();
      }
      await Promise.all(jobs);
      return true;
    },
    "shell:open-downloads": () => {
      shell.openPath(downloadsPath());
    },
    "downloads:list": () => state.downloadLog.slice(0, 20),
    "downloads:open": (_e, filePath) => {
      // N'ouvrir que des fichiers du dossier Téléchargements — le canal IPC
      // est restreint au chrome, mais un bug de la vue chrome ne doit pas
      // pouvoir lancer un chemin arbitraire.
      if (typeof filePath !== "string" || !filePath) return;
      const resolved = path.resolve(filePath);
      if (!resolved.toLowerCase().startsWith(path.resolve(downloadsPath()).toLowerCase() + path.sep)) return;
      shell.openPath(resolved);
    },
    "downloads:show-folder": () => shell.openPath(downloadsPath()),
    "shell:open-external": (_e, url) => {
      if (typeof url === "string" && /^https?:/i.test(url)) shell.openExternal(url);
    },
    "window:new": () => createBrowserWindow(),
    "window:new-private": () => createBrowserWindow(true),
    "app:about": async () => {
      const current = app.getVersion();
      const buttons = ["OK"];
      const message =
        `Version ${current}\n\n` +
        "AYEBA est un navigateur web et moteur de recherche intégré,\n" +
        "conçu pour offrir une expérience de navigation rapide, privée et centrée sur l'utilisateur.\n\n" +
        "© 2025 Ayeba. Tous droits réservés.\n" +
        "https://ayeba.app";

      if (app.isPackaged) {
        buttons.push("Vérifier les mises à jour");
      }

      const result = await dialog.showMessageBox(win, {
        type: "info",
        title: "À propos d’AYEBA",
        message: "AYEBA Browser",
        detail: message,
        buttons,
        defaultId: 0,
        cancelId: 0,
      });

      if (result.response === 1 && app.isPackaged) {
        const info = await autoUpdater.checkForUpdates();
        if (info?.updateInfo) {
          await dialog.showMessageBox(win, {
            type: "info",
            title: "Mise à jour",
            message: `Version ${info.updateInfo.version} disponible`,
            detail: info.updateInfo.releaseNotes || "Une nouvelle version est prête à être téléchargée.",
            buttons: ["OK"],
          });
        } else {
          await dialog.showMessageBox(win, {
            type: "info",
            title: "Mise à jour",
            message: "AYEBA est à jour",
            detail: `Vous utilisez déjà la dernière version (${current}).`,
            buttons: ["OK"],
          });
        }
      }
    },
    "settings:get": () => ({
      ...readSettings(),
      version: app.getVersion(),
      engines: engineList().map(({ id, name }) => ({ id, name })),
    }),
    // Vrai compte Ayeba : même cookie de session que le site (partagé via la
    // session Chromium) → le navigateur affiche le profil réel de l'utilisateur.
    "account:get": async () => {
      // InPrivate : pas de profil — la fenêtre ne connaît pas le compte réel.
      if (winState.isPrivate) return { user: null };
      const user = await fetchSessionUser();
      state.keyCache = { key: emailToAccountKey(user?.email), at: Date.now() };
      return { user };
    },
    "account:logout": async () => {
      // InPrivate : aucune session à couper — ne jamais toucher le vrai cookie.
      if (winState.isPrivate) return { ok: true };
      try {
        await session.defaultSession.cookies.remove("https://ayeba.app", "ayeba_session");
      } catch {}
      state.keyCache = { key: "invite", at: Date.now() };
      return { ok: true };
    },
    "app:check-update": async () => {
      if (!app.isPackaged) return { version: app.getVersion(), dev: true };
      try {
        await autoUpdater.checkForUpdates();
      } catch (err) {
        log(`update check: ${err?.message || err}`);
      }
      return { version: app.getVersion() };
    },
    "update:install": () => {
      if (state.updateState.status === "ready") autoUpdater.quitAndInstall();
    },
    // Gestion des autorisations : liste « origin → permission » consentie,
    // révocable site par site depuis les Paramètres (comme Chrome).
    "perm:list": () => listDecisions(),
    "perm:revoke": (_e, key) => revokeDecision(String(key || "")),
    "settings:set": (_e, patch) => writeSettings(patch || {}),
    "settings:search-url": (_e, query) => {
      const { searchEngine } = readSettings();
      return buildSearchUrl(query, searchEngine);
    },
    "chrome:overlay": (_e, open) => {
      winState.overlayOpen = !!open;
      layout();
    },
    // Le rail envoie ses actions ici ; le main les relaie au chrome qui
    // affiche l'overlay correspondant (ui:open).
    "rail:action": (_e, payload) => {
      // p.y = hauteur du bouton dans la vue rail → coordonnées fenêtre (+CHROME_H)
      const p = typeof payload === "object" && payload ? payload : { act: payload };
      if (p.act === "mail") {
        createTab("https://ayeba.app/mail", true);
        return true;
      }
      if (p.act === "money") {
        createTab("https://ayeba.app/money", true);
        return true;
      }
      emitChrome("ui:open", { name: p.act, y: (typeof p.y === "number" ? p.y : 240) + CHROME_H });
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
    // InPrivate : le coffre du compte n'est ni lu ni rempli — comme Chrome.
    "pass:list": () => (winState.isPrivate ? [] : vaultPublic()),
    "pass:add": async (_e, entry) => {
      if (winState.isPrivate) return [];
      const origin = String(entry?.origin || "").trim();
      const username = String(entry?.username || "").trim();
      const password = String(entry?.password || "");
      if (!origin || !password || !safeStorageAvailable()) return vaultPublic();
      const vault = await readVault();
      vault.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        origin,
        username,
        secret: encryptString(password).toString("base64"),
        at: Date.now(),
      });
      await writeVault(vault);
      return vaultPublic();
    },
    "pass:remove": async (_e, id) => {
      if (winState.isPrivate) return [];
      const vault = await readVault();
      await writeVault(vault.filter((p) => p.id !== id));
      return vaultPublic();
    },
    "pass:reveal": async (_e, id) => {
      if (winState.isPrivate) return "";
      const vault = await readVault();
      const entry = vault.find((p) => p.id === id);
      return entry ? vaultDecrypt(entry) : "";
    },
    "pass:copy": async (_e, id) => {
      if (winState.isPrivate) return false;
      const vault = await readVault();
      const entry = vault.find((p) => p.id === id);
      const pw = entry ? vaultDecrypt(entry) : "";
      if (pw) {
        clipboard.writeText(pw);
        // N'effacer le presse-papiers que s'il contient encore ce mot de passe :
        // ne pas écraser ce que l'utilisateur a copié entre-temps.
        setTimeout(() => {
          try {
            if (clipboard.readText() === pw) clipboard.clear();
          } catch {}
        }, 30000);
      }
      return !!pw;
    },
    // Remplit le formulaire de connexion visible de l'onglet actif.
    // Jamais sans vérifier que le site correspond à l'entrée : un onglet
    // de phishing ne doit pas recevoir les identifiants d'un autre site.
    "pass:fill": async (_e, id) => {
      if (winState.isPrivate) return false;
      const t = activeTab();
      const vault = await readVault();
      const entry = vault.find((p) => p.id === id);
      const pw = entry ? vaultDecrypt(entry) : "";
      if (!t || !pw || t.view.webContents.isDestroyed()) return false;
      const tabHost = hostOf(t.url);
      const entryHost = hostOf(entry.origin);
      const sameSite =
        tabHost &&
        entryHost &&
        (tabHost === entryHost ||
          tabHost.endsWith(`.${entryHost}`) ||
          entryHost.endsWith(`.${tabHost}`));
      if (!sameSite) {
        const r = await dialog.showMessageBox(win, {
          type: "warning",
          buttons: ["Annuler", "Remplir quand même"],
          defaultId: 0,
          cancelId: 0,
          title: "Vérifier le site",
          message: `« ${entry.origin} » ne correspond pas au site ouvert${tabHost ? ` (${tabHost})` : ""}.`,
          detail:
            "Injecter des identifiants sur un site différent peut les exposer à une page de phishing.",
        });
        if (r.response !== 1) return "cancelled";
      }
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

  state.windows.add(winState);
  // Reprise de session : uniquement pour la toute première fenêtre, jamais
  // en InPrivate, jamais quand un URL explicite a été demandé.
  const restored =
    !isPrivate &&
    state.windows.size === 1 &&
    initialUrl === HOME_URL &&
    readSettings().restoreTabs &&
    readSessionTabs();
  if (restored?.tabs?.length) {
    restored.tabs.forEach((u, i) => createTab(u, i === restored.active));
  } else {
    createTab(initialUrl || HOME_URL, true);
  }
  return winState;
}

module.exports = { createBrowserWindow, devToolsAllowed };
