const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ayebaBrowser", {
  onState: (cb) => {
    const listener = (_e, state) => cb(state);
    ipcRenderer.on("browser:state", listener);
    return () => ipcRenderer.removeListener("browser:state", listener);
  },
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  getPaths: () => ipcRenderer.invoke("app:get-paths"),
});
