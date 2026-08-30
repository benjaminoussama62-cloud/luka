const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ayebaTab", {
  openInAyeba: (url) => ipcRenderer.invoke("shell:open-external", url),
  search: async (q) => {
    const query = String(q || "").trim();
    if (!query) return;
    const url = await ipcRenderer.invoke("settings:search-url-global", query);
    if (url) window.location.href = url;
  },
  getSettings: () => ipcRenderer.invoke("settings:search-url-global", "").then(() => ipcRenderer.invoke("app:get-paths")),
});
