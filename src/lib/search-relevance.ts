import { scoreBrandDoc, BRAND_SEARCH_DOCS } from "./sister-search";

/** Mots vides FR/EN — ne doivent jamais déclencher un match seuls. */
export const STOPWORDS = new Set([
  "de",
  "du",
  "des",
  "le",
  "la",
  "les",
  "un",
  "une",
  "et",
  "ou",
  "en",
  "au",
  "aux",
  "a",
  "à",
  "the",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "is",
  "are",
  "was",
  "be",
  "combien",
  "comment",
  "pourquoi",
  "quoi",
  "que",
  "qui",
  "où",
  "ce",
  "cette",
  "ces",
  "son",
  "sa",
  "ses",
  "mon",
  "ma",
  "mes",
  "sur",
  "par",
  "avec",
  "sans",
  "dans",
  "il",
  "elle",
  "on",
  "nous",
  "vous",
  "ils",
  "elles",
  "ne",
  "pas",
  "plus",
  "moins",
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "will",
  "would",
  "can",
  "could",
  "est",
  "sont",
  "être",
  "avoir",
  "quel",
  "quelle",
  "quels",
  "quelles",
  "fait",
  "faire",
  "tout",
  "tous",
  "toute",
  "très",
  "bien",
  "aussi",
]);

export function normalizeQueryText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

export function compactQuery(s: string): string {
  return normalizeQueryText(s).replace(/[\s._-]/g, "");
}

/** Tokens significatifs (sans stopwords). */
export function meaningfulTokens(query: string, minLen = 2): string[] {
  return normalizeQueryText(query)
    .split(/[\s\-_./]+/)
    .filter((t) => t.length >= minLen && !STOPWORDS.has(t));
}

