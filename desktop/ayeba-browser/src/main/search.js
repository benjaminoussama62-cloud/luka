const {
  DEFAULT_ENGINE,
  buildSearchUrl,
  normalizeOmni: normalizeOmniForEngine,
  engineList,
  isEngine,
} = require("../search-engines");
const { HOME_URL } = require("./paths");
const { readSettings } = require("./store");

function normalizeOmni(input) {
  const raw = String(input || "").trim();
  if (!raw) return HOME_URL;
  const { searchEngine } = readSettings();
  const target = normalizeOmniForEngine(raw, searchEngine);
  return target || HOME_URL;
}

module.exports = {
  DEFAULT_ENGINE,
  buildSearchUrl,
  engineList,
  isEngine,
  normalizeOmni,
};
