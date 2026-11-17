// Génère les assets iOS depuis store/icon-mail.svg :
//   - AppIcon-512@2x.png  : icône App Store 1024×1024, OPAQUE (Apple refuse
//     la transparence) — dégradé sombre + logo à 78%.
//   - splash-2732x2732{,-1,-2}.png : écran de lancement sombre + logo centré.
// Usage : node scripts/gen-ios-assets.js   (nécessite `sharp`)
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const XCASSETS = path.join(ROOT, "ios/App/App/Assets.xcassets");
const ICON_SRC = path.join(ROOT, "store/icon-mail.svg");

const BG_GRADIENT = `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#0a0a0e"/>
  <stop offset="100%" stop-color="#12141c"/>
</linearGradient>`;

const bgSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
  <defs>${BG_GRADIENT}</defs>
  <rect width="100" height="100" fill="url(#bg)"/>
</svg>`;

async function compositeLogo(size, logoScale) {
  const logo = await sharp(fs.readFileSync(ICON_SRC), { density: 1200 })
    .resize(Math.round(size * logoScale))
    .png()
    .toBuffer();
  return sharp(Buffer.from(bgSvg(size)))
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}

(async () => {
  // ── Icône App Store — carré opaque 1024×1024, logo à 78% ──
  const iconDir = path.join(XCASSETS, "AppIcon.appiconset");
  await sharp(await compositeLogo(1024, 0.78))
    .flatten({ background: "#0a0a0e" }) // zéro alpha — exigé par Apple
    .toFile(path.join(iconDir, "AppIcon-512@2x.png"));
  console.log("AppIcon 1024×1024 OK (opaque)");

  // ── Splash — 2732×2732 ×3 (universal @1x/@2x/@3x), logo centré à 28% ──
  const splashDir = path.join(XCASSETS, "Splash.imageset");
  const splash = await compositeLogo(2732, 0.28);
  for (const suffix of ["", "-1", "-2"]) {
    await sharp(splash).toFile(path.join(splashDir, `splash-2732x2732${suffix}.png`));
  }
  console.log("Splash 2732×2732 ×3 OK");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
