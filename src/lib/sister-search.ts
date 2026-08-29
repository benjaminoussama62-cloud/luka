import type { IndexedDoc } from "./ayeba-index";

/** Marques indexées — descriptions vérifiées sur les sites officiels. */
export const BRAND_SEARCH_DOCS: IndexedDoc[] = [
  {
    id: "brand-jemsa",
    title: "Jemsa",
    url: "https://jemsa.net",
    domain: "jemsa.net",
    snippet:
      "Réseau social et plateforme éducative congolaise : étudiants, universités, tuteurs, livres, emplois et culture RDC — Kinshasa et provinces.",
    keywords: ["jemsa", "jemsa.net", "réseau social", "éducation", "rdc", "congo", "kinshasa"],
    congoRelevant: true,
    sourceType: "tech",
    credibility: 99,
    sitelinks: [
      { title: "Créer un compte", url: "https://jemsa.net" },
      { title: "Culture RDC", url: "https://jemsa.net" },
    ],
  },
  {
    id: "brand-tala",
    title: "TALA",
    url: "https://to-tala.com",
    domain: "to-tala.com",
    snippet:
      "Streaming vidéo congolais — films, séries, musique, sport, éducation, actualités, culture, comédie et shorts sur to-tala.com.",
    keywords: [
      "tala",
      "to-tala",
      "to tala",
      "to-tala.com",
      "streaming",
      "vidéo",
      "congo",
      "films",
      "séries",
    ],
    congoRelevant: true,
    sourceType: "tech",
    credibility: 99,
    sitelinks: [
      { title: "Films", url: "https://to-tala.com" },
      { title: "S'inscrire", url: "https://to-tala.com/auth/register" },
    ],
  },
  {
    id: "brand-sombateka",
    title: "SombaTeka",
    url: "https://sombatekaonline.com",
    domain: "sombatekaonline.com",
    snippet:
      "Marketplace premium en RDC — achat et vente en ligne sur sombatekaonline.com.",
    keywords: [
      "sombateka",
      "sombatekaonline",
      "somba teka",
      "marketplace",
      "achat",
      "vente",
      "rdc",
      "congo",
      "shopping",
    ],
    congoRelevant: true,
    sourceType: "web",
    credibility: 99,
    sitelinks: [{ title: "Marketplace", url: "https://sombatekaonline.com" }],
  },
  {
    id: "brand-omega",
    title: "OMEGA",
    url: "https://omega-web.org",
    domain: "omega-web.org",
    snippet:
      "Maison de romans — catalogue et abonnement Premium sur omega-web.org, lecture dans l’application Omega.",
    keywords: [
      "omega",
      "omega-web",
      "omega web",
      "omega-web.org",
      "romans",
      "livres",
      "lecture",
      "catalogue",
      "premium",
    ],
    congoRelevant: true,
    sourceType: "tech",
    credibility: 99,
    sitelinks: [
      { title: "Catalogue", url: "https://omega-web.org" },
      { title: "Premium", url: "https://omega-web.org" },
    ],
  },
  {
    id: "brand-devalpha",
    title: "DevAlpha",
    url: "https://devalpha1.com",
    domain: "devalpha1.com",
    snippet:
      "Agence digitale — développement web, mobile, cloud, cybersécurité et IA. Édite Jemsa, TALA, SombaTeka, OMEGA et Ayeba. devalpha1.com",
    keywords: ["devalpha", "devalpha1", "devalpha1.com", "agence", "web", "mobile", "ia", "développement"],
    congoRelevant: true,
    sourceType: "tech",
    credibility: 98,
    sitelinks: [
      { title: "Services", url: "https://devalpha1.com" },
      { title: "Contact", url: "https://devalpha1.com" },
    ],
  },
  {
    id: "brand-ayeba",
    title: "AYEBA",
    url: "https://ayeba.app",
    domain: "ayeba.app",
    snippet:
      "Moteur de recherche — le monde entier, une requête. Priorité RDC, Studio, Ayebi et Developers sur ayeba.app.",
    keywords: ["ayeba", "recherche", "moteur", "search", "rdc"],
    congoRelevant: true,
    sourceType: "tech",
    credibility: 100,
    sitelinks: [
      { title: "Studio", url: "https://ayeba.app/studio" },
      { title: "Developers", url: "https://ayeba.app/developers" },
    ],
  },
];

/** @deprecated alias interne */
export const SISTER_SEARCH_DOCS = BRAND_SEARCH_DOCS;

function norm(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9.\s-]/g, "");
}

function compact(s: string) {
  return norm(s).replace(/[\s.-]/g, "");
}

export function scoreBrandDoc(doc: IndexedDoc, query: string) {
  const q = norm(query);
  const qc = compact(query);
  if (!q && !qc) return 0;

  const title = norm(doc.title);
  const domain = doc.domain.toLowerCase();
  const hay = `${title} ${norm(doc.snippet)} ${doc.keywords.map(norm).join(" ")} ${domain}`;

  let score = 0;
  if (qc && compact(domain) === qc) score += 500;
  if (qc && compact(domain).includes(qc)) score += 300;
  if (q && title === q) score += 400;
  if (q && title.startsWith(q)) score += 250;
  if (qc && compact(title) === qc) score += 350;
  if (hay.includes(q)) score += 120;

  for (const kw of doc.keywords) {
    const k = norm(kw);
    const kc = compact(kw);
    if (qc && kc === qc) score += 200;
    if (q && k.startsWith(q)) score += 80;
    if (qc && kc.startsWith(qc)) score += 100;
  }

  return score;
}

export function searchSisterApps(query: string): IndexedDoc[] {
  const scored = BRAND_SEARCH_DOCS.map((doc) => ({ doc, score: scoreBrandDoc(doc, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return [];

  const top = scored[0].score;
  if (top >= 200) {
    const cut = top * 0.55;
    return scored.filter((x) => x.score >= cut).map((x) => x.doc);
  }
  return scored.slice(0, 4).map((x) => x.doc);
}

export function suggestBrandQueries(query: string): string[] {
  const q = query.trim();
  if (q.length < 1) return [];

  const scored = BRAND_SEARCH_DOCS.flatMap((doc) => {
    const score = scoreBrandDoc(doc, q);
    if (score <= 0) return [];
    const out: Array<{ label: string; score: number }> = [
      { label: doc.title, score: score + 20 },
      { label: doc.domain, score: score - 5 },
    ];
    if (doc.title.toLowerCase().includes(" ")) {
      out.push({ label: doc.title.split(" ")[0], score: score - 10 });
    }
    return out;
  }).sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const labels: string[] = [];
  for (const { label } of scored) {
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
    if (labels.length >= 5) break;
  }
  return labels;
}

export function isSisterQuery(query: string) {
  return searchSisterApps(query).length > 0;
}
