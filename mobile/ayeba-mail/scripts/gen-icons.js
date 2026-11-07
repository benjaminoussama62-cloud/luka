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

// Foreground adaptatif : LE LOGO COMPLET à 62% du canvas, centré sur fond
// transparent — la même technique que les icônes AYEBA et Mbongo (foreground
// = 62% du canvas). Le masque du launcher découpe autour → tuile sombre +
// logo entier visible avec ses marges.
const LOGO_SCALE = 0.62;

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
    // Logo complet à 62% centré sur canvas transparent (comme AYEBA/Mbongo)
    const logoInner = await sharp(fullIcon, { density: 800 })
      .resize(Math.round(sizes.foreground * LOGO_SCALE))
      .png()
      .toBuffer();
    await sharp({
      create: {
        width: sizes.foreground,
        height: sizes.foreground,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: logoInner, gravity: "center" }])
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
