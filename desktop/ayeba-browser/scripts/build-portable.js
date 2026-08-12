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

rm(dist);
mkdir(outDir);
console.log("Copy Electron runtime…");
copyDir(electronDist, outDir);

const exeSrc = path.join(outDir, "electron.exe");
const exeDst = path.join(outDir, "AYEBA.exe");
fs.renameSync(exeSrc, exeDst);

const defaultAsar = path.join(outDir, "resources", "default_app.asar");
rm(defaultAsar);

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
    "1. Double-cliquez AYEBA.exe",
    "2. Si Windows SmartScreen apparaît : Informations complémentaires → Exécuter quand même",
    "",
    "Site : https://ayeba.app",
    "Téléchargement : https://ayeba.app/telecharger",
    "",
  ].join("\r\n"),
  "utf8",
);

const zipPath = path.join(dist, `${outName}.zip`);
rm(zipPath);
console.log("Zip…");
execSync(
  `powershell -NoProfile -Command "Compress-Archive -Path '${outDir.replace(/'/g, "''")}' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force"`,
  { stdio: "inherit" },
);

const st = fs.statSync(zipPath);
console.log("OK", zipPath, `(${Math.round(st.size / 1024 / 1024)} Mo)`);