export function isCongoHint(q: string): boolean {
  return /\b(rdc|congo|kinshasa|lubumbashi|katanga|goma|lingala|cobalt|coltan|bcc|unikin|drc)\b/i.test(
    q,
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Match mot entier — évite « capital » dans « capitale », « caire » dans « centrale ». */
export function tokenMatchesInHay(token: string, hay: string): boolean {
  if (!token) return false;
  if (token.length >= 3) {
    const re = new RegExp(
      `(?:^|[^a-z0-9àâäéèêëïîôùûüç])${escapeRegExp(token)}(?:[^a-z0-9àâäéèêëïîôùûüç]|$)`,
      "i",
    );
    if (re.test(hay)) return true;
  }
  const words = hay.split(/[\s,.;:!?()[\]{}'"\/\\-]+/).filter(Boolean);
  return words.some((w) => w === token);
}

/**
 * Score de pertinence texte ↔ requête.
 * Exige un recouvrement réel — pas un seul « de » ou « langue » isolé.
 */
export function relevanceScore(text: string, query: string): number {
  const hay = normalizeQueryText(text);
  const qNorm = normalizeQueryText(query);
  const qCompact = compactQuery(query);

  if (qNorm.length >= 3 && tokenMatchesInHay(qNorm, hay)) return 100;

  const tokens = meaningfulTokens(query);
  if (!tokens.length) {
    if (qCompact.length >= 3 && hay.replace(/[\s._-]/g, "").includes(qCompact)) return 75;
    return 0;
  }

  let matched = 0;
  let score = 0;
  for (const t of tokens) {
    if (tokenMatchesInHay(t, hay)) {
      matched++;
      score += 14;
    }
  }

  const required =
    tokens.length <= 2 ? tokens.length : Math.max(2, Math.ceil(tokens.length * 0.55));
  if (matched < required) {
    return matched > 0 ? Math.min(12, score * 0.25) : 0;
  }

  score += matched * 10;
  if (matched === tokens.length) score += 18;
  return score;
}

export function isRelevantText(text: string, query: string, minScore = 22): boolean {
  return relevanceScore(text, query) >= minScore;
}

export function isStrongBrandQuery(query: string): boolean {
  return BRAND_SEARCH_DOCS.some((d) => scoreBrandDoc(d, query) >= 150);
}

export function topBrandScore(query: string): number {
  let best = 0;
  for (const d of BRAND_SEARCH_DOCS) {
    best = Math.max(best, scoreBrandDoc(d, query));
  }
  return best;
}

export type NavigationalSite = {
  title: string;
  url: string;
  snippet: string;
  domain: string;
};

/** Requêtes navigationnelles — site officiel en tête (YouTube, Google…). */
export const NAVIGATIONAL_SITES: Record<string, NavigationalSite> = {
  youtube: {
    title: "YouTube",
    url: "https://www.youtube.com/",
    domain: "youtube.com",
    snippet:
      "Plateforme vidéo — regarder, uploader et partager des vidéos dans le monde entier.",
  },
  google: {
    title: "Google",
    url: "https://www.google.com/",
    domain: "google.com",
    snippet: "Moteur de recherche, Gmail, Maps, Drive et services Google.",
  },
  facebook: {
    title: "Facebook",
    url: "https://www.facebook.com/",
    domain: "facebook.com",
    snippet: "Réseau social — connectez-vous avec vos amis et votre famille.",
  },
  instagram: {
    title: "Instagram",
    url: "https://www.instagram.com/",
    domain: "instagram.com",
    snippet: "Photos, reels et stories — réseau social Meta.",
  },
  whatsapp: {
    title: "WhatsApp",
    url: "https://www.whatsapp.com/",
    domain: "whatsapp.com",
    snippet: "Messagerie instantanée — messages, appels et partage de fichiers.",
  },
  twitter: {
    title: "X (Twitter)",
    url: "https://x.com/",
    domain: "x.com",
    snippet: "Réseau social — actualités et conversations en temps réel.",
  },
  x: {
    title: "X (Twitter)",
    url: "https://x.com/",
    domain: "x.com",
    snippet: "Réseau social — actualités et conversations en temps réel.",
  },
  netflix: {
    title: "Netflix",
    url: "https://www.netflix.com/",
    domain: "netflix.com",
    snippet: "Streaming films et séries — abonnement Netflix.",
  },
  amazon: {
    title: "Amazon",
    url: "https://www.amazon.com/",
    domain: "amazon.com",
    snippet: "Marketplace — achats en ligne, livraison mondiale.",
  },
  wikipedia: {
    title: "Wikipédia",
    url: "https://fr.wikipedia.org/",
    domain: "wikipedia.org",
    snippet: "Encyclopédie libre — millions d’articles dans toutes les langues.",
  },
  gmail: {
    title: "Gmail",
    url: "https://mail.google.com/",
    domain: "google.com",
    snippet: "Messagerie Google — e-mail gratuit avec stockage cloud.",
  },
  tiktok: {
    title: "TikTok",
    url: "https://www.tiktok.com/",
    domain: "tiktok.com",
    snippet: "Vidéos courtes — création et découverte de contenus.",
  },
  linkedin: {
    title: "LinkedIn",
    url: "https://www.linkedin.com/",
    domain: "linkedin.com",
    snippet: "Réseau professionnel — emploi, recrutement et networking.",
  },
  github: {
    title: "GitHub",
    url: "https://github.com/",
    domain: "github.com",
    snippet: "Hébergement de code — dépôts Git, open source et collaboration.",
  },
  reddit: {
    title: "Reddit",
    url: "https://www.reddit.com/",
    domain: "reddit.com",
    snippet: "Communautés et discussions — forums par thème.",
  },
  spotify: {
    title: "Spotify",
    url: "https://open.spotify.com/",
    domain: "spotify.com",
    snippet: "Streaming musical — millions de titres et podcasts.",
  },
};

export function navigationalSiteForQuery(query: string): NavigationalSite | null {
  const q = normalizeQueryText(query);
  const compact = compactQuery(query);
  const tokens = meaningfulTokens(query);

  if (tokens.length > 2) return null;

  const key = tokens.length === 1 ? tokens[0] : compact.length <= 20 ? compact : "";
  if (key && NAVIGATIONAL_SITES[key]) return NAVIGATIONAL_SITES[key];

  for (const [k, site] of Object.entries(NAVIGATIONAL_SITES)) {
    if (q === k || compact === k) return site;
    if (tokens.length === 1 && tokens[0] === k) return site;
  }

  return null;
}

export function isStrongAyebiMatch(
  score: number,
  article: { slug: string; title: string; tags?: string[] },
  query: string,
): boolean {
  if (score >= 55) return true;
  const q = normalizeQueryText(query);
  const qc = compactQuery(query);
  const title = normalizeQueryText(article.title);
  const slug = article.slug.toLowerCase();

  if (qc.length >= 3 && (slug.includes(qc) || title.includes(q) || qc === slug.replace(/-/g, ""))) {
    return true;
  }
  if (/\b(jemsa|tala|sombateka|omega|devalpha|ayeba)\b/.test(q) && score >= 35) return true;
  if (isCongoHint(query) && score >= 42) return true;
  return score >= 48;
}

export function ayebiPanelMinScore(query: string): number {
  if (isStrongBrandQuery(query)) return 35;
  if (isCongoHint(query)) return 42;
  return 48;
}

export function rdcRankingBoost(
  r: { congoRelevant?: boolean; domain: string; region?: string },
  query: string,
  localitySlider: number,
  textRelevance: number,
): number {
  const isRdc =
    Boolean(r.congoRelevant) || r.domain.endsWith(".cd") || r.region === "rdc";
  if (!isRdc) return 0;

  const factor = localitySlider / 100;
  let boost = 12 * factor;
  if (isCongoHint(query)) boost += 26 * factor;
  if (textRelevance >= 40) boost += 8 * factor;
  return boost;
}

export function estimateResultCount(input: {
  uniqueHits: number;
  ftsHits: number;
  indexProjected?: number;
}): number {
  const base = Math.max(input.uniqueHits, input.ftsHits) * 850;
  const indexed = input.indexProjected ?? 0;
  if (indexed > 0) return Math.max(base, indexed);
  return Math.max(base, input.uniqueHits * 1200, 1200);
}

export function isAyebiResultRelevant(
  r: { domain: string; url: string; title: string; snippet: string },
  query: string,
): boolean {
  if (r.domain !== "ayebi" && !r.url.startsWith("/ayebi/")) return true;
  return isRelevantText(`${r.title} ${r.snippet} ${r.url}`, query, 35);
}

export function isResultRelevant(
  r: {
    domain: string;
    url: string;
    title: string;
    snippet: string;
    sourceType?: string;
  },
  query: string,
): boolean {
  if (/\b(jemsa|tala|sombateka|omega|ayeba|devalpha)\b/i.test(`${r.title} ${r.domain} ${r.url}`)) {
    return topBrandScore(query) >= 80 || isRelevantText(`${r.title} ${r.snippet}`, query, 15);
  }
  if (r.domain.includes("wikipedia.org")) {
    return isRelevantText(`${r.title} ${r.snippet}`, query, 18);
  }
  if (navigationalSiteForQuery(query) && r.domain.includes(navigationalSiteForQuery(query)!.domain)) {
    return true;
  }
  return isRelevantText(`${r.title} ${r.snippet} ${r.domain} ${r.url}`, query, 20);
}

export function isRawHitRelevant(
  hit: { title: string; snippet: string; url: string; source?: string },
  query: string,
): boolean {
  if (hit.source === "navigational") return true;
  if (hit.url.startsWith("/ayebi/")) {
    return isRelevantText(`${hit.title} ${hit.snippet}`, query, 35);
  }
  return isRelevantText(`${hit.title} ${hit.snippet} ${hit.url}`, query, 20);
}
