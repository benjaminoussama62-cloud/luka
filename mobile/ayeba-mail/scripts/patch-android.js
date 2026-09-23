/**
 * After `cap add android`, sets minSdk 24 (Android 7+) for low-end RDC phones.
 * Safe no-op if android/ not generated yet.
 */
const fs = require("fs");
const path = require("path");

const gradle = path.join(__dirname, "..", "android", "variables.gradle");
if (!fs.existsSync(gradle)) return;

let text = fs.readFileSync(gradle, "utf8");
if (!text.includes("minSdkVersion = 24")) {
  text = text.replace(/minSdkVersion = \d+/, "minSdkVersion = 24");
  fs.writeFileSync(gradle, text);
  console.log("[ayeba-mobile] minSdkVersion → 24");
}
