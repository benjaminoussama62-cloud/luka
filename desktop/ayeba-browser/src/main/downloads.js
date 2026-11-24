const path = require("path");
const fs = require("fs");
const { app, dialog } = require("electron");
const { state, pushAllChrome } = require("./state");
const { readSettings } = require("./store");

function uniqueDownloadPath(dir, name) {
  let target = path.join(dir, name);
  if (!fs.existsSync(target)) return target;
  const ext = path.extname(name);
  const base = name.slice(0, name.length - ext.length);
  for (let i = 1; i < 1000; i++) {
    target = path.join(dir, `${base} (${i})${ext}`);
    if (!fs.existsSync(target)) return target;
  }
  return target;
}

// Extensions exécutables sous Windows : Chrome les signale comme « pouvant
// endommager votre ordinateur » — même garde ici, l'utilisateur décide.
const DANGEROUS_EXT =
  /\.(exe|msi|bat|cmd|com|scr|pif|cpl|dll|ps1|vbs|vbe|js|jse|wsf|wsh|hta|jar|reg|lnk|application|gadget|msc|msp)$/i;

let downloadPushTimer = null;
function pushDownloadsSoon() {
  if (downloadPushTimer) return;
  downloadPushTimer = setTimeout(() => {
    downloadPushTimer = null;
    pushAllChrome();
  }, 300);
}

async function attachFileIcon(entry, filePath) {
  try {
    const icon = await app.getFileIcon(filePath, { size: "normal" });
    if (!icon.isEmpty()) entry.icon = icon.toDataURL();
  } catch {}
}

const downloadBoundSessions = new WeakSet();
function bindDownloads(ses) {
  if (downloadBoundSessions.has(ses)) return;
  downloadBoundSessions.add(ses);
  ses.on("will-download", (_event, item) => {
    const s = readSettings();
    const downloadsDir = app.getPath("downloads");
    const filename = item.getFilename();

    const assignSavePath = () => {
      if (s.askSavePath) {
        dialog
          .showSaveDialog({ defaultPath: path.join(downloadsDir, filename) })
          .then((r) => {
            if (r.canceled || !r.filePath) item.cancel();
            else item.setSavePath(r.filePath);
          });
      } else {
        item.setSavePath(uniqueDownloadPath(downloadsDir, filename));
      }
    };

    // Le chemin est fixé synchronement pour éviter le dialog natif
    // d'Electron, puis l'utilisateur confirme si le fichier est exécutable ;
    // un refus annule le téléchargement (le partiel est supprimé par Chromium).
    if (!s.askSavePath && DANGEROUS_EXT.test(filename)) {
      const savePath = uniqueDownloadPath(downloadsDir, filename);
      item.setSavePath(savePath);
      dialog
        .showMessageBox({
          type: "warning",
          buttons: ["Conserver", "Annuler"],
          defaultId: 1,
          cancelId: 1,
          noLink: true,
          title: "Fichier potentiellement dangereux",
          message: `« ${filename} » est un fichier exécutable.`,
          detail:
            "Ce type de fichier peut endommager votre ordinateur ou voler vos données. Ne le conservez que si vous faites confiance à sa source.",
        })
        .then((r) => {
          if (r.response !== 0) {
            try {
              item.cancel();
            } catch {}
            try {
              if (fs.existsSync(savePath)) fs.rmSync(savePath);
            } catch {}
          }
        });
    } else {
      assignSavePath();
    }

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      filename,
      url: item.getURL(),
      path: "",
      state: "progressing",
      received: 0,
      total: item.getTotalBytes(),
      dangerous: DANGEROUS_EXT.test(filename),
      at: Date.now(),
    };
    state.downloadLog.unshift(entry);
    if (state.downloadLog.length > 40) state.downloadLog.length = 40;
    item.on("updated", (_e, st) => {
      entry.state = st;
      entry.received = item.getReceivedBytes();
      entry.total = item.getTotalBytes();
      pushDownloadsSoon();
    });
    item.on("done", async (_e, st) => {
      entry.state = st;
      entry.path = item.getSavePath();
      entry.received = item.getTotalBytes();
      if (st === "completed") await attachFileIcon(entry, entry.path);
      if (downloadPushTimer) {
        clearTimeout(downloadPushTimer);
        downloadPushTimer = null;
      }
      pushAllChrome();
    });
    pushAllChrome();
  });
}

module.exports = { bindDownloads, uniqueDownloadPath, DANGEROUS_EXT, pushDownloadsSoon };
