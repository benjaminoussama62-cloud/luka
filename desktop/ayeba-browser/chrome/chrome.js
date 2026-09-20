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
    btnDownloads: document.getElementById("btnDownloads"),
    btnExtensions: document.getElementById("btnExtensions"),
    btnCopilot: document.getElementById("btnCopilot"),
    btnProfile: document.getElementById("btnProfile"),
    downloadBadge: document.getElementById("downloadBadge"),
    iconSearch: document.querySelector(".icon-search"),
    iconLock: document.querySelector(".icon-lock"),
    zoomLabel: document.getElementById("zoomLabel"),
    profileFlyout: document.getElementById("profileFlyout"),
    downloadsFlyout: document.getElementById("downloadsFlyout"),
    downloadsBody: document.getElementById("downloadsBody"),
    downloadsOpenFolder: document.getElementById("downloadsOpenFolder"),
    downloadsClear: document.getElementById("downloadsClear"),
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
      els.tabs.appendChild(btn);
    }
  }

  function formatBytes(n) {
    const v = Number(n) || 0;
    if (v < 1024) return `${v} o`;
    if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} Ko`;
    return `${(v / (1024 * 1024)).toFixed(1)} Mo`;
  }

  function renderDownloads() {
    const items = state.downloads || [];
    const active = items.some((d) => d.state === "progressing");
    els.downloadBadge.hidden = !active;

    if (!items.length) {
      els.downloadsBody.innerHTML =
        '<div class="empty-state">Les fichiers téléchargés apparaîtront ici.<br/>Ctrl+J pour rouvrir ce panneau.</div>';
      return;
    }

    els.downloadsBody.innerHTML = "";
    for (const d of items) {
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
      els.downloadsBody.appendChild(row);
    }
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
    renderDownloads();
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
    for (const node of [els.menu, els.profileFlyout, els.downloadsFlyout, els.favoritesDrawer, els.panel]) {
      if (!node) continue;
      node.classList.remove("open");
      node.hidden = true;
    }
    els.btnMenu?.setAttribute("aria-expanded", "false");
    [els.btnProfile, els.btnDownloads].forEach((b) => b?.classList.remove("active"));
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
      downloads: { el: els.downloadsFlyout, btn: els.btnDownloads, backdrop: true },
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

  async function showSettings() {
    closeAllOverlays();
    els.panel.hidden = false;
    els.panelTitle.textContent = "Paramètres";
    els.panelBody.innerHTML = "<div class='panel-empty'>Chargement…</div>";
    requestAnimationFrame(() => els.panel.classList.add("open"));
    setBackdrop(true);
    openOverlay = "panel";
    overlayOpenedAt = Date.now();
    syncChromeBounds();

    const data = await api.invoke("settings:get");
    const engines = data?.engines || state.searchEngines || [];
    const current = data?.searchEngine || state.searchEngine || "ayeba";
    els.panelBody.innerHTML = `
      <p class="panel-lead">Moteur de recherche par défaut. Ayebi (encyclopédie RDC) reste toujours accessible sur ayeba.app/ayebi — distinct de Wikipedia.</p>
      <div class="settings-engines"></div>`;
    const group = els.panelBody.querySelector(".settings-engines");
    for (const eng of engines) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `panel-item settings-engine${eng.id === current ? " active" : ""}`;
      b.innerHTML = `<strong>${escapeHtml(eng.name)}</strong><span>${eng.id === "ayeba" ? "Recherche mondiale + Ayebi + Wikipedia séparés" : "Moteur externe — Ayebi toujours disponible"}</span>`;
      b.addEventListener("click", async () => {
        await api.invoke("settings:set", { searchEngine: eng.id });
        closeAllOverlays();
      });
      group.appendChild(b);
    }
  }

  async function showExtensions() {
    closeAllOverlays();
    els.panel.hidden = false;
    els.panelTitle.textContent = "Extensions";
    els.panelBody.innerHTML = "<div class='panel-empty'>Chargement…</div>";
    requestAnimationFrame(() => els.panel.classList.add("open"));
    setBackdrop(true);
    openOverlay = "panel";
    overlayOpenedAt = Date.now();
    syncChromeBounds();

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

  async function showPasswords() {
    closeAllOverlays();
    els.panel.hidden = false;
    els.panelTitle.textContent = "Mots de passe";
    els.panelBody.innerHTML = "<div class='panel-empty'>Chargement…</div>";
    requestAnimationFrame(() => els.panel.classList.add("open"));
    setBackdrop(true);
    openOverlay = "panel";
    overlayOpenedAt = Date.now();
    syncChromeBounds();

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

  async function showList(kind) {
    closeAllOverlays();
    els.panel.hidden = false;
    els.panelTitle.textContent = kind === "favorites" ? "Favoris" : "Historique";
    els.panelBody.innerHTML = "<div class='panel-empty'>Chargement…</div>";
    requestAnimationFrame(() => els.panel.classList.add("open"));
    setBackdrop(true);
    openOverlay = "panel";
    overlayOpenedAt = Date.now();
    syncChromeBounds();

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

  function showTabsPanel() {
    closeAllOverlays();
    els.panel.hidden = false;
    els.panelTitle.textContent = "Onglets ouverts";
    requestAnimationFrame(() => els.panel.classList.add("open"));
    setBackdrop(true);
    openOverlay = "panel";
    overlayOpenedAt = Date.now();
    syncChromeBounds();

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

  // ── Events ──
  els.btnNewTab?.addEventListener("click", () => api.invoke("tabs:new"));
  els.btnBack?.addEventListener("click", () => api.invoke("nav:back"));
  els.btnForward?.addEventListener("click", () => api.invoke("nav:forward"));
  els.btnReload?.addEventListener("click", (e) => api.invoke("nav:reload", e.shiftKey));
  els.btnHome?.addEventListener("click", () => api.invoke("nav:home"));
  els.btnOmniFav?.addEventListener("click", () => addFavorite());
  els.btnCopilot?.addEventListener("click", () => api.invoke("nav:go", "https://ayeba.app/?ai=1"));
  els.btnExtensions?.addEventListener("click", () => showExtensions());

  els.btnProfile?.addEventListener("click", (e) => {
    e.stopPropagation();
    openOverlay === "profile" ? closeAllOverlays() : openFlyout("profile");
  });

  els.btnDownloads?.addEventListener("click", (e) => {
    e.stopPropagation();
    openOverlay === "downloads" ? closeAllOverlays() : openFlyout("downloads");
  });

  els.favAddCurrent?.addEventListener("click", async () => {
    await addFavorite();
    await renderFavoritesDrawer(els.favFilter?.value || "");
  });

  els.downloadsOpenFolder?.addEventListener("click", () => api.invoke("downloads:show-folder"));
  els.downloadsClear?.addEventListener("click", () => {
    state.downloads = [];
    renderDownloads();
  });

  els.profileFlyout?.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) {
      api.invoke("nav:go", go.dataset.go);
      closeAllOverlays();
      return;
    }
    const act = e.target.closest("[data-act]");
    if (act?.dataset.act === "settings") showSettings();
    if (act?.dataset.act === "passwords") showPasswords();
    if (act?.dataset.act === "guest") {
      api.invoke("window:new-private");
      closeAllOverlays();
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
    const roots = [els.menu, els.profileFlyout, els.downloadsFlyout, els.panel];
    const btns = [els.btnMenu, els.btnProfile, els.btnDownloads];
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
    if (act === "history") showList("history");
    if (act === "tab-groups") showTabsPanel();
    if (act === "settings") showSettings();
    if (act === "extensions") showExtensions();
    if (act === "passwords") showPasswords();
    if (act === "quit") api.invoke("app:quit");
    if (act === "ayebi") api.invoke("nav:ayebi");
    if (act === "downloads") openFlyout("downloads");
    if (act === "find") openFind();
    if (act === "print") api.invoke("page:print");
    if (act === "screenshot") api.invoke("page:screenshot");
    if (act === "clear") {
      await api.invoke("data:clear");
      await api.invoke("history:clear");
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
    if (k === "j") { e.preventDefault(); openFlyout("downloads"); }
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

  // Actions envoyées par le rail latéral (via le processus principal).
  api.on("ui:open", async (name) => {
    if (name === "tabs") showTabsPanel();
    else if (name === "favorites") { openFlyout("favorites"); await renderFavoritesDrawer(); }
    else if (name === "history") showList("history");
    else if (name === "downloads") openFlyout("downloads");
    else if (name === "extensions") await showExtensions();
    else if (name === "passwords") await showPasswords();
    else if (name === "settings") await showSettings();
  });

  api.onState((next) => {
    state = { ...state, ...(next || {}) };
    renderChrome();
  });
})();
