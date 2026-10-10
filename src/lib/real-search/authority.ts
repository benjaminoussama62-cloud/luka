/**
 * Autorité de domaine DÉTERMINISTE — une même requête doit donner le même
 * SERP à deux appels (Math.random() dans le ranking rendait les résultats
 * non reproductibles et impossibles à tester).
 */

const AUTHORITY: Record<string, number> = {
  // Encyclopédie & référence
  "wikipedia.org": 90,
  "wikidata.org": 85,
  "britannica.com": 88,
  "wiktionary.org": 82,
  "larousse.fr": 84,
  "nationalgeographic.com": 84,
  // Institutions internationales
  "who.int": 93,
  "un.org": 91,
  "unicef.org": 90,
  "unhcr.org": 90,
  "worldbank.org": 91,
  "imf.org": 91,
  "wto.org": 88,
  "ilo.org": 88,
  "fao.org": 88,
  "unesco.org": 89,
  "uneca.org": 84,
  "afdb.org": 85,
  "hrw.org": 83,
  "amnesty.org": 84,
  // Presse internationale
  "reuters.com": 92,
  "apnews.com": 92,
  "bbc.com": 91,
  "bbc.co.uk": 91,
  "lemonde.fr": 89,
  "rfi.fr": 87,
  "france24.com": 87,
  "franceinfo.fr": 84,
  "lefigaro.fr": 82,
  "liberation.fr": 82,
  "bfmtv.com": 76,
  "nytimes.com": 89,
  "theguardian.com": 88,
  "aljazeera.com": 84,
  "jeuneafrique.com": 82,
  "africanews.com": 80,
  "theafricareport.com": 79,
  "bloomberg.com": 87,
  "ft.com": 87,
  "dw.com": 85,
  "voaafrica.com": 84,
  "voanews.com": 84,
  "cnn.com": 83,
  "mongabay.com": 80,
  // RDC & Afrique centrale
  "radiookapi.net": 90,
  "actualite.cd": 83,
  "7sur7.cd": 80,
  "politico.cd": 78,
  "acp.cd": 82,
  "digitalcongo.net": 76,
  "zoom-eco.net": 75,
  "presidence.cd": 90,
  "primature.cd": 88,
  "bcc.cd": 91,
  "ceni.cd": 86,
  "unikin.ac.cd": 82,
  "adiac-congo.com": 76,
  // Science & éducation
  "nature.com": 92,
  "science.org": 92,
  "arxiv.org": 86,
  "pubmed.ncbi.nlm.nih.gov": 90,
  "sciencedirect.com": 84,
  "sciencedaily.com": 79,
  "jstor.org": 85,
  "cia.gov": 85,
  "nasa.gov": 91,
  "noaa.gov": 90,
  "khanacademy.org": 80,
  "coursera.org": 74,
  "ocw.mit.edu": 86,
  // Tech & dev
  "developer.mozilla.org": 88,
  "stackoverflow.com": 82,
  "github.com": 80,
  "w3.org": 86,
  "ietf.org": 85,
  "nodejs.org": 80,
  "react.dev": 82,
  "nextjs.org": 80,
  "developer.chrome.com": 82,
  // Gouvernements étrangers
  "service-public.fr": 86,
  "gov.uk": 88,
  "canada.ca": 86,
  // Sport & culture
  "fifa.com": 80,
  "cafonline.com": 78,
  "lequipe.fr": 78,
  "espn.com": 78,
  "imdb.com": 76,
  "allocine.fr": 74,
};

/** Fermes de contenu / UGC peu fiables — pénalité douce, jamais exclusion. */
const LOW_AUTHORITY =
  /\b(pinterest\.|quora\.|answers\.com|blogspot\.|wordpress\.com|medium\.com|tumblr\.|msn\.com\/(fr|en)\/)/i;

/**
 * Score 0-100. Hiérarchie : table exacte → domaine parent → heuristiques
 * TLD institutionnelles → hash stable du domaine (reproductible).
 */
export function domainAuthority(domain: string): number {
  const d = domain.toLowerCase().replace(/^www\./, "").trim();
  if (!d) return 50;

  if (AUTHORITY[d] !== undefined) return AUTHORITY[d];
  const parts = d.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join(".");
    if (AUTHORITY[parent] !== undefined) return AUTHORITY[parent];
  }

  if (/(^|\.)(gouv|gov)\.cd$/.test(d)) return 88;
  if (d.endsWith(".cd")) return 78;
  if (/(^|\.)(gov|gouv|gob|gouv)\.[a-z]{2,3}$/.test(d) || d.endsWith(".gov")) return 84;
  if (d.endsWith(".edu") || /\.ac\.[a-z]{2,3}$/.test(d)) return 80;
  if (d.endsWith(".int")) return 86;
  if (LOW_AUTHORITY.test(d)) return 55;

  let h = 0;
  for (let i = 0; i < d.length; i++) h = (h * 31 + d.charCodeAt(i)) >>> 0;
  return 60 + (h % 15);
}
