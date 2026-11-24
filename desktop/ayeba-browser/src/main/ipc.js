const { ipcMain } = require("electron");
const { state } = require("./state");
const { HOME_URL } = require("./paths");
const { readSettings } = require("./store");
const { buildSearchUrl, engineList } = require("./search");

// Canaux exposés au chrome/rail uniquement : le preload des onglets n'a
// aucun invoke générique (preload-tab.js n'expose que search + getPaths).
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
    "history:searches",
    "suggest:get",
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
    "perm:list",
    "perm:revoke",
    "settings:search-url",
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
    "app:check-update",
    "account:get",
    "account:logout",
    "update:install",
  ];

  for (const channel of channels) {
    ipcMain.handle(channel, (event, ...args) => {
      const winState = [...state.windows].find(
        (w) =>
          w.chrome?.webContents?.id === event.sender.id ||
          w.rail?.webContents?.id === event.sender.id,
      );
      if (!winState) return null;
      const fn = winState.handlers[channel];
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

module.exports = { bindIpc };
