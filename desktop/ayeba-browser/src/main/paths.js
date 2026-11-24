const path = require("path");
const { app } = require("electron");
const { pathToFileURL } = require("url");

// Le nouvel onglet EST le vrai site — comme Yandex ouvre yandex.ru.
// La page locale newtab/ sert uniquement de repli hors-ligne.
const HOME_URL = "https://ayeba.app/";
const LOCAL_NTP_URL = pathToFileURL(path.join(__dirname, "..", "..", "newtab", "index.html")).href;
const CHROME_URL = pathToFileURL(path.join(__dirname, "..", "..", "chrome", "index.html")).href;
const RAIL_URL = pathToFileURL(path.join(__dirname, "..", "..", "chrome", "rail.html")).href;
const DATA_DIR = path.join(app.getPath("userData"), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const SESSION_FILE = path.join(DATA_DIR, "session.json");
// Partition mémoire des fenêtres InPrivate (cookies/cache effacés à la sortie).
const PRIVATE_PARTITION = "ayeba-inprivate";
const FETCH_TIMEOUT_MS = 8000;

// Données personnelles : chaque compte Ayeba a son propre espace
const USER_FILES = ["history.json", "favorites.json", "passwords.json"];

const CHROME_H = 96;
const RAIL_W = 52;

const LOG_FILE = path.join(app.getPath("userData"), "ayeba.log");
const GPU_FLAG_FILE = path.join(app.getPath("userData"), "gpu-safe-mode");

module.exports = {
  HOME_URL,
  LOCAL_NTP_URL,
  CHROME_URL,
  RAIL_URL,
  DATA_DIR,
  SETTINGS_FILE,
  SESSION_FILE,
  PRIVATE_PARTITION,
  FETCH_TIMEOUT_MS,
  USER_FILES,
  CHROME_H,
  RAIL_W,
  LOG_FILE,
  GPU_FLAG_FILE,
};
