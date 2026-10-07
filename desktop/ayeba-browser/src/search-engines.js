/** Default search providers for AYEBA Browser (Edge-like, user choice). */

const SEARCH_ENGINES = {
  ayeba: {
    id: "ayeba",
    name: "Ayeba",
    buildUrl: (q) => `https://ayeba.app/?q=${encodeURIComponent(q)}`,
  },
  google: {
    id: "google",
    name: "Google",
    buildUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
  yandex: {
    id: "yandex",
    name: "Yandex",
    buildUrl: (q) => `https://yandex.com/search/?text=${encodeURIComponent(q)}`,
  },
};

const DEFAULT_ENGINE = "ayeba";

function isEngine(id) {
  return id === "ayeba" || id === "google" || id === "yandex";
}

function getEngine(id) {
  return SEARCH_ENGINES[isEngine(id) ? id : DEFAULT_ENGINE];
}

function buildSearchUrl(query, engineId) {
  return getEngine(engineId).buildUrl(String(query || "").trim());
}

function normalizeOmni(input, engineId) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  // Schémas réellement supportés par les onglets. « ayeba: » n'est pas un
  // protocole enregistré : le laisser passer ferait échouer loadURL — il part
  // en recherche comme n'importe quel schéma inconnu.
  if (/^(https?|file):\/\//i.test(raw)) return raw;
  // Hôtes locaux sans point : localhost, 127.x.x.x, [::1] (+ port/chemin)
  // doivent naviguer, pas partir en recherche.
  if (/^(localhost|127(?:\.\d{1,3}){3}|\[::1\])(:\d+)?(\/\S*)?$/i.test(raw)) {
    return `http://${raw}`;
  }
  if (/^::1(:\d+)?(\/\S*)?$/.test(raw)) return `http://[::1]${raw.slice(3)}`;
  if (raw.includes(" ") || !raw.includes(".")) return buildSearchUrl(raw, engineId);
  return `https://${raw}`;
}

module.exports = {
  SEARCH_ENGINES,
  DEFAULT_ENGINE,
  isEngine,
  getEngine,
  buildSearchUrl,
  normalizeOmni,
  engineList: () => Object.values(SEARCH_ENGINES),
};
