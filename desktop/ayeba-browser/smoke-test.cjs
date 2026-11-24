const Module = require('module');
const os = require('os'), path = require('path'), fs = require('fs');
const testDir = path.join(os.tmpdir(), 'ayeba-test-' + Date.now());
const noop = () => {};
const captured = {};
const mkSession = (name) => ({
  _name: name,
  webRequest: {
    onBeforeRequest: (cb) => { captured[name + ':beforeRequest'] = cb; },
    onBeforeSendHeaders: (cb) => { captured[name + ':beforeSend'] = cb; },
    onHeadersReceived: (cb) => { captured[name + ':headersRecv'] = cb; },
  },
  setPermissionRequestHandler: (cb) => { captured[name + ':permReq'] = cb; },
  setPermissionCheckHandler: (cb) => { captured[name + ':permCheck'] = cb; },
  on: noop, cookies: { get: async () => [], remove: async () => {} },
  getAllExtensions: () => [], loadExtension: async () => ({ id: 'x' }),
  clearCache: async () => {}, clearStorageData: async () => {}, downloadURL: noop,
});
const defaultSes = mkSession('def');
const wcStub = () => ({
  id: Math.floor(Math.random() * 1e6), loadURL: async () => {},
  on: noop, once: noop, send: noop, focus: noop, isDestroyed: () => false,
  getURL: () => 'https://ayeba.app/', getTitle: () => 'AYEBA',
  getZoomFactor: () => 1, setZoomFactor: noop, reload: noop, reloadIgnoringCache: noop,
  goBack: noop, goForward: noop, findInPage: noop, stopFindInPage: noop, print: noop,
  capturePage: async () => ({ toPNG: () => Buffer.from('x'), getSize: () => ({ width: 1, height: 1 }) }),
  executeJavaScript: async () => true, copyImageAt: noop, replaceMisspelling: noop,
  inspectElement: noop, openDevTools: noop, setWindowOpenHandler: noop,
  savePage: async () => {}, delete: noop, close: noop,
  navigationHistory: { canGoBack: () => false, canGoForward: () => false },
  session: { on: noop, downloadURL: noop, addWordToSpellCheckerDictionary: noop },
});
const electron = {
  app: { setName: noop, setPath: noop, getPath: () => testDir, getVersion: () => '9.9.9-test',
    isPackaged: false, requestSingleInstanceLock: () => true, commandLine: { appendSwitch: noop },
    whenReady: () => Promise.resolve(), on: noop, quit: noop, relaunch: noop, exit: noop,
    disableHardwareAcceleration: noop, setAppUserModelId: noop, getFileIcon: async () => ({ isEmpty: () => true }) },
  BaseWindow: function () { return {
    contentView: { addChildView: noop, removeChildView: noop },
    getContentBounds: () => ({ width: 1280, height: 840 }),
    on: noop, once: (e, cb) => { if (e === 'ready-to-show') setTimeout(cb, 0); },
    isDestroyed: () => false, isVisible: () => true, isMinimized: () => false,
    show: noop, focus: noop, restore: noop }; },
  WebContentsView: function () { return { webContents: wcStub(), setBackgroundColor: noop, setBounds: noop, setVisible: noop }; },
  session: { fromPartition: () => mkSession('priv'), defaultSession: defaultSes },
  nativeTheme: {}, Menu: { setApplicationMenu: noop, buildFromTemplate: () => ({ popup: noop }) },
  dialog: { showErrorBox: noop, showMessageBox: async () => ({ response: 0 }),
    showSaveDialog: async () => ({ canceled: true }), showOpenDialog: async () => ({ canceled: true, filePaths: [] }) },
  ipcMain: { handle: noop }, shell: { openPath: noop, openExternal: noop },
  safeStorage: { isEncryptionAvailable: () => false },
  clipboard: { writeText: noop, readText: () => '', clear: noop },
  net: { fetch: async () => ({ json: async () => ({}) }) },
  webContents: { fromId: () => null },
};
const orig = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'electron') return electron;
  if (request === 'electron-updater') return { autoUpdater: { setFeedURL: noop, on: noop, checkForUpdates: async () => ({}), quitAndInstall: noop } };
  return orig.call(this, request, ...rest);
};
const call = (cb, details) => new Promise((res) => cb(details, res));

