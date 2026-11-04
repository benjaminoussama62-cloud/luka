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

// Foreground adaptatif : LE LOGO COMPLET rendu plein cadre (échelle 108/512).
// Le fond dégradé remplit la tuile jusqu'aux bords — quel que soit le masque du
// launcher (squircle, cercle…), on voit le logo dans son intégralité : fond sombre
// + contour lumineux + enveloppe centrée (l'enveloppe reste dans la zone sûre).
const foregroundSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="${size}" height="${size}">
  <defs>${GRADIENT}${BG_GRADIENT}</defs>
  <g transform="scale(0.2109375)">
    <rect width="512" height="512" rx="108" fill="url(#ayebaBg)"/>
    <rect x="22" y="22" width="468" height="468" rx="92" fill="none" stroke="rgba(0,180,255,0.35)" stroke-width="6"/>
    <rect x="104" y="158" width="304" height="196" rx="30" fill="none" stroke="url(#ayebaA)" stroke-width="24"/>
    <path d="M118 182 L256 296 L394 182" fill="none" stroke="url(#ayebaA)" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
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
  // Splash système : enveloppe dégradée SEULE sur transparent (façon Gmail — le « M » seul),
  // + wordmark « Ayeba Mail » pour la zone branding en bas de l'écran.
  const splashLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 384" width="384" height="384">
    <defs>${GRADIENT}</defs>
    <g transform="translate(192,192) scale(0.72) translate(-256,-256)">
      <rect x="104" y="158" width="304" height="196" rx="30" fill="none" stroke="url(#ayebaA)" stroke-width="26"/>
      <path d="M118 182 L256 296 L394 182" fill="none" stroke="url(#ayebaA)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>`;
  const nodpi = path.join(RES, "drawable-nodpi");
  fs.mkdirSync(nodpi, { recursive: true });
  await sharp(Buffer.from(splashLogoSvg)).png().toFile(path.join(nodpi, "ic_splash_logo.png"));
  console.log("OK — icônes générées");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
