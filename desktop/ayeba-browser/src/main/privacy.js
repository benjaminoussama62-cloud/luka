const { webContents } = require("electron");
const { readSettings } = require("./store");
const { hostBlocked } = require("./blocklist");

// Vie privée réelle, en quatre couches appliquées à chaque session :
//  1. DNT envoyé + Referer inter-sites réduit à l'origine.
//  2. Requêtes vers les domaines de la blocklist ANNULÉES — le tracker
//     n'est jamais contacté (pas seulement ses cookies supprimés).
//  3. Cookies tiers : strip des Set-Cookie hors site visité — empêche le
//     STOCKAGE d'un état inter-sites (les requêtes non bloquées partent
//     quand même ; le blocage réseau ci-dessus couvre les domaines listés).
//  4. HTTPS-First : navigations principales http:// réécrites en https://
//     avec repli automatique si le site ne sert pas TLS.
const privacySessions = new Set();

// Hôtes promus en https par la couche 4 — si la navigation échoue sur une
// erreur de connexion, on bascule le domaine en repli http (mémoire seule,
// re-vérifié au prochain lancement).
const httpsUpgradedHosts = new Set();
const httpFallbackHosts = new Set();

// Compteur de traqueurs bloqués par webContents — remonté dans l'état des
// onglets pour le badge « bouclier » du chrome.
const blockedCounts = new Map(); // webContentsId → number
function trackerBlockedCount(webContentsId) {
  return blockedCounts.get(webContentsId) || 0;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function sameSiteHost(reqHost, topHost) {
  return (
    reqHost === topHost ||
    reqHost.endsWith(`.${topHost}`) ||
    topHost.endsWith(`.${reqHost}`)
  );
}

// Appelé par window.js quand une navigation principale échoue : si l'échec
// concerne un hôte promu en https, on bascule en repli http et on demande
// au caller de recharger l'URL d'origine.
function shouldFallbackToHttp(errorCode, validatedURL) {
  if (!/^https:/i.test(validatedURL)) return false;
  const host = hostOf(validatedURL);
  if (!host || !httpsUpgradedHosts.has(host)) return false;
  // Erreurs de connexion / handshake TLS uniquement (-100..-199 :
  // ERR_CONNECTION_*, ERR_NAME_*, ERR_SSL_PROTOCOL…). Les erreurs de
  // certificat (-200..-299) ne déclenchent JAMAIS de repli http — un cert
  // invalide est un signal de MITM, pas un site « http-only ».
  if (errorCode > -100 || errorCode < -199) return false;
  httpsUpgradedHosts.delete(host);
  httpFallbackHosts.add(host);
  return true;
}

function httpUrlFor(url) {
  try {
    const u = new URL(url);
    u.protocol = "http:";
    return u.href;
  } catch {
    return url;
  }
}

function applyPrivacyTo(ses) {
  const s = readSettings();

  ses.webRequest.onBeforeRequest((details, callback) => {
    let host;
    try {
      const u = new URL(details.url);
      if (!/^https?:$/.test(u.protocol)) return callback({});
      host = u.hostname.toLowerCase();
    } catch {
      return callback({});
    }

    // Anti-pistage : la requête vers un domaine de la blocklist part à la
    // poubelle — IP, UA et Referer ne quittent jamais la machine.
    if (s.blockTrackers && hostBlocked(host)) {
      if (details.webContentsId != null) {
        blockedCounts.set(details.webContentsId, trackerBlockedCount(details.webContentsId) + 1);
      }
      return callback({ cancel: true });
    }

    // HTTPS-First : uniquement la navigation principale — les sous-ressources
    // http d'une page https sont déjà bloquées par Chromium (mixed content),
    // et réécrire chaque requête coûterait plus que ça ne rapporte.
    if (
      s.httpsOnly &&
      details.resourceType === "mainFrame" &&
      details.url.startsWith("http://") &&
      !httpFallbackHosts.has(host)
    ) {
      const upgraded = `https://${details.url.slice(7)}`;
      httpsUpgradedHosts.add(host);
      return callback({ redirectURL: upgraded });
    }

    callback({});
  });

  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    if (s.doNotTrack) details.requestHeaders["DNT"] = "1";
    // Referer : inter-sites → l'origine seule (chemin et query masqués),
    // comme strict-origin-when-cross-origin de Chrome mais appliqué à
    // toutes les requêtes, y compris les sous-ressources.
    if (s.trimReferrer) {
      const refKey = Object.keys(details.requestHeaders).find(
        (k) => k.toLowerCase() === "referer",
      );
      if (refKey) {
        try {
          const ref = new URL(details.requestHeaders[refKey]);
          const target = new URL(details.url);
          if (!sameSiteHost(ref.hostname.toLowerCase(), target.hostname.toLowerCase())) {
            details.requestHeaders[refKey] = `${ref.protocol}//${ref.host}/`;
          }
        } catch {}
      }
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  ses.webRequest.onHeadersReceived((details, callback) => {
    if (!s.blockThirdPartyCookies || !details.responseHeaders) return callback({});
    try {
      const reqHost = new URL(details.url).hostname;
      let topHost = reqHost;
      const wc = details.webContentsId != null ? webContents.fromId(details.webContentsId) : null;
      const topUrl = wc && !wc.isDestroyed() ? wc.getURL() : "";
      if (topUrl && /^https?:/.test(topUrl)) topHost = new URL(topUrl).hostname;
      if (sameSiteHost(reqHost, topHost)) return callback({});
      const responseHeaders = { ...details.responseHeaders };
      for (const key of Object.keys(responseHeaders)) {
        if (key.toLowerCase() === "set-cookie") delete responseHeaders[key];
      }
      return callback({ responseHeaders });
    } catch {
      return callback({});
    }
  });
  privacySessions.add(ses);
}

function applyPrivacy() {
  for (const ses of privacySessions) applyPrivacyTo(ses);
}

module.exports = {
  applyPrivacyTo,
  applyPrivacy,
  trackerBlockedCount,
  shouldFallbackToHttp,
  httpUrlFor,
};
