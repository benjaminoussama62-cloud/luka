import type { IndexedDoc } from "./ayeba-index";

/** Apps sœurs Ayeba — toujours présentes dans l’index local (pas seulement raccourcis UI). */
export const SISTER_SEARCH_DOCS: IndexedDoc[] = [
  {
    id: "sister-jemsa",
    title: "JEMSA — plateforme sœur Ayeba",
    url: "https://jemsa.net",
    domain: "jemsa.net",
    snippet:
      "JEMSA est une application de l’écosystème DevAlpha / Ayeba. Accédez au service officiel jemsa.net — connexion possible avec votre compte Ayeba.",
    keywords: [
      "jemsa",
      "jemsa.net",
      "app sœur",
      "ayeba",
      "devalpha",
      "rdc",
      "congo",
      "plateforme",
    ],
    congoRelevant: true,
    sourceType: "tech",
    credibility: 99,
    sitelinks: [
      { title: "Ouvrir JEMSA", url: "https://jemsa.net" },
      { title: "Compte Ayeba", url: "https://ayeba.app/compte" },
    ],
  },
  {
    id: "sister-tala",
    title: "TALA — plateforme sœur Ayeba",
    url: "https://to-tala.com",
    domain: "to-tala.com",
    snippet:
      "TALA (to-tala.com) fait partie de l’écosystème Ayeba. Service sœur accessible depuis Ayeba — identité partagée via Se connecter avec Ayeba.",
    keywords: ["tala", "to-tala", "to-tala.com", "ayeba", "app sœur", "rdc", "congo", "devalpha"],
    congoRelevant: true,
    sourceType: "tech",
    credibility: 99,
    sitelinks: [
      { title: "Ouvrir TALA", url: "https://to-tala.com" },
      { title: "Developers Ayeba", url: "https://ayeba.app/developers" },
    ],
  },
  {
    id: "sister-sombateka",
    title: "Sombateka Online — plateforme sœur Ayeba",
    url: "https://sombatekaonline.com",
    domain: "sombatekaonline.com",
    snippet:
      "Sombateka Online est une application sœur de l’écosystème Ayeba. Boutique / service en ligne — jemsa, tala et sombateka partagent l’identité Ayeba.",
    keywords: [
      "sombateka",
      "sombatekaonline",
      "sombateka online",
      "ayeba",
      "app sœur",
      "rdc",
      "congo",
      "shopping",
    ],
    congoRelevant: true,
    sourceType: "tech",
    credibility: 99,
    sitelinks: [
      { title: "Ouvrir Sombateka", url: "https://sombatekaonline.com" },
      { title: "Marchés Ayeba", url: "https://ayeba.app/marches" },
    ],
  },
  {
    id: "sister-omega",
    title: "Omega — plateforme sœur Ayeba",
    url: "https://omega-web.org",
    domain: "omega-web.org",
    snippet:
      "Omega est une plateforme sœur d’Ayeba. Connectez-vous avec votre compte Ayeba (OAuth / OpenID) pour accéder à Omega.",
    keywords: ["omega", "omega-web", "omega-web.org", "ayeba", "oauth", "connexion", "app sœur"],
    congoRelevant: true,
    sourceType: "tech",
    credibility: 99,
    sitelinks: [
      { title: "Ouvrir Omega", url: "https://omega-web.org" },
      { title: "Se connecter avec Ayeba", url: "https://ayeba.app/developers" },
    ],
  },
  {
    id: "sister-devalpha",
    title: "DevAlpha — studio & écosystème",
    url: "https://devalpha1.com",
    domain: "devalpha1.com",
    snippet:
      "DevAlpha regroupe les produits sœurs Ayeba, JEMSA, TALA, Sombateka et Omega. Infrastructure et identité partagée.",
    keywords: ["devalpha", "devalpha1", "ayeba", "écosystème", "studio", "rdc"],
    congoRelevant: true,
    sourceType: "tech",
    credibility: 98,
    sitelinks: [{ title: "Site DevAlpha", url: "https://devalpha1.com" }],
  },
  {
    id: "sister-ayeba",
    title: "AYEBA — moteur de recherche",
    url: "https://ayeba.app",
    domain: "ayeba.app",
    snippet:
      "AYEBA : recherche mondiale avec priorité RDC. Compte unique pour JEMSA, TALA, Sombateka, Omega et les apps partenaires.",
    keywords: ["ayeba", "recherche", "moteur", "rdc", "congo", "google", "search"],
    congoRelevant: true,
    sourceType: "tech",
    credibility: 100,
    sitelinks: [
      { title: "Studio", url: "https://ayeba.app/studio" },
      { title: "Developers", url: "https://ayeba.app/developers" },
      { title: "Ayebi", url: "https://ayeba.app/ayebi" },
    ],
  },
];

export function searchSisterApps(query: string): IndexedDoc[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/[\s\-_/]+/).filter((t) => t.length >= 2);
  // Aussi accepter acronymes courts (ex. DA) via match plein titre/domaine
  const scored = SISTER_SEARCH_DOCS.map((doc) => {
    const hay = `${doc.title} ${doc.snippet} ${doc.keywords.join(" ")} ${doc.domain}`.toLowerCase();
    let score = 0;
    if (hay.includes(q) || doc.domain.includes(q.replace(/\s/g, ""))) score += 80;
    for (const t of tokens) {
      if (doc.keywords.some((k) => k === t || k.startsWith(t))) score += 40;
      else if (doc.title.toLowerCase().includes(t)) score += 30;
      else if (hay.includes(t)) score += 15;
    }
    return { doc, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((x) => x.doc);
}

export function isSisterQuery(query: string) {
  return searchSisterApps(query).length > 0;
}
