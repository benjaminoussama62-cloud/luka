/**
 * Build Ayeba Mbongo — le portefeuille vit en ligne sur ayeba.app/mbongo.
 * La coquille www/index.html (splash spinner) est déjà écrite ; ce script
 * vérifie seulement qu'elle est présente avant `cap sync`.
 */
const fs = require("fs");
const path = require("path");

const index = path.join(__dirname, "..", "www", "index.html");
if (!fs.existsSync(index)) {
  console.error("[ayeba-mbongo] www/index.html manquant");
  process.exit(1);
}
console.log("[ayeba-mbongo] coquille www prête");
