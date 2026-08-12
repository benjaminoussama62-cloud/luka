const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ayebaTab", {
  openInAyeba: (url) => ipcRenderer.invoke("shell:open-external", url),
  search: (q) => {
    const query = String(q || "").trim();
    if (!query) return;
    window.location.href = `https://ayeba.app/?q=${encodeURIComponent(query)}`;
  },
});
