// Génère les icônes du lanceur Android (legacy + adaptatives) depuis store/icon-mail.svg.
// Usage : node scripts/gen-icons.js   (nécessite `sharp` — dispo via la racine du projet)
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const RES = path.join(ROOT, "android/app/src/main/res");
const ICON_SRC = path.join(ROOT, "store/icon-mail.svg");

// densité -> taille icône legacy (px) / taille foreground adaptatif (px)
const DENSITIES = {
  "mipmap-mdpi": { launcher: 48, foreground: 108 },
  "mipmap-hdpi": { launcher: 72, foreground: 162 },
  "mipmap-xhdpi": { launcher: 96, foreground: 216 },
  "mipmap-xxhdpi": { launcher: 144, foreground: 324 },
  "mipmap-xxxhdpi": { launcher: 192, foreground: 432 },
};

const GRADIENT = `<linearGradient id="ayebaA" x1="20%" y1="10%" x2="80%" y2="90%">
    <stop offset="0%" stop-color="#7df0ff"/>
    <stop offset="45%" stop-color="#00b4ff"/>
    <stop offset="100%" stop-color="#e85d04"/>
  </linearGradient>`;

const BG_GRADIENT = `<linearGradient id="ayebaBg" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#0a0a0e"/>
    <stop offset="100%" stop-color="#12141c"/>
  </linearGradient>`;

// Foreground adaptatif : contour arrondi (rentré à ~13% pour survivre au masque)
// + enveloppe AGRANDIE (×1.15) — le contenu remplit la tuile comme les autres
// applis, le fond dégradé vient du layer background (drawable plein cadre).
const foregroundSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="${size}" height="${size}">
  <defs>${GRADIENT}</defs>
  <rect x="13" y="13" width="82" height="82" rx="17" fill="none" stroke="rgba(0,180,255,0.35)" stroke-width="1.6"/>
  <g transform="translate(54,54) scale(0.2426) translate(-256,-256)">
    <rect x="104" y="158" width="304" height="196" rx="30" fill="none" stroke="url(#ayebaA)" stroke-width="24"/>
    <path d="M118 182 L256 296 L394 182" fill="none" stroke="url(#ayebaA)" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

// Background adaptatif : le dégradé sombre du logo, plein cadre (drawable —
// certains launchers réduisent les icônes dont le fond est une simple couleur).
const backgroundSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="${size}" height="${size}">
  <defs>${BG_GRADIENT}</defs>
  <rect width="108" height="108" fill="url(#ayebaBg)"/>
</svg>`;

(async () => {
  const fullIcon = fs.readFileSync(ICON_SRC);
  for (const [dir, sizes] of Object.entries(DENSITIES)) {
    const out = path.join(RES, dir);
    const legacy = await sharp(fullIcon, { density: 400 })
      .resize(sizes.launcher, sizes.launcher)
      .png()
      .toBuffer();
    await sharp(legacy).toFile(path.join(out, "ic_launcher.png"));
    await sharp(legacy).toFile(path.join(out, "ic_launcher_round.png"));
    await sharp(Buffer.from(foregroundSvg(sizes.foreground)))
      .png()
      .toFile(path.join(out, "ic_launcher_foreground.png"));
    await sharp(Buffer.from(backgroundSvg(sizes.foreground)))
      .png()
      .toFile(path.join(out, "ic_launcher_background.png"));
    console.log(`${dir}: launcher ${sizes.launcher}px, foreground ${sizes.foreground}px`);
  }
  // Splash système transparent — le SEUL écran vu est le chargement animé natif
  // (enveloppe + ligne qui trace le cadre + « Ayeba Mail »).
  const nodpi = path.join(RES, "drawable-nodpi");
  fs.mkdirSync(nodpi, { recursive: true });
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>`))
    .png()
    .toFile(path.join(nodpi, "ic_splash_empty.png"));
  console.log("OK — icônes générées");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
