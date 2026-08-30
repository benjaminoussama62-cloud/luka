/** Search engine preference — Ayeba default; Google/Yandex optional (Ayebi always on ayeba.app). */

export type SearchEngineId = "ayeba" | "google" | "yandex";

export type SearchEngineDef = {
  id: SearchEngineId;
  name: string;
  hint: string;
  buildUrl: (query: string) => string;
};

export const SEARCH_ENGINES: SearchEngineDef[] = [
  {
    id: "ayeba",
    name: "Ayeba",
    hint: "Recherche mondiale + Ayebi + Wikipedia",
    buildUrl: (q) => `https://ayeba.app/?q=${encodeURIComponent(q)}`,
  },
  {
    id: "google",
    name: "Google",
    hint: "Google Search — Ayebi reste accessible sur ayeba.app/ayebi",
    buildUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "yandex",
    name: "Yandex",
    hint: "Yandex Search — Ayebi reste accessible sur ayeba.app/ayebi",
    buildUrl: (q) => `https://yandex.com/search/?text=${encodeURIComponent(q)}`,
  },
];

const STORAGE_KEY = "ayeba.searchEngine.v1";

export function getSearchEngineId(): SearchEngineId {
  if (typeof window === "undefined") return "ayeba";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "google" || raw === "yandex" || raw === "ayeba") return raw;
  } catch {
    /* private mode */
  }
  return "ayeba";
}

export function setSearchEngineId(id: SearchEngineId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent("ayeba:search-engine", { detail: id }));
  } catch {
    /* private mode */
  }
}

export function getSearchEngine(id?: SearchEngineId): SearchEngineDef {
  const pick = id ?? getSearchEngineId();
  return SEARCH_ENGINES.find((e) => e.id === pick) ?? SEARCH_ENGINES[0];
}

export function buildSearchUrl(query: string, engineId?: SearchEngineId): string {
  return getSearchEngine(engineId).buildUrl(query.trim());
}

/** Omnibox: URL if it looks like an address, else search via chosen engine. */
export function normalizeOmniInput(input: string, engineId?: SearchEngineId): string {
  const raw = input.trim();
  if (!raw) return "/";
  if (/^(https?:\/\/|\/)/i.test(raw)) return raw;
  if (!raw.includes(" ") && raw.includes(".")) return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return buildSearchUrl(raw, engineId);
}
