/**
 * Build Ayeba Mail offline — bundle React + CSS produit dans www/.
 * Le design source reste src/app/mail/mail.css : cette coquille le recopie
 * au lieu de réécrire une variante mobile qui dériverait visuellement.
 */
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const www = path.join(appRoot, "www");
const sourceCss = path.join(repoRoot, "src", "app", "mail", "mail.css");
const entry = path.join(appRoot, "offline", "main.jsx");

const baseCss = `/* Ayeba Mail offline — variables du shell produit */
:root {
  --void: #000000;
  --surface: rgba(8, 8, 10, 0.72);
  --ink: #f5f5f7;
  --muted: #9ca3af;
  --faint: #52525b;
  --orange: #e85d04;
  --orange-soft: rgba(232, 93, 4, 0.14);
  --orange-glow: rgba(255, 107, 26, 0.45);
  --red: var(--orange);
  --red-hot: var(--orange);
  --line: rgba(255, 255, 255, 0.08);
  --line-bright: rgba(232, 93, 4, 0.35);
  --good: #34d399;
  --warn: #fbbf24;
  --bad: #fb7185;
  --link: #93c5fd;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --font-brand: Inter, system-ui, sans-serif;
  --font-display: Inter, system-ui, sans-serif;
  --font-body: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
* { box-sizing: border-box; }
html, body, #root { height: 100%; }
html { background: var(--void); color-scheme: dark; }
body {
  margin: 0;
  overflow: hidden;
  background: var(--void);
  color: var(--ink);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}
button, input, textarea, select { font: inherit; }
button { -webkit-tap-highlight-color: transparent; }
img { max-width: 100%; }
`;

const offlineCss = `\n/* Correctif mobile offline : le rail garde une icône quand le libellé est masqué. */
.mail-compose-icon { display: none !important; }
@media (max-width: 860px) {
  .mail-compose-icon { display: inline !important; }
}
`;

fs.mkdirSync(www, { recursive: true });
fs.writeFileSync(
  path.join(www, "mail.css"),
  `${baseCss}\n${fs.readFileSync(sourceCss, "utf8")}\n${offlineCss}`,
);
fs.copyFileSync(
  path.join(repoRoot, "public", "favicon.ico"),
  path.join(www, "favicon.ico"),
);
fs.copyFileSync(
  path.join(repoRoot, "public", "brand", "ayeba-mark-192.png"),
  path.join(www, "ayeba-mark-192.png"),
);

esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  outfile: path.join(www, "app.js"),
  format: "iife",
  jsx: "automatic",
  minify: true,
  sourcemap: false,
  target: ["chrome80", "es2020"],
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
});

console.log("[ayeba-mail] bundle offline généré dans mobile/ayeba-mail/www");
