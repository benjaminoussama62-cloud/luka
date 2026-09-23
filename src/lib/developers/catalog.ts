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