(async () => {
  require('./src/main.js');
  await new Promise((r) => setTimeout(r, 60));
  const { state } = require('./src/main/state');
  const w = [...state.windows][0];
  if (!w) throw new Error('no window');
  const h = w.handlers;
  let fail = 0;
  const check = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) fail++; };

  // 1. Blocage tracker réel
  const before = captured['def:beforeRequest'];
  let r = await call(before, { url: 'https://criteo.com/pixel?x=1', resourceType: 'image', webContentsId: 42 });
  check('tracker annulé (criteo)', r && r.cancel === true);
  r = await call(before, { url: 'https://sub.doubleclick.net/x', resourceType: 'script', webContentsId: 42 });
  check('tracker annulé (sous-domaine doubleclick)', r && r.cancel === true);
  r = await call(before, { url: 'https://ayeba.app/api', resourceType: 'xhr', webContentsId: 42 });
  check('site légitime passe', r && !r.cancel && !r.redirectURL);
  const { trackerBlockedCount } = require('./src/main/privacy');
  check('compteur bloqués = 2', trackerBlockedCount(42) === 2);

  // 2. HTTPS-First
  r = await call(before, { url: 'http://example.cd/page', resourceType: 'mainFrame', webContentsId: 1 });
  check('http mainFrame → https', r && r.redirectURL === 'https://example.cd/page');
  r = await call(before, { url: 'http://cdn.example.cd/x.js', resourceType: 'script', webContentsId: 1 });
  check('http subresource intacte', r && !r.redirectURL);
  const { shouldFallbackToHttp, httpUrlFor } = require('./src/main/privacy');
  check('fallback https→http sur erreur connexion', shouldFallbackToHttp(-107, 'https://example.cd/page') === true);
  check('PAS de fallback sur erreur certificat (-201)', shouldFallbackToHttp(-201, 'https://example2.cd/') === false);
  check('httpUrlFor', httpUrlFor('https://a.cd/p?q=1') === 'http://a.cd/p?q=1');
  r = await call(before, { url: 'http://example.cd/x', resourceType: 'mainFrame', webContentsId: 1 });
  check('domaine en fallback non redirigé', r && !r.redirectURL);

  // 3. Referer trim
  const beforeSend = captured['def:beforeSend'];
  r = await call(beforeSend, { url: 'https://other.com/img.png', requestHeaders: { Referer: 'https://ayeba.app/mail/boite/secret?q=x' } });
  check('referer cross-site → origine seule', r.requestHeaders.Referer === 'https://ayeba.app/');
  check('DNT posé', r.requestHeaders.DNT === '1');
  r = await call(beforeSend, { url: 'https://ayeba.app/api/x', requestHeaders: { Referer: 'https://ayeba.app/mail/x' } });
  check('referer same-site intact', r.requestHeaders.Referer === 'https://ayeba.app/mail/x');

  // 4. Permissions persistées + revoke
  const permReq = captured['def:permReq'];
  electron.dialog.showMessageBox = async () => ({ response: 1 }); // « Autoriser »
  let permResult;
  await permReq({ getURL: () => 'https://meet.io/' }, 'media', (v) => { permResult = v; }, { requestingUrl: 'https://meet.io/' });
  check('permission media consentie via dialog', permResult === true);
  let perms = h['perm:list']();
  check('perm:list contient meet.io', perms.some((p) => p.origin === 'https://meet.io' && p.permission === 'media' && p.allowed));
  perms = h['perm:revoke'](null, 'https://meet.io:media');
  check('perm:revoke supprime', !perms.some((p) => p.key === 'https://meet.io:media'));
  // refus persistant
  electron.dialog.showMessageBox = async () => ({ response: 0 });
  await permReq({ getURL: () => 'https://cam.io/' }, 'media', (v) => { permResult = v; }, { requestingUrl: 'https://cam.io/' });
  check('permission refusée enregistrée', h['perm:list']().some((p) => p.origin === 'https://cam.io' && !p.allowed));

  // 5. Session restore
  const { writeSessionTabs } = require('./src/main/store');
  writeSessionTabs(['https://a.cd/', 'https://b.cd/'], 1);
  state.windows.delete(w);
  const { createBrowserWindow } = require('./src/main/window');
  const w2 = createBrowserWindow();
  check('session restaurée (2 onglets)', w2.tabs.length === 2);

  // 6. Fenêtre suivante ne restaure PAS (déjà une fenêtre ouverte)
  const w3 = createBrowserWindow();
  check('2e fenêtre → accueil seul', w3.tabs.length === 1);

  // 7. InPrivate ne restaure jamais
  state.windows.clear();
  const wp = createBrowserWindow(true);
  check('InPrivate → accueil seul', wp.tabs.length === 1);

  fs.rmSync(testDir, { recursive: true, force: true });
  console.log(fail === 0 ? '=== ALL PASS ===' : '=== ' + fail + ' FAILURES ===');
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('FAIL:', e.stack); process.exit(1); });
