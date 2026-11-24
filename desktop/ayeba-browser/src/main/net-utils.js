const { HOME_URL } = require("./paths");

// Hostname en minuscules pour une URL complète ou une saisie « domaine.tld ».
// null si la valeur n'est pas un hôte http(s) (file:, data:, chaine vide…).
function hostOf(input) {
  try {
    const s = String(input || "").trim();
    if (!s) return null;
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return /^https?:$/.test(u.protocol) ? u.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

// Interstitiel façon Chrome pour les erreurs de certificat (ERR_CERT_*,
// codes Chromium -200..-299) — bloquant, sans bouton « continuer quand même ».
function certErrorUrl(url, errorDesc = "") {
  const host = hostOf(url) || "ce site";
  const esc = (v) =>
    String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Connexion non sécurisée — AYEBA</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0c11;color:#e9ecf3;font-family:"Segoe UI",system-ui,sans-serif}main{max-width:540px;padding:40px}svg{display:block}h1{font-size:20px;font-weight:600;margin:18px 0 8px}p{color:#9ca3af;font-size:14px;line-height:1.65;margin:8px 0}code{color:#7df0ff}button{margin-top:18px;height:38px;padding:0 22px;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:rgba(255,255,255,.06);color:#e9ecf3;cursor:pointer;font-size:13px}button:hover{background:rgba(0,180,255,.14);border-color:rgba(0,180,255,.4)}</style></head><body><main><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#e85d04" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19L12 3z"/><path d="M12 9.5v4.5M12 17.2h.01"/></svg><h1>Connexion non sécurisée</h1><p>Le certificat de <code>${esc(host)}</code> est invalide ou expiré. AYEBA a bloqué la connexion pour protéger vos données.</p><p>Un site qui se fait passer pour <code>${esc(host)}</code> pourrait tenter de récupérer vos mots de passe ou vos données personnelles.</p><button type="button" onclick="history.back()">Retour à la page précédente</button></main></body></html>`;
  void errorDesc;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function isNewTab(url = "") {
  if (url.startsWith("file:") && url.includes("/newtab/")) return true;
  // La racine d'ayeba.app = l'accueil : ne pas encombrer l'historique.
  return url === HOME_URL || url === "https://ayeba.app";
}

module.exports = { hostOf, certErrorUrl, isNewTab };
