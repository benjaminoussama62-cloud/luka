/* global ayebaBrowser */
(() => {
  const api = window.ayebaBrowser;

  const els = {
    backdrop: document.getElementById("chromeBackdrop"),
    tabs: document.getElementById("tabs"),
    omni: document.getElementById("omni"),
    omniForm: document.getElementById("omniForm"),
    progress: document.getElementById("omniProgress"),
    menu: document.getElementById("menu"),
    btnMenu: document.getElementById("btnMenu"),
    btnBack: document.getElementById("btnBack"),
    btnForward: document.getElementById("btnForward"),
    btnReload: document.getElementById("btnReload"),
    btnHome: document.getElementById("btnHome"),
    btnNewTab: document.getElementById("btnNewTab"),
    btnOmniFav: document.getElementById("btnOmniFav"),
    btnProfile: document.getElementById("btnProfile"),
    iconSearch: document.querySelector(".icon-search"),
    iconLock: document.querySelector(".icon-lock"),
    zoomLabel: document.getElementById("zoomLabel"),
    profileFlyout: document.getElementById("profileFlyout"),
    favoritesDrawer: document.getElementById("favoritesDrawer"),
    favoritesBody: document.getElementById("favoritesBody"),
    favoritesClose: document.getElementById("favoritesClose"),
    favSearch: document.getElementById("favSearch"),
    favSearchBox: document.getElementById("favSearchBox"),
    favFilter: document.getElementById("favFilter"),
    favAddCurrent: document.getElementById("favAddCurrent"),
    panel: document.getElementById("panel"),
    panelTitle: document.getElementById("panelTitle"),
    panelBody: document.getElementById("panelBody"),
    panelClose: document.getElementById("panelClose"),
    findbar: document.getElementById("findbar"),
    findInput: document.getElementById("findInput"),
    findCount: document.getElementById("findCount"),
    findNext: document.getElementById("findNext"),
    findPrev: document.getElementById("findPrev"),
    findClose: document.getElementById("findClose"),
  };

  let state = {
    tabs: [],
    activeId: null,
    url: "",
    loading: false,
    canGoBack: false,
    canGoForward: false,
    zoomFactor: 1,
    searchEngine: "ayeba",
    searchEngines: [],
    downloads: [],
  };
  let omniDirty = false;
  let openOverlay = null;
  let overlayOpenedAt = 0;
  let favCache = [];

  // The main process resizes the chrome view: 126px when nothing is open so
  // page clicks reach the content view, full height while an overlay shows.
  function syncChromeBounds() {
    api.invoke("chrome:overlay", !!openOverlay || (els.findbar && !els.findbar.hidden));
  }

  function displayUrl(url) {
    if (!url) return "";
    if (url.startsWith("file:") && url.includes("/newtab/")) return "";
    // L'accueil = nouvel onglet : omnibox vide, comme Chrome/Yandex.
    if (url === "https://ayeba.app/" || url === "https://ayeba.app") return "";
    try {
      return new URL(url).href;
    } catch {
      return url;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function engineLabel(id) {
    return state.searchEngines.find((e) => e.id === id)?.name || "Ayeba";
  }

  function updateOmniIcon(url) {
    const secure = url && url.startsWith("https://");
    if (els.iconSearch) els.iconSearch.hidden = secure;
    if (els.iconLock) els.iconLock.hidden = !secure;
  }

  function fileIcon(name) {
    const ext = (name || "").split(".").pop()?.toLowerCase() || "";
    return ext.length <= 4 ? ext || "fichier" : ext.slice(0, 4);
  }

  function renderTabs() {
    els.tabs.innerHTML = "";
    for (const tab of state.tabs) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `tab${tab.active ? " active" : ""}${tab.loading ? " loading" : ""}${tab.pinned ? " pinned" : ""}`;
      btn.title = tab.title;

      const fav = document.createElement(tab.favicon ? "img" : "span");
      fav.className = "tab-fav";
      if (tab.favicon) {
        fav.src = tab.favicon;
        fav.alt = "";
      }

      btn.appendChild(fav);
      if (!tab.pinned) {
        const title = document.createElement("span");
        title.className = "tab-title";
        title.textContent = tab.title || "Nouvel onglet";

        const close = document.createElement("button");
        close.type = "button";
        close.className = "tab-close";
        close.textContent = "×";
        close.addEventListener("click", (e) => {
          e.stopPropagation();
          api.invoke("tabs:close", tab.id);
        });
        btn.append(title, close);
      }

      btn.addEventListener("click", () => api.invoke("tabs:activate", tab.id));
      btn.addEventListener("auxclick", (e) => {
        if (e.button === 1) {
          e.preventDefault();
          api.invoke("tabs:close", tab.id);
        }
      });
      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        api.invoke("tabs:menu", tab.id);
      });
      if (els.tabs.children.length) {
        const sep = document.createElement("i");
        sep.className = "tab-sep";
        els.tabs.appendChild(sep);
      }
      els.tabs.appendChild(btn);
    }
  }

  function formatBytes(n) {
    const v = Number(n) || 0;
    if (v < 1024) return `${v} o`;
    if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} Ko`;
    return `${(v / (1024 * 1024)).toFixed(1)} Mo`;
  }

  function renderDownloadsInto(container) {
    const items = state.downloads || [];
    if (!items.length) {
      container.innerHTML =
        '<div class="empty-state">Les fichiers téléchargés apparaîtront ici.</div>';
      return;
    }
    container.innerHTML = "";
    for (const d of items) container.appendChild(buildDlRow(d));
  }

  function faviconFor(url) {
    try {
      const u = new URL(url);
      return `${u.origin}/favicon.ico`;
    } catch {
      return "";
    }
  }

  function renderFavList(items, filter = "") {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? items.filter((i) => `${i.title} ${i.url}`.toLowerCase().includes(q))
      : items;

    if (!filtered.length) {
      els.favoritesBody.innerHTML = q
        ? '<div class="empty-state">Aucun résultat</div>'
        : '<div class="empty-state">Aucun favori — cliquez ★ dans la barre d\'adresse</div>';
      return;
    }

    els.favoritesBody.innerHTML = '<div class="fav-folder">Barre des favoris</div>';
    for (const item of filtered.slice(0, 120)) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "fav-row";
      const fav = faviconFor(item.url);
      b.innerHTML = `
        ${fav ? `<img src="${fav}" alt="" onerror="this.style.display='none'"/>` : ""}
        <div class="fav-text">
          <strong>${escapeHtml(item.title || item.url)}</strong>
          <span>${escapeHtml(item.url)}</span>
        </div>`;
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "fav-remove";
      rm.textContent = "×";
      rm.title = "Retirer";
      rm.addEventListener("click", async (e) => {
        e.stopPropagation();
        favCache = (await api.invoke("fav:remove", item.url)) || [];
        renderFavList(favCache, els.favFilter?.value || "");
      });
      b.appendChild(rm);
      b.addEventListener("click", () => {
        api.invoke("nav:go", item.url);
        closeAllOverlays();
      });
      els.favoritesBody.appendChild(b);
    }
  }

  async function renderFavoritesDrawer(filter = "") {
    favCache = (await api.invoke("fav:list")) || [];
    renderFavList(favCache, filter);
  }

  function renderChrome() {
    renderTabs();
    // Si le panneau Téléchargements est ouvert, rafraîchir la progression.
    if (openOverlay === "panel" && els.panelTitle.textContent === "Téléchargements") {
      const holder = els.panelBody.querySelector("#dlPanelList");
      if (holder) renderDownloadsInto(holder);
    }
    document.body.classList.toggle("inprivate", !!state.isPrivate);
    const badge = document.getElementById("inprivateBadge");
    if (badge) badge.hidden = !state.isPrivate;
    els.btnBack.disabled = !state.canGoBack;
    els.btnForward.disabled = !state.canGoForward;
    els.progress.hidden = !state.loading;
    els.zoomLabel.textContent = `${Math.round((state.zoomFactor || 1) * 100)}%`;
    if (!omniDirty) els.omni.value = displayUrl(state.url);
    els.omni.placeholder = `Rechercher avec ${engineLabel(state.searchEngine)} ou entrer une adresse web`;
    updateOmniIcon(state.url);
  }

  function setBackdrop(on) {
    if (!els.backdrop) return;
    els.backdrop.hidden = false;
    els.backdrop.classList.toggle("open", on);
  }

  function closeAllOverlays() {
    for (const node of [els.menu, els.profileFlyout, els.favoritesDrawer, els.panel]) {
      if (!node) continue;
      node.classList.remove("open");
      node.hidden = true;
    }
    els.panel?.classList.remove("wide");
    els.btnMenu?.setAttribute("aria-expanded", "false");
    els.btnProfile?.classList.remove("active");
    els.favSearchBox?.classList.add("hidden");
    els.favSearchBox && (els.favSearchBox.hidden = true);
    setBackdrop(false);
    openOverlay = null;
    syncChromeBounds();
  }

  function openFlyout(name) {
    const map = {
      menu: { el: els.menu, btn: els.btnMenu, backdrop: true },
      profile: { el: els.profileFlyout, btn: els.btnProfile, backdrop: true },
      favorites: { el: els.favoritesDrawer, btn: null, backdrop: true },
      panel: { el: els.panel, backdrop: true },
    };
    const target = map[name];
    if (!target?.el) return;

    const same = openOverlay === name;
    closeAllOverlays();
    if (same) return;

    target.el.hidden = false;
    requestAnimationFrame(() => target.el.classList.add("open"));
    if (target.btn) {
      target.btn.classList.add("active");
      if (name === "menu") target.btn.setAttribute("aria-expanded", "true");
    }
    if (target.backdrop) setBackdrop(true);
    openOverlay = name;
    overlayOpenedAt = Date.now();
    syncChromeBounds();
  }

  // Ancre le panneau à côté du bouton qui l'a ouvert (rail → gauche,
  // menu → droite), à la hauteur du déclencheur — jamais centré.
  function anchorPanel(y, side) {
    const top = Math.min(Math.max((y ?? 320) - 30, 104), Math.max(120, window.innerHeight - 400));
    els.panel.style.top = `${Math.round(top)}px`;
    if (side === "right") {
      els.panel.style.left = "auto";
      els.panel.style.right = "12px";
    } else {
      els.panel.style.left = "60px";
      els.panel.style.right = "auto";
    }
    els.panel.dataset.side = side === "right" ? "right" : "left";
  }

  function panelOpen(y, side) {
    closeAllOverlays();
    els.panel.classList.remove("wide");
    anchorPanel(y, side);
    els.panel.hidden = false;
    requestAnimationFrame(() => els.panel.classList.add("open"));
    setBackdrop(true);
    openOverlay = "panel";
    overlayOpenedAt = Date.now();
    syncChromeBounds();
  }

  const SETTINGS_ICONS = {
    search:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="9" cy="9" r="5.5"/><path d="M13.5 13.5 17.5 17.5"/></svg>',
    privacy:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2.5 4 4.8v4.4c0 3.7 2.5 6.6 6 8.3 3.5-1.7 6-4.6 6-8.3V4.8z"/><path d="M7.5 9.8l1.8 1.8 3.2-3.4"/></svg>',
    downloads:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5V12M6.6 8.8 10 12.2l3.4-3.4"/><path d="M4 14.5v1a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-1"/></svg>',
    tools:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="4" y="8.5" width="12" height="8" rx="2"/><path d="M7 8.5V6.5a3 3 0 0 1 6 0v2"/></svg>',
    about:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="7"/><path d="M10 9v4.5M10 6.5h.01"/></svg>',
  };

  function switchRow(label, desc, key, value) {
    const row = document.createElement("div");
    row.className = "setting-row";
    row.innerHTML = `
      <div class="s-meta"><strong>${escapeHtml(label)}</strong>${desc ? `<span>${escapeHtml(desc)}</span>` : ""}</div>
      <button type="button" class="switch${value ? " on" : ""}" role="switch" aria-checked="${!!value}" aria-label="${escapeHtml(label)}"></button>`;
    const sw = row.querySelector(".switch");
    sw.addEventListener("click", async () => {
      const next = !sw.classList.contains("on");
      sw.classList.toggle("on", next);
      sw.setAttribute("aria-checked", String(next));
      await api.invoke("settings:set", { [key]: next });
    });
    return row;
  }

  function actionRow(label, desc, btnLabel, onClick, danger) {
    const row = document.createElement("div");
    row.className = "setting-row";
    row.innerHTML = `
      <div class="s-meta"><strong>${escapeHtml(label)}</strong>${desc ? `<span>${escapeHtml(desc)}</span>` : ""}</div>
      <button type="button" class="mini-btn${danger ? " danger" : ""}">${escapeHtml(btnLabel)}</button>`;
    row.querySelector(".mini-btn").addEventListener("click", async (e) => {
      const b = e.currentTarget;
      const done = await onClick();
      if (done) {
        const prev = b.textContent;
        b.textContent = "Fait ✓";
        setTimeout(() => (b.textContent = prev), 1600);
      }
    });
    return row;
  }

  async function showSettings(y, side) {
    panelOpen(y, side);
    els.panel.classList.add("wide");
    els.panelTitle.textContent = "Paramètres";
    els.panelBody.innerHTML = "<div class='panel-empty'>Chargement…</div>";

    const data = (await api.invoke("settings:get")) || {};
    const settings = { doNotTrack: true, blockThirdPartyCookies: false, askSavePath: false, ...data };
    const engines = data.engines || state.searchEngines || [];
    const current = data.searchEngine || state.searchEngine || "ayeba";

    const sections = [
      { id: "search", label: "Recherche", icon: SETTINGS_ICONS.search },
      { id: "privacy", label: "Confidentialité", icon: SETTINGS_ICONS.privacy },
      { id: "downloads", label: "Téléchargements", icon: SETTINGS_ICONS.downloads },
      { id: "tools", label: "Outils Ayeba", icon: SETTINGS_ICONS.tools },
      { id: "about", label: "À propos", icon: SETTINGS_ICONS.about },
    ];

    const content = document.createElement("div");
    content.className = "settings-content";

    function renderSection(id) {
      content.innerHTML = "";
      if (id === "search") {
        content.insertAdjacentHTML(
          "beforeend",
          `<div class="settings-group-title">Moteur de recherche par défaut</div>
           <p class="panel-lead" style="padding:2px 4px 10px">Ayebi (encyclopédie RDC) reste toujours accessible sur ayeba.app/ayebi — distinct de Wikipedia.</p>`,
        );
        for (const eng of engines) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = `panel-item settings-engine${eng.id === current ? " active" : ""}`;
          b.innerHTML = `<strong>${escapeHtml(eng.name)}</strong><span>${eng.id === "ayeba" ? "Recherche mondiale + Ayebi + Wikipedia séparés" : "Moteur externe — Ayebi toujours disponible"}</span>`;
          b.addEventListener("click", async () => {
            await api.invoke("settings:set", { searchEngine: eng.id });
          });
          content.appendChild(b);
        }
      }
      if (id === "privacy") {
        content.insertAdjacentHTML(
          "beforeend",
          '<div class="settings-group-title">Vie privée</div>',
        );
        content.appendChild(
          switchRow("Ne pas suivre (Do Not Track)", "Ajoute l'en-tête DNT à toutes les requêtes envoyées aux sites.", "doNotTrack", settings.doNotTrack),
        );
        content.appendChild(
          switchRow("Bloquer les cookies tiers", "Supprime les cookies déposés par les domaines externes à la page visitée.", "blockThirdPartyCookies", settings.blockThirdPartyCookies),
        );
        content.insertAdjacentHTML("beforeend", '<div class="settings-group-title">Effacer les données</div>');
        content.appendChild(
          actionRow("Historique de navigation", "Vide l'historique local des pages visitées.", "Effacer", async () => {
            await api.invoke("data:clear", { history: true, cache: false });
            return true;
          }),
        );
        content.appendChild(
          actionRow("Cookies et cache", "Déconnecte les sites et vide le cache.", "Effacer", async () => {
            await api.invoke("data:clear", { cookies: true, cache: true, history: false });
            return true;
          }),
        );
        content.appendChild(
          actionRow("Tout effacer", "Cookies, cache, données de sites et historique.", "Tout effacer", async () => {
            await api.invoke("data:clear", { cookies: true, siteData: true, cache: true, history: true });
            return true;
          }, true),
        );
        content.insertAdjacentHTML(
          "beforeend",
          '<p class="panel-note">Les autorisations sensibles (caméra, micro, position, notifications) sont demandées site par site.</p>',
        );
      }
      if (id === "downloads") {
        content.insertAdjacentHTML("beforeend", '<div class="settings-group-title">Téléchargements</div>');
        content.appendChild(
          switchRow("Demander où enregistrer", "Affiche une boîte de dialogue avant chaque téléchargement.", "askSavePath", settings.askSavePath),
        );
        content.appendChild(
          actionRow("Dossier de téléchargement", "Emplacement actuel : dossier Téléchargements de Windows.", "Ouvrir", async () => {
            api.invoke("downloads:show-folder");
            return true;
          }),
        );
        content.appendChild(
          actionRow("Liste des téléchargements", "Efface l'historique de la liste (les fichiers restent sur le disque).", "Effacer", async () => {
            await api.invoke("data:clear", { downloads: true, cache: false, history: false });
            return true;
          }),
        );
      }
      if (id === "tools") {
        content.insertAdjacentHTML("beforeend", '<div class="settings-group-title">Écosystème Ayeba</div>');
        content.appendChild(
          actionRow("Mots de passe", "Coffre local chiffré par Windows (DPAPI) — voir, remplir, supprimer.", "Gérer", async () => {
            await showPasswords(y, side);
            return false;
          }),
        );
        content.appendChild(
          actionRow("Extensions", "Charger et gérer des extensions Chromium réelles.", "Gérer", async () => {
            await showExtensions(y, side);
            return false;
          }),
        );
        content.appendChild(
          actionRow("Compte Ayeba", "Se connecter sur ayeba.app pour synchroniser l'écosystème.", "Ouvrir", async () => {
            api.invoke("nav:go", "https://ayeba.app/compte");
            closeAllOverlays();
            return false;
          }),
        );
      }
      if (id === "about") {
        content.innerHTML = `
          <div class="about-card">
            <div class="about-mark"><svg width="24" height="24" viewBox="0 0 512 512"><defs><linearGradient id="smk" x1="20%" y1="10%" x2="80%" y2="90%"><stop offset="0%" stop-color="#7df0ff"/><stop offset="45%" stop-color="#00b4ff"/><stop offset="100%" stop-color="#e85d04"/></linearGradient></defs><path fill="url(#smk)" d="M256 96 L392 400 H332 L302 324 H210 L180 400 H120 L256 96 Z M228 268 H284 L256 196 Z"/></svg></div>
            <div><strong>AYEBA Browser</strong><p>Version ${escapeHtml(data.version || "")} — navigateur + recherche mondiale.<br/>Moteur : ${escapeHtml(engineLabel(current))} · ayeba.app</p></div>
          </div>`;
        content.appendChild(
          actionRow("Mises à jour", "Rechercher une nouvelle version du navigateur.", "Vérifier", async () => {
            await api.invoke("app:check-update");
            return true;
          }),
        );
      }
    }

    const nav = document.createElement("nav");
    nav.className = "settings-nav";
    for (const s of sections) {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = `${s.icon}${escapeHtml(s.label)}`;
      b.addEventListener("click", () => {
        nav.querySelectorAll("button").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        renderSection(s.id);
      });
      nav.appendChild(b);
    }
    nav.firstChild?.classList.add("active");
    renderSection("search");

    els.panelBody.innerHTML = "";
    els.panelBody.append(nav, content);
  }

  async function showExtensions(y, side) {
    panelOpen(y, side);
    els.panelTitle.textContent = "Extensions";
    els.panelBody.innerHTML = "<div class='panel-empty'>Chargement…</div>";

    const render = async () => {
      const list = (await api.invoke("ext:list")) || [];
      els.panelBody.innerHTML = `
        <p class="panel-lead">Extensions Chromium installées dans ce navigateur. Chargez un dossier contenant un <em>manifest.json</em> — elles sont réellement exécutées par le moteur.</p>
        <div class="panel-form">
          <button type="button" class="panel-cta" id="extLoadBtn">Charger une extension (dossier)</button>
          <p class="panel-note">Les extensions décompressées sont rechargées automatiquement à chaque démarrage.</p>
        </div>
        <div id="extList"></div>`;
      const holder = els.panelBody.querySelector("#extList");
      if (!list.length) {
        holder.innerHTML = '<div class="panel-empty">Aucune extension installée.</div>';
      }
      for (const ext of list) {
        const row = document.createElement("div");
        row.className = "ext-row";
        row.innerHTML = `
          <div class="ext-badge">${escapeHtml((ext.name || "E").slice(0, 1).toUpperCase())}</div>
          <div class="ext-meta"><strong>${escapeHtml(ext.name)}</strong><span>v${escapeHtml(ext.version || "?")} · ${escapeHtml(ext.path || "")}</span></div>
          <div class="row-actions"><button type="button" class="mini-btn danger" data-rm="${escapeHtml(ext.id)}">Retirer</button></div>`;
        holder.appendChild(row);
      }
      els.panelBody.querySelector("#extLoadBtn").addEventListener("click", async () => {
        const r = await api.invoke("ext:load");
        if (r?.error) {
          els.panelBody.querySelector("#extList").insertAdjacentHTML(
            "afterbegin",
            `<p class="panel-note" style="color:var(--danger)">Échec : ${escapeHtml(r.error)}</p>`,
          );
          return;
        }
        if (!r?.cancelled) await render();
      });
      holder.querySelectorAll("[data-rm]").forEach((b) =>
        b.addEventListener("click", async () => {
          await api.invoke("ext:remove", b.dataset.rm);
          await render();
        }),
      );
    };
    await render();
  }

  async function showPasswords(y, side) {
    panelOpen(y, side);
    els.panelTitle.textContent = "Mots de passe";
    els.panelBody.innerHTML = "<div class='panel-empty'>Chargement…</div>";

    const render = async () => {
      const list = (await api.invoke("pass:list")) || [];
      els.panelBody.innerHTML = `
        <p class="panel-lead">Coffre local chiffré par Windows (DPAPI). « Remplir » injecte les identifiants dans le formulaire de connexion de l'onglet actif.</p>
        <div class="panel-form">
          <input type="text" id="pwSite" placeholder="Site (ex : ayeba.app)" />
          <input type="text" id="pwUser" placeholder="Identifiant" />
          <input type="password" id="pwPass" placeholder="Mot de passe" />
          <button type="button" class="panel-cta" id="pwAddBtn">Enregistrer</button>
        </div>
        <div id="passList"></div>`;
      const holder = els.panelBody.querySelector("#passList");
      if (!list.length) holder.innerHTML = '<div class="panel-empty">Aucun mot de passe enregistré.</div>';
      for (const p of list) {
        const row = document.createElement("div");
        row.className = "pass-row";
        row.innerHTML = `
          <div class="ext-badge">${escapeHtml((p.origin || "?").slice(0, 1).toUpperCase())}</div>
          <div class="pass-meta"><strong>${escapeHtml(p.origin)}</strong><span>${escapeHtml(p.username || "")}</span></div>
          <div class="row-actions">
            <button type="button" class="mini-btn" data-fill="${escapeHtml(p.id)}">Remplir</button>
            <button type="button" class="mini-btn" data-copy="${escapeHtml(p.id)}">Copier</button>
            <button type="button" class="mini-btn danger" data-rm="${escapeHtml(p.id)}">Suppr.</button>
          </div>`;
        holder.appendChild(row);
      }
      els.panelBody.querySelector("#pwAddBtn").addEventListener("click", async () => {
        const site = els.panelBody.querySelector("#pwSite").value;
        const user = els.panelBody.querySelector("#pwUser").value;
        const pass = els.panelBody.querySelector("#pwPass").value;
        if (!site || !pass) return;
        await api.invoke("pass:add", { origin: site, username: user, password: pass });
        await render();
      });
      holder.querySelectorAll("[data-fill]").forEach((b) =>
        b.addEventListener("click", async () => {
          const ok = await api.invoke("pass:fill", b.dataset.fill);
          b.textContent = ok ? "Rempli ✓" : "Aucun champ";
          setTimeout(() => (b.textContent = "Remplir"), 1500);
        }),
      );
      holder.querySelectorAll("[data-copy]").forEach((b) =>
        b.addEventListener("click", async () => {
          await api.invoke("pass:copy", b.dataset.copy);
          b.textContent = "Copié ✓";
          setTimeout(() => (b.textContent = "Copier"), 1500);
        }),
      );
      holder.querySelectorAll("[data-rm]").forEach((b) =>
        b.addEventListener("click", async () => {
          await api.invoke("pass:remove", b.dataset.rm);
          await render();
        }),
      );
    };
    await render();
  }

  async function showList(kind, y, side) {
    panelOpen(y, side);
    els.panelTitle.textContent = kind === "favorites" ? "Favoris" : "Historique";
    els.panelBody.innerHTML = "<div class='panel-empty'>Chargement…</div>";

    const items = await api.invoke(kind === "favorites" ? "fav:list" : "history:list");
    if (!items?.length) {
      els.panelBody.innerHTML = `<div class="panel-empty">${kind === "favorites" ? "Aucun favori enregistré" : "Historique vide"}</div>`;
      return;
    }
    els.panelBody.innerHTML = "";
    for (const item of items.slice(0, 100)) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "panel-item";
      b.innerHTML = `<strong>${escapeHtml(item.title || item.url)}</strong><span>${escapeHtml(item.url)}</span>`;
      b.addEventListener("click", () => {
        api.invoke("nav:go", item.url);
        closeAllOverlays();
      });
      els.panelBody.appendChild(b);
    }
  }

  // Téléchargements → panneau ancré au bouton rail, avec actions réelles.
  function showDownloadsPanel(y, side) {
    panelOpen(y, side);
    els.panelTitle.textContent = "Téléchargements";
    els.panelBody.innerHTML = `
      <div class="panel-actions">
        <button type="button" class="mini-btn" id="dlOpenDir">Ouvrir le dossier</button>
        <button type="button" class="mini-btn danger" id="dlClear">Effacer la liste</button>
      </div>
      <div id="dlPanelList"></div>`;
    els.panelBody.querySelector("#dlOpenDir").addEventListener("click", () =>
      api.invoke("downloads:show-folder"),
    );
    els.panelBody.querySelector("#dlClear").addEventListener("click", async () => {
      await api.invoke("data:clear", { downloads: true, cache: false, history: false });
      renderDownloadsInto(els.panelBody.querySelector("#dlPanelList"));
    });
    renderDownloadsInto(els.panelBody.querySelector("#dlPanelList"));
  }

  function buildDlRow(d) {
    const done = d.state === "completed";
    const failed = d.state === "interrupted" || d.state === "cancelled";
    const row = document.createElement("div");
    row.className = "dl-item";
    const pct = d.total > 0 ? Math.min(100, Math.round((d.received / d.total) * 100)) : done ? 100 : 0;
    const isExe = /\.exe$/i.test(d.filename || "");
    const status = done
      ? `${formatBytes(d.total || d.received)} · Terminé`
      : failed
        ? "Téléchargement interrompu"
        : `${pct}% · ${formatBytes(d.received)}`;
    row.innerHTML = `
      <div class="dl-icon${failed ? " fail" : isExe && !done ? " warn" : ""}">${fileIcon(d.filename)}</div>
      <div class="dl-meta">
        <strong>${escapeHtml(d.filename || "Fichier")}</strong>
        <span>${escapeHtml(status)}</span>
        ${isExe && done ? '<span class="dl-warn">Vérifiez la source avant d\'ouvrir ce fichier.</span>' : ""}
        ${!done && !failed ? `<div class="dl-bar"><i style="width:${pct}%"></i></div>` : ""}
      </div>`;
    if (done && d.path) row.addEventListener("click", () => api.invoke("downloads:open", d.path));
    return row;
  }

  function showTabsPanel(y, side) {
    panelOpen(y, side);
    els.panelTitle.textContent = "Onglets ouverts";

    els.panelBody.innerHTML = "";
    for (const t of state.tabs) {
      const row = document.createElement("div");
      row.className = "panel-item tab-manager-row";
      row.innerHTML = `
        <strong>${t.pinned ? "📌 " : ""}${escapeHtml(t.title || "Nouvel onglet")}</strong>
        <span>${escapeHtml(displayUrl(t.url) || "Nouvel onglet")}</span>`;
      row.addEventListener("click", () => {
        api.invoke("tabs:activate", t.id);
        closeAllOverlays();
      });
      const close = document.createElement("button");
      close.type = "button";
      close.className = "tab-mgr-close";
      close.textContent = "×";
      close.title = "Fermer";
      close.addEventListener("click", (e) => {
        e.stopPropagation();
        api.invoke("tabs:close", t.id);
        setTimeout(showTabsPanel, 120);
      });
      row.appendChild(close);
      els.panelBody.appendChild(row);
    }
  }

  function openFind() {
    closeAllOverlays();
    els.findbar.hidden = false;
    syncChromeBounds();
    els.findInput.focus();
    els.findInput.select();
  }

  async function addFavorite() {
    await api.invoke("fav:add");
    els.btnOmniFav?.classList.add("saved");
    setTimeout(() => els.btnOmniFav?.classList.remove("saved"), 900);
  }

  // ── Compte Ayeba réel — même session que le site (cookie partagé) ──
  let account = undefined; // undefined = pas encore chargé

  function applyAccountToOrb(user) {
    const orb = els.btnProfile;
    if (!orb) return;
    const span = orb.querySelector("span");
    if (user) {
      orb.classList.add("signed");
      orb.style.setProperty("--orb-c", user.avatarColor || "#00b4ff");
      if (span) span.textContent = (user.name || "A").trim().charAt(0).toUpperCase() || "A";
    } else {
      orb.classList.remove("signed");
      orb.style.removeProperty("--orb-c");
      if (span) span.textContent = "A";
    }
  }

  async function refreshAccount() {
    try {
      const res = (await api.invoke("account:get")) || {};
      account = res.user || null;
      applyAccountToOrb(account);
    } catch {
      account = null;
    }
  }

  const PROVIDER_LABEL = {
    google: "Via Google",
    github: "Via GitHub",
    microsoft: "Via Microsoft",
    apple: "Via Apple",
    email: "Compte Ayeba",
  };

  // Réplique du panneau « Compte » de ayeba.app : kicker orange, nom grand,
  // email, « VIA … », liens label+hint, déconnexion réelle (cookie supprimé).
  function renderProfileFlyout() {
    const u = account;
    els.profileFlyout.innerHTML = `
      <div class="profile-head">
        <p class="profile-label">Compte</p>
        <strong>${escapeHtml(u?.name || "Invité")}</strong>
        <p>${escapeHtml(u?.email || "Navigateur AYEBA")}</p>
        ${u ? `<p class="profile-via">${escapeHtml(PROVIDER_LABEL[u.provider] || "Compte Ayeba")}</p>` : ""}
      </div>
      ${u ? "" : `<button type="button" class="flyout-cta" data-go="https://ayeba.app/compte">Se connecter à Ayeba</button>`}
      <div class="profile-links">
        ${u ? `
        <button type="button" class="p-link" data-go="https://ayeba.app/compte/applications">
          <span class="p-link-label">Compte Ayeba</span>
          <span class="p-link-hint">Apps connectées · 2FA</span>
        </button>
        <button type="button" class="p-link" data-go="https://ayeba.app/studio/app">
          <span class="p-link-label">Ayeba Studio</span>
          <span class="p-link-hint">Webmaster · Radar</span>
        </button>` : ""}
        <button type="button" class="p-link" data-act="passwords">
          <span class="p-link-label">Mots de passe</span>
          <span class="p-link-hint">Coffre local chiffré</span>
        </button>
        <button type="button" class="p-link" data-act="guest">
          <span class="p-link-label">Naviguer en privé</span>
          <span class="p-link-hint">Fenêtre InPrivate</span>
        </button>
      </div>
      ${u ? `<button type="button" class="p-logout" data-act="logout">Déconnexion</button>` : ""}`;
  }

  // ── Events ──
  els.btnNewTab?.addEventListener("click", () => api.invoke("tabs:new"));
  els.btnBack?.addEventListener("click", () => api.invoke("nav:back"));
  els.btnForward?.addEventListener("click", () => api.invoke("nav:forward"));
  els.btnReload?.addEventListener("click", (e) => api.invoke("nav:reload", e.shiftKey));
  els.btnHome?.addEventListener("click", () => api.invoke("nav:home"));
  els.btnOmniFav?.addEventListener("click", () => addFavorite());
  els.btnProfile?.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (openOverlay === "profile") {
      closeAllOverlays();
      return;
    }
    openFlyout("profile");
    renderProfileFlyout();
    await refreshAccount();
    if (openOverlay === "profile") renderProfileFlyout();
  });

  els.favAddCurrent?.addEventListener("click", async () => {
    await addFavorite();
    await renderFavoritesDrawer(els.favFilter?.value || "");
  });

  els.profileFlyout?.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) {
      api.invoke("nav:go", go.dataset.go);
      closeAllOverlays();
      return;
    }
    const act = e.target.closest("[data-act]");
    if (act?.dataset.act === "passwords") showPasswords(120, "right");
    if (act?.dataset.act === "guest") {
      api.invoke("window:new-private");
      closeAllOverlays();
    }
    if (act?.dataset.act === "logout") {
      void (async () => {
        await api.invoke("account:logout");
        account = null;
        applyAccountToOrb(null);
        renderProfileFlyout();
      })();
    }
  });

  els.favSearch?.addEventListener("click", () => {
    const box = els.favSearchBox;
    if (!box) return;
    box.hidden = !box.hidden;
    if (!box.hidden) els.favFilter?.focus();
  });
  els.favFilter?.addEventListener("input", () => renderFavList(favCache, els.favFilter.value));
  els.favoritesClose?.addEventListener("click", () => closeAllOverlays());

  els.omni?.addEventListener("input", () => {
    omniDirty = true;
  });
  els.omni?.addEventListener("blur", () => {
    omniDirty = false;
  });
  els.omniForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    omniDirty = false;
    api.invoke("nav:go", els.omni.value);
  });

  els.btnMenu?.addEventListener("click", (e) => {
    e.stopPropagation();
    openOverlay === "menu" ? closeAllOverlays() : openFlyout("menu");
  });

  document.addEventListener("click", (e) => {
    if (!openOverlay) return;
    // Le rail agrandit la vue chrome pendant que le clic physique finit :
    // ignorer les clics fantômes juste après l'ouverture d'un overlay.
    if (Date.now() - overlayOpenedAt < 250) return;
    const roots = [els.menu, els.profileFlyout, els.panel];
    const btns = [els.btnMenu, els.btnProfile];
    const inside = roots.some((r) => r && !r.hidden && r.contains(e.target));
    const onBtn = btns.some((b) => b && b.contains(e.target));
    if (openOverlay === "favorites") {
      if (!els.favoritesDrawer?.contains(e.target)) {
        closeAllOverlays();
      }
      return;
    }
    if (!inside && !onBtn) closeAllOverlays();
  });

  els.backdrop?.addEventListener("click", () => {
    if (Date.now() - overlayOpenedAt < 250) return;
    closeAllOverlays();
  });

  els.menu?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "new-tab") api.invoke("tabs:new");
    if (act === "new-window") api.invoke("window:new");
    if (act === "new-private") api.invoke("window:new-private");
    if (act === "zoom-in") api.invoke("zoom:step", 0.1);
    if (act === "zoom-out") api.invoke("zoom:step", -0.1);
    if (act === "favorites") {
      openFlyout("favorites");
      await renderFavoritesDrawer();
    }
    if (act === "history") showList("history", 130, "right");
    if (act === "tab-groups") showTabsPanel(130, "right");
    if (act === "settings") showSettings(130, "right");
    if (act === "extensions") showExtensions(130, "right");
    if (act === "passwords") showPasswords(130, "right");
    if (act === "quit") api.invoke("app:quit");
    if (act === "ayebi") api.invoke("nav:ayebi");
    if (act === "downloads") showDownloadsPanel(140, "right");
    if (act === "find") openFind();
    if (act === "print") api.invoke("page:print");
    if (act === "screenshot") api.invoke("page:screenshot");
    if (act === "clear") {
      await api.invoke("data:clear", { cookies: true, siteData: true, cache: true, history: true });
    }
    if (act === "about") api.invoke("app:about");
    if (!["favorites", "history", "find", "settings", "downloads", "extensions", "passwords"].includes(act)) closeAllOverlays();
  });

  els.panelClose?.addEventListener("click", () => closeAllOverlays());
  els.findNext?.addEventListener("click", () => api.invoke("find:next", els.findInput.value));
  els.findPrev?.addEventListener("click", () => api.invoke("find:prev", els.findInput.value));
  els.findClose?.addEventListener("click", () => {
    els.findbar.hidden = true;
    syncChromeBounds();
    api.invoke("find:stop");
  });
  els.findInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") api.invoke("find:next", els.findInput.value);
    if (e.key === "Escape") {
      els.findbar.hidden = true;
      syncChromeBounds();
      api.invoke("find:stop");
    }
  });
  els.findInput?.addEventListener("input", () => api.invoke("find:start", els.findInput.value));

  window.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === "w") { e.preventDefault(); api.invoke("tabs:close", state.activeId); }
    if (k === "t") { e.preventDefault(); api.invoke("tabs:new"); }
    if (k === "n") { e.preventDefault(); api.invoke(e.shiftKey ? "window:new-private" : "window:new"); }
    if (k === "j") { e.preventDefault(); showDownloadsPanel(280, "left"); }
    if (k === "h") { e.preventDefault(); showList("history"); }
    if (k === "l") { e.preventDefault(); els.omni.focus(); els.omni.select(); }
    if (k === "r") { e.preventDefault(); api.invoke("nav:reload", e.shiftKey); }
    if (k === "f") { e.preventDefault(); openFind(); }
    if (k === "p") { e.preventDefault(); api.invoke("page:print"); }
    if (k === "d") { e.preventDefault(); void addFavorite(); }
    if (k === "o" && e.shiftKey) { e.preventDefault(); openFlyout("favorites"); void renderFavoritesDrawer(); }
    if (e.key === "Tab" && mod) {
      e.preventDefault();
      const tabs = state.tabs;
      if (!tabs.length) return;
      const idx = tabs.findIndex((t) => t.id === state.activeId);
      api.invoke("tabs:activate", tabs[(idx + (e.shiftKey ? -1 : 1) + tabs.length) % tabs.length].id);
    }
  });

  // Actions envoyées par le rail latéral (via le processus principal) —
  // panneaux ancrés à gauche, à la hauteur du bouton cliqué.
  api.on("ui:open", async (payload) => {
    const name = typeof payload === "string" ? payload : payload?.name;
    const y = typeof payload === "object" ? payload?.y : undefined;
    if (name === "tabs") showTabsPanel(y, "left");
    else if (name === "favorites") { openFlyout("favorites"); await renderFavoritesDrawer(); }
    else if (name === "history") showList("history", y, "left");
    else if (name === "downloads") showDownloadsPanel(y, "left");
    else if (name === "extensions") await showExtensions(y, "left");
    else if (name === "passwords") await showPasswords(y, "left");
    else if (name === "settings") await showSettings(y, "left");
  });

  let lastUrl = "";
  api.onState((next) => {
    state = { ...state, ...(next || {}) };
    renderChrome();
    // Une navigation peut avoir créé/détruit la session ayeba.app (login/logout).
    if (state.url !== lastUrl) {
      lastUrl = state.url;
      void refreshAccount();
    }
  });
})();
