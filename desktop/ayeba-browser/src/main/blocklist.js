// Domaines de pistage publicitaires et analytiques bloqués quand le réglage
// « bloquer les traqueurs » est actif. Correspondance par suffixe : une entrée
// « doubleclick.net » bloque aussi « a.b.doubleclick.net », mais une entrée
// de sous-domaine (« snap.licdn.com ») n'atteint pas le domaine parent.
// Liste curatée — trackers établis uniquement, jamais de CDN légitime.
const TRACKER_DOMAINS = [
  // Google advertising / analytics
  "doubleclick.net",
  "googlesyndication.com",
  "google-analytics.com",
  "googletagmanager.com",
  "googletagservices.com",
  "adservice.google.com",
  "analytics.google.com",
  "measurement.com",
  "g.doubleclick.net",
  // Meta
  "facebook.net",
  "connect.facebook.net",
  "fbsbx.com",
  // Microsoft / LinkedIn
  "bat.bing.com",
  "clarity.ms",
  "snap.licdn.com",
  "analytics.pointdrive.linkedin.com",
  // Twitter / X
  "ads-twitter.com",
  "analytics.twitter.com",
  "static.ads-twitter.com",
  // TikTok / Snap / Pinterest pixels (sous-domaines seulement)
  "analytics.tiktok.com",
  "ads.tiktok.com",
  "tr.snapchat.com",
  "sc-static.net",
  "ct.pinterest.com",
  "s.pinimg.com",
  // Programmatique majeur
  "adnxs.com",
  "rubiconproject.com",
  "pubmatic.com",
  "openx.net",
  "casalemedia.com",
  "indexww.com",
  "33across.com",
  "criteo.com",
  "criteo.net",
  "bidswitch.net",
  "smartadserver.com",
  "adform.net",
  "semasio.net",
  "amazon-adsystem.com",
  "advertising.com",
  "adotmob.com",
  "weborama.fr",
  "teads.tv",
  "lijit.com",
  "sharethrough.com",
  "triplelift.com",
  "media.net",
  "yieldmo.com",
  "gumgum.com",
  "sovrn.com",
  "emxdgt.com",
  "contextweb.com",
  "imrworldwide.com",
  "rlcdn.com",
  "turn.com",
  "mathtag.com",
  "bluekai.com",
  "exelator.com",
  "krxd.net",
  "tapad.com",
  "adsrvr.org",
  "tradehouse.com",
  // Native ads / recommandation
  "taboola.com",
  "outbrain.com",
  "zemanta.com",
  "revcontent.com",
  "mgid.com",
  "zergnet.com",
  "content.ad",
  // Analytics produit / heatmaps / session replay
  "hotjar.com",
  "mouseflow.com",
  "fullstory.com",
  "logrocket.com",
  "crazyegg.com",
  "luckyorange.com",
  "smartlook.com",
  "quantcount.com",
  "scorecardresearch.com",
  "quantserve.com",
  "mixpanel.com",
  "amplitude.com",
  "segment.io",
  "segment.com",
  "analytics.amplitude.com",
  "heap.io",
  "heapanalytics.com",
  "pendo.io",
  "posthog.com",
  "plausible.io",
  "statcounter.com",
  "histats.com",
  "chartbeat.com",
  "parsely.com",
  "newrelic.com",
  "nr-data.net",
  "bugsnag.com",
  // Vérification / mesure pub
  "moatads.com",
  "doubleverify.com",
  "iasds01.com",
  "adsafeprotected.com",
  "serving-sys.com",
  "everesttech.net",
  "omtrdc.net",
  "demdex.net",
  "2o7.net",
  // Yandex Metrica & divers
  "mc.yandex.ru",
  "mc.webvisor.org",
  "stats.wp.com",
  "pixel.wp.com",
  "sb.scorecardresearch.com",
  "udc.yahoo.com",
  "gemini.yahoo.com",
  "adtechus.com",
  "advertising.yahoo.com",
];

const TRACKER_SET = new Set(TRACKER_DOMAINS);

// hostname → true si le domaine ou un parent figure dans la blocklist.
// « cdn.snap.licdn.com » matche « snap.licdn.com » ; « licdn.com » non.
function hostBlocked(hostname) {
  let h = String(hostname || "").toLowerCase();
  if (!h) return false;
  if (TRACKER_SET.has(h)) return true;
  for (;;) {
    const dot = h.indexOf(".");
    if (dot < 0) return false;
    h = h.slice(dot + 1);
    if (TRACKER_SET.has(h)) return true;
  }
}

module.exports = { hostBlocked, TRACKER_DOMAINS };
