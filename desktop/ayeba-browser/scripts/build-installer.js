/**
 * Build Windows NSIS installer (.exe) — Chrome/Cursor style one-click setup.
 * Output: dist/AYEBA-Setup-{version}.exe
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const version = require(path.join(root, "package.json")).version;
const dist = path.join(root, "dist");
const expected = path.join(dist, `AYEBA-Setup-${version}.exe`);

console.log("Building NSIS installer…");
execSync("npx electron-builder --win nsis", { cwd: root, stdio: "inherit" });

if (!fs.existsSync(expected)) {
  const alt = fs.readdirSync(dist).find((f) => f.endsWith(".exe") && f.includes("Setup"));
  if (alt) {
    console.log("OK", path.join(dist, alt));
    process.exit(0);
  }
  console.error("Installer not found at", expected);
  process.exit(1);
}

const st = fs.statSync(expected);
console.log("OK", expected, `(${Math.round(st.size / 1024 / 1024)} Mo)`);
