/* global ayebaBrowser */
(() => {
  const api = window.ayebaBrowser;
  const els = {
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
    btnFav: document.getElementById("btnFav"),
    btnAyebi: document.getElementById("btnAyebi"),
    btnProfile: document.getElementById("btnProfile"),
    bookmarksBar: document.getElementById("bookmarksBar"),
    omniIcon: document.getElementById("omniIcon"),
    iconSearch: document.querySelector(".icon-search"),
    iconLock: document.querySelector(".icon-lock"),
    zoomLabel: document.getElementById("zoomLabel"),
    panel: document.getElementById("panel"),
    panelTitle: document.getElementById("panelTitle"),
    panelBody: document.getElementById("panelBody"),
    panelClose: document.getElementById("panelClose"),
    findbar: document.getElementById("findbar"),
    findInput: document.getElementById("findInput"),
    findNext: document.getElementById("findNext"),
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
  };
  let omniDirty = false;

  function displayUrl(url) {
    if (!url) return "";
    if (url.startsWith("file:") && url.includes("/newtab/")) return "";
    try {
      const u = new URL(url);
      return u.href;
    } catch {
      return url;
    }
  }

  function renderTabs() {
    els.tabs.innerHTML = "";
    for (const tab of state.tabs) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `tab${tab.active ? " active" : ""}`;
      btn.title = tab.title;

      const fav = document.createElement(tab.favicon ? "img" : "span");
      fav.className = "tab-fav";
      if (tab.favicon) {
        fav.src = tab.favicon;
        fav.alt = "";
      }

      const title = document.createElement("span");
      title.className = "tab-title";
      title.textContent = tab.title || "Onglet";

      const close = document.createElement("button");
      close.type = "button";
      close.className = "tab-close";
      close.textContent = "×";
      close.addEventListener("click", (e) => {
        e.stopPropagation();
        api.invoke("tabs:close", tab.id);
      });

      btn.append(fav, title, close);
      btn.addEventListener("click", () => api.invoke("tabs:activate", tab.id));
      els.tabs.appendChild(btn);
    }
  }

  function engineLabel(id) {
    return state.searchEngines.find((e) => e.id === id)?.name || "Ayeba";
  }

  function updateOmniIcon(url) {
    const secure = url && url.startsWith("https://");
    if (els.iconSearch) els.iconSearch.hidden = secure;
    if (els.iconLock) els.iconLock.hidden = !secure;
  }

  function renderChrome() {
    renderTabs();
    els.btnBack.disabled = !state.canGoBack;
    els.btnForward.disabled = !state.canGoForward;
    els.progress.hidden = !state.loading;
    els.zoomLabel.textContent = `${Math.round((state.zoomFactor || 1) * 100)}%`;
    if (!omniDirty) els.omni.value = displayUrl(state.url);
    els.omni.placeholder = `Rechercher avec ${engineLabel(state.searchEngine)} ou saisir une adresse`;
    updateOmniIcon(state.url);
  }

  function closeMenus() {
    els.menu.hidden = true;
    els.btnMenu.setAttribute("aria-expanded", "false");
  }

  async function showSettings() {
    closeMenus();
    els.panel.hidden = false;
    els.panelTitle.textContent = "Paramètres";
    const data = await api.invoke("settings:get");
    const engines = data?.engines || state.searchEngines || [];
    const current = data?.searchEngine || state.searchEngine || "ayeba";
    els.panelBody.innerHTML = `
      <p class="panel-lead">Moteur par défaut dans la barre d’adresse. Ayebi reste sur ayeba.app/ayebi — comme Wikipedia mondial.</p>
      <div class="settings-engines" role="radiogroup"></div>
    `;
    const group = els.panelBody.querySelector(".settings-engines");
    for (const eng of engines) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `panel-item settings-engine${eng.id === current ? " active" : ""}`;
      b.innerHTML = `<strong>${escapeHtml(eng.name)}</strong><span>${eng.id === "ayeba" ? "Recherche + Ayebi + Wikipedia" : "Recherche externe — Ayebi toujours disponible"}</span>`;
      b.addEventListener("click", async () => {
        await api.invoke("settings:set", { searchEngine: eng.id });
        els.panel.hidden = true;
      });
      group.appendChild(b);
    }
  }

  async function showList(kind) {
    closeMenus();
    els.panel.hidden = false;
    els.panelTitle.textContent = kind === "favorites" ? "Favoris" : "Historique";
    els.panelBody.innerHTML = "<div class='panel-empty'>Chargement…</div>";
    const items = await api.invoke(kind === "favorites" ? "fav:list" : "history:list");
    if (!items?.length) {
      els.panelBody.innerHTML = `<div class="panel-empty">${kind === "favorites" ? "Aucun favori" : "Aucun historique"}</div>`;
      return;
    }
    els.panelBody.innerHTML = "";
    for (const item of items.slice(0, 80)) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "panel-item";
      b.innerHTML = `<strong>${escapeHtml(item.title || item.url)}</strong><span>${escapeHtml(item.url)}</span>`;
      b.addEventListener("click", () => {
        api.invoke("nav:go", item.url);
        els.panel.hidden = true;
      });
      els.panelBody.appendChild(b);
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function openFind() {
    closeMenus();
    els.findbar.hidden = false;
    els.findInput.focus();
    els.findInput.select();
  }

  els.btnNewTab.addEventListener("click", () => api.invoke("tabs:new"));
  els.btnBack.addEventListener("click", () => api.invoke("nav:back"));
  els.btnForward.addEventListener("click", () => api.invoke("nav:forward"));
  els.btnReload.addEventListener("click", (e) => api.invoke("nav:reload", e.shiftKey));
  els.btnHome.addEventListener("click", () => api.invoke("nav:home"));
  els.btnAyebi.addEventListener("click", () => api.invoke("nav:ayebi"));
  els.btnProfile.addEventListener("click", () => api.invoke("nav:go", "https://ayeba.app/compte"));
  els.bookmarksBar?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-url]");
    if (btn) api.invoke("nav:go", btn.dataset.url);
  });
  els.btnFav.addEventListener("click", async () => {
    await api.invoke("fav:add");
    els.btnFav.classList.add("fav-saved");
    setTimeout(() => els.btnFav.classList.remove("fav-saved"), 800);
  });

  els.omni.addEventListener("input", () => {
    omniDirty = true;
  });
  els.omni.addEventListener("blur", () => {
    omniDirty = false;
  });
  els.omniForm.addEventListener("submit", (e) => {
    e.preventDefault();
    omniDirty = false;
    api.invoke("nav:go", els.omni.value);
  });

  els.btnMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = els.menu.hidden;
    els.menu.hidden = !open;
    els.btnMenu.setAttribute("aria-expanded", open ? "true" : "false");
    els.panel.hidden = true;
  });

  document.addEventListener("click", (e) => {
    if (!els.menu.hidden && !els.menu.contains(e.target) && e.target !== els.btnMenu) closeMenus();
  });

  els.menu.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "new-tab") api.invoke("tabs:new");
    if (act === "new-window") api.invoke("window:new");
    if (act === "zoom-in") api.invoke("zoom:step", 0.1);
    if (act === "zoom-out") api.invoke("zoom:step", -0.1);
    if (act === "favorites") showList("favorites");
    if (act === "history") showList("history");
    if (act === "settings") showSettings();
    if (act === "ayebi") api.invoke("nav:ayebi");
    if (act === "downloads") api.invoke("shell:open-downloads");
    if (act === "find") openFind();
    if (act === "print") api.invoke("page:print");
    if (act === "clear") {
      await api.invoke("data:clear");
      await api.invoke("history:clear");
      alert("Données de navigation effacées.");
    }
    if (act === "about") api.invoke("app:about");
    if (!["favorites", "history", "find", "settings"].includes(act)) closeMenus();
  });

  els.panelClose.addEventListener("click", () => {
    els.panel.hidden = true;
  });

  els.findNext.addEventListener("click", () => api.invoke("find:next", els.findInput.value));
  els.findClose.addEventListener("click", () => {
    els.findbar.hidden = true;
    api.invoke("find:stop");
  });
  els.findInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") api.invoke("find:next", els.findInput.value);
    if (e.key === "Escape") {
      els.findbar.hidden = true;
      api.invoke("find:stop");
    }
  });

  window.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    if (e.key.toLowerCase() === "w") {
      e.preventDefault();
      api.invoke("tabs:close", state.activeId);
    }
    if (e.key.toLowerCase() === "t") {
      e.preventDefault();
      api.invoke("tabs:new");
    }
    if (e.key.toLowerCase() === "n") {
      e.preventDefault();
      api.invoke("window:new");
    }
    if (e.key.toLowerCase() === "l") {
      e.preventDefault();
      els.omni.focus();
      els.omni.select();
    }
    if (e.key.toLowerCase() === "r") {
      e.preventDefault();
      api.invoke("nav:reload", e.shiftKey);
    }
    if (e.key.toLowerCase() === "f") {
      e.preventDefault();
      openFind();
    }
    if (e.key.toLowerCase() === "p") {
      e.preventDefault();
      api.invoke("page:print");
    }
    if (e.key === "Tab" && e.ctrlKey) {
      e.preventDefault();
      const tabs = state.tabs;
      if (!tabs.length) return;
      const idx = tabs.findIndex((t) => t.id === state.activeId);
      const next = tabs[(idx + (e.shiftKey ? -1 : 1) + tabs.length) % tabs.length];
      api.invoke("tabs:activate", next.id);
    }
  });

  api.onState((next) => {
    state = next || state;
    renderChrome();
  });
})();
