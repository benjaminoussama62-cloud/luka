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

// Foreground adaptatif : enveloppe seule sur fond transparent, ~62% du canvas (zone sûre).
const foregroundSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="${size}" height="${size}">
  <defs>${GRADIENT}</defs>
  <g transform="translate(54,54) scale(0.235) translate(-256,-256)">
    <rect x="104" y="158" width="304" height="196" rx="30" fill="none" stroke="url(#ayebaA)" stroke-width="26"/>
    <path d="M118 182 L256 296 L394 182" fill="none" stroke="url(#ayebaA)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
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
    console.log(`${dir}: launcher ${sizes.launcher}px, foreground ${sizes.foreground}px`);
  }
  console.log("OK — icônes générées");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
