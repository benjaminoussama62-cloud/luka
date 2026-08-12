/**
 * Build a portable AYEBA Windows folder + zip without electron-builder unpack race (EPERM).
 * Output: dist/AYEBA-Portable-1.0.0/ and dist/AYEBA-Portable-1.0.0.zip
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const version = require(path.join(root, "package.json")).version;
const outName = `AYEBA-Portable-${version}`;
const dist = path.join(root, "dist");
const outDir = path.join(dist, outName);
const electronDist = path.join(root, "node_modules", "electron", "dist");

function rm(p) {
  fs.rmSync(p, { recursive: true, force: true });
}
function mkdir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function copyDir(src, dest) {
  mkdir(dest);
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === "dist" || ent.name === ".git") continue;
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(path.join(electronDist, "electron.exe"))) {
  console.error("electron dist missing — run npm install");
  process.exit(1);
}

rm(outDir);
const zipPath = path.join(dist, `${outName}.zip`);
rm(zipPath);
mkdir(dist);
mkdir(outDir);
console.log("Copy Electron runtime…");
copyDir(electronDist, outDir);

const exeSrc = path.join(outDir, "electron.exe");
const exeDst = path.join(outDir, "AYEBA.exe");
fs.renameSync(exeSrc, exeDst);

// Sinon Electron peut charger l’app par défaut au lieu de resources/app
const defaultAsar = path.join(outDir, "resources", "default_app.asar");
if (fs.existsSync(defaultAsar)) fs.unlinkSync(defaultAsar);

const localesDir = path.join(outDir, "locales");
if (fs.existsSync(localesDir)) {
  for (const f of fs.readdirSync(localesDir)) {
    if (!["fr.pak", "en-US.pak"].includes(f)) fs.unlinkSync(path.join(localesDir, f));
  }
}

// App as unpacked resources/app (simple, reliable)
const appDir = path.join(outDir, "resources", "app");
rm(appDir);
mkdir(appDir);
for (const item of ["src", "chrome", "newtab", "assets", "package.json"]) {
  const s = path.join(root, item);
  const d = path.join(appDir, item);
  if (fs.statSync(s).isDirectory()) copyDir(s, d);
  else fs.copyFileSync(s, d);
}

// Prefer icon next to exe for Windows taskbar
const ico = path.join(root, "assets", "icon.ico");
if (fs.existsSync(ico)) fs.copyFileSync(ico, path.join(outDir, "AYEBA.ico"));

fs.writeFileSync(
  path.join(outDir, "LIRE-MOI.txt"),
  [
    "AYEBA Browser " + version,
    "",
    "INSTALLATION",
    "1. Extrayez TOUT le dossier (AYEBA.exe + resources + DLL doivent rester ensemble).",
    "2. Double-cliquez AYEBA.exe (ou LANCER-AYEBA.bat pour voir les erreurs).",
    "",
    "SI L’APP NE S’OUVRE PAS",
    "• SmartScreen : clic droit AYEBA.exe → Propriétés → cocher « Débloquer » → OK.",
    "• Ou au premier lancement : Informations complémentaires → Exécuter quand même.",
    "• Fermez les AYEBA déjà ouverts (Gestionnaire des tâches).",
    "• Journal : %APPDATA%\\AyebaBrowser\\ayeba.log",
    "",
    "Site : https://ayeba.app",
    "Téléchargement : https://ayeba.app/telecharger",
    "",
  ].join("\r\n"),
  "utf8",
);

fs.writeFileSync(
  path.join(outDir, "LANCER-AYEBA.bat"),
  [
    "@echo off",
    "cd /d \"%~dp0\"",
    "title AYEBA Browser",
    "echo.",
    "echo === AYEBA Browser ===",
    "echo.",
    "powershell -NoProfile -Command \"Unblock-File -LiteralPath '%~dp0AYEBA.exe' -ErrorAction SilentlyContinue\"",
    "echo Si 360 Total Security / antivirusirus bloque : ajoutez ce dossier en exception.",
    "echo.",
    "start \"\" \"%~dp0AYEBA.exe\"",
    "timeout /t 3 /nobreak >nul",
    "tasklist /FI \"IMAGENAME eq AYEBA.exe\" | find /I \"AYEBA.exe\" >nul",
    "if errorlevel 1 (",
    "  echo.",
    "  echo AYEBA ne tourne pas. Causes frequentes :",
    "  echo  - Antivirus 360 qui tue le processus",
    "  echo  - Extraction incomplete du ZIP",
    "  echo  - Journal : %%APPDATA%%\\AyebaBrowser\\ayeba.log",
    "  echo  - Bureau : AYEBA-ERREUR.txt",
    "  echo.",
    "  pause",
    ")",
    "",
  ].join("\r\n"),
  "utf8",
);

console.log("Zip…");
execSync(
  `powershell -NoProfile -Command "Compress-Archive -Path '${outDir.replace(/'/g, "''")}' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force"`,
  { stdio: "inherit" },
);

const st = fs.statSync(zipPath);
console.log("OK", zipPath, `(${Math.round(st.size / 1024 / 1024)} Mo)`);
