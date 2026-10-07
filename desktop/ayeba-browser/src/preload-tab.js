const { contextBridge, ipcRenderer } = require("electron");

// Surface volontairement minimale : ce preload tourne sur TOUTES les pages
// web — n'exposer ici que des appels sans risque (jamais pass:*, data:clear…).
// Les canaux sensibles exigent d'ailleurs l'émetteur chrome/rail côté main.
contextBridge.exposeInMainWorld("ayebaTab", {
  search: async (q) => {
    const query = String(q || "").trim();
    if (!query) return;
    const url = await ipcRenderer.invoke("settings:search-url-global", query);
    if (url) window.location.href = url;
  },
  getPaths: () => ipcRenderer.invoke("app:get-paths"),
});
