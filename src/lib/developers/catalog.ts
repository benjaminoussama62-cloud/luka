/**
 * Catalogue des APIs publiques Ayeba — chaque entrée correspond à un vrai
 * endpoint /api/v1/* fonctionnel. Jamais d'entrée factice : si l'API n'est
 * pas implémentée, elle n'est pas listée.
 */
export type ApiCatalogEntry = {
  id: string;
  name: string;
  scope: string;
  description: string;
  endpoint: string;
  method: "GET" | "POST";
  params: { name: string; required: boolean; desc: string }[];
  quotaDefault: number;
  status: "ga" | "beta";
  docsAnchor: string;
};

export const API_CATALOG: ApiCatalogEntry[] = [
  {
    id: "search",
    name: "Ayeba Search API",
    scope: "search",
    description:
      "Recherche web mondiale sur l'index Ayeba : résultats organiques, extraits, panneau de connaissances. Index propre + sources temps réel.",
    endpoint: "/api/v1/search",
    method: "GET",
    params: [
      { name: "q", required: true, desc: "Requête de recherche" },
      { name: "limit", required: false, desc: "Nombre de résultats (1–50, défaut 10)" },
    ],
    quotaDefault: 1000,
    status: "ga",
    docsAnchor: "api-search",
  },
  {
    id: "suggest",
    name: "Ayeba Suggest API",
    scope: "suggest",
    description:
      "Suggestions de recherche en temps réel (autocomplete) — pour barres de recherche et assistants intégrés.",
    endpoint: "/api/v1/suggest",
    method: "GET",
    params: [
      { name: "q", required: true, desc: "Préfixe de la requête" },
      { name: "limit", required: false, desc: "Nombre de suggestions (1–10, défaut 8)" },
    ],
    quotaDefault: 5000,
    status: "beta",
    docsAnchor: "api-suggest",
  },
  {
    id: "ayebi",
    name: "Ayebi Encyclopedia API",
    scope: "ayebi",
    description:
      "Recherche dans Ayebi — encyclopédie congolaise (fiches, catégories, résumés). Corpus distinct de Wikipédia.",
    endpoint: "/api/v1/ayebi",
    method: "GET",
    params: [
      { name: "q", required: true, desc: "Requête de recherche Ayebi" },
      { name: "limit", required: false, desc: "Nombre de fiches (1–50, défaut 10)" },
      { name: "category", required: false, desc: "Filtre catégorie (ex. histoire, géographie)" },
    ],
    quotaDefault: 2000,
    status: "ga",
    docsAnchor: "api-ayebi",
  },
  {
    id: "radar",
    name: "Ayeba Radar Performance API",
    scope: "radar",
    description:
      "Search Analytics lecture seule pour un domaine Studio vérifié : clics, impressions, CTR, position, comparaison de période, ventilation requête/page/pays/appareil.",
    endpoint: "/api/v1/radar",
    method: "GET",
    params: [
      { name: "domain", required: true, desc: "Domaine Studio vérifié (ex. example.com)" },
      { name: "days", required: false, desc: "Fenêtre 1–90 (défaut 28)" },
      { name: "dim", required: false, desc: "query | url | country | device" },
    ],
    quotaDefault: 500,
    status: "beta",
    docsAnchor: "api-radar",
  },
  {
    id: "crawl",
    name: "Ayeba Crawl Status API",
    scope: "crawl",
    description:
      "Statut d'indexation réel pour un domaine Studio vérifié : pages indexées, file de crawl, couverture, échecs — données crawl_documents / crawl_queue.",
    endpoint: "/api/v1/crawl/status",
    method: "GET",
    params: [
      { name: "domain", required: true, desc: "Domaine Studio vérifié (ex. example.com)" },
    ],
    quotaDefault: 1000,
    status: "ga",
    docsAnchor: "api-crawl",
  },
  {
    id: "velocity",
    name: "Ayeba Velocity API",
    scope: "velocity",
    description:
      "Déclenche un audit Lighthouse réel via Google PageSpeed Insights pour une URL d'un domaine Studio vérifié (scores lab + CrUX).",
    endpoint: "/api/v1/velocity",
    method: "POST",
    params: [
      { name: "domain", required: true, desc: "Domaine Studio vérifié (ex. example.com)" },
      { name: "url", required: false, desc: "URL à auditer (défaut https://domaine/)" },
      { name: "strategy", required: false, desc: "mobile | desktop (défaut mobile)" },
    ],
    quotaDefault: 50,
    status: "beta",
    docsAnchor: "api-velocity",
  },
];

export function catalogEntry(id: string): ApiCatalogEntry | undefined {
  return API_CATALOG.find((a) => a.id === id);
}

/** Portées de clés API — une portée par API du catalogue. */
export const API_SCOPES = API_CATALOG.map((a) => ({
  id: a.scope,
  label: a.name.replace(" API", ""),
  desc: a.description.split(":")[0].split(".")[0],
}));
