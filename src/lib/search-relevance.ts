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

/** Levenshtein borné — renvoie true si distance ≤ max (coupe tôt pour la perf). */
function boundedLevenshtein(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev: number[] = [];
  for (let j = 0; j <= b.length; j++) prev.push(j);
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
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
  if (words.some((w) => w === token)) return true;
  // Tolérance translittération/faute : « putin » ≈ « poutine » (dist. 2), « congolais » ≈ « congolaise ».
  // Même initiale obligatoire + distance bornée — la pertinence exige plusieurs tokens de toute façon.
  if (token.length >= 5) {
    const maxDist = 2;
    for (const w of words) {
      if (w[0] !== token[0] || Math.abs(w.length - token.length) > maxDist) continue;
      if (w.startsWith(token) || token.startsWith(w) || boundedLevenshtein(token, w, maxDist)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Score de pertinence texte ↔ requête.
 * Sert au classement — pas à vider la SERP. Les hits déjà récupérés
 * par un moteur amont (Wikipédia, Bing…) restent admissibles via
 * `isRetrievedHitAdmissible` même si le score texte est bas (alias,
 * entité résolue, titre différent de la requête).
 */
export function relevanceScore(text: string, query: string): number {
  const hay = normalizeQueryText(text);
  const qNorm = normalizeQueryText(query);
  const qCompact = compactQuery(query);

  if (qNorm.length >= 2 && tokenMatchesInHay(qNorm, hay)) return 100;
  if (qCompact.length >= 2 && hay.replace(/[\s._-]/g, "").includes(qCompact)) return 90;

  const tokens = meaningfulTokens(query, 1);
  const significant = tokens.filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  if (!significant.length) {
    return qCompact.length >= 2 && hay.includes(qCompact) ? 70 : 0;
  }

  let matched = 0;
  let score = 0;
  for (const t of significant) {
    if (tokenMatchesInHay(t, hay)) {
      matched++;
      score += 14;
    }
  }

  const required =
    significant.length <= 2
      ? Math.min(1, significant.length)
      : Math.max(2, Math.ceil(significant.length * 0.55));
  if (matched < required) {
    return matched > 0 ? Math.min(18, score * 0.4) : 0;
  }

  score += matched * 10;
  if (matched === significant.length) score += 18;
  return score;
}

/**
 * Pertinence après compréhension : score max entre la requête brute et les
 * sujets canoniques (entité, forme corrigée courte…). Une phrase longue
 * (« qui est le chanteur américain connu sous le nom de Ye ») ne doit pas
 * exiger que le titre matche « chanteur », « américain », « connu » — seul
 * le sujet compris compte pour valider le hit.
 */
export function relevanceAgainstSubjects(
  text: string,
  primaryQuery: string,
  subjects: readonly string[] = [],
): number {
  let best = relevanceScore(text, primaryQuery);
  const seen = new Set([normalizeQueryText(primaryQuery)]);
  for (const s of subjects) {
    const t = s?.trim();
    if (!t || t.length < 1) continue;
    const key = normalizeQueryText(t);
    if (seen.has(key)) continue;
    seen.add(key);
    best = Math.max(best, relevanceScore(text, t));
  }
  return best;
}

/** Sujets de retrieval dérivés de la compréhension (toute longueur de requête). */
export function retrievalSubjects(input: {
  query: string;
  entity?: string;
  entityEn?: string;
  corrected?: string;
  wikiQuery?: string;
}): string[] {
  const out: string[] = [];
  const push = (s?: string) => {
    const t = s?.trim();
    if (!t || t.length < 1) return;
    if (normalizeQueryText(t) === normalizeQueryText(input.query) && out.length) return;
    if (out.some((x) => normalizeQueryText(x) === normalizeQueryText(t))) return;
    out.push(t);
  };
  push(input.entity);
  push(input.entityEn);
  push(input.wikiQuery);
  // Forme corrigée seulement si elle est courte / centrée sujet — pas la
  // phrase entière qui re-diluerait le score.
  if (input.corrected) {
    const sig = meaningfulTokens(input.corrected, 2);
    if (sig.length > 0 && sig.length <= 4) push(input.corrected);
  }
  return out;
}

/** Domaines / sources first-party Ayeba — priorité dans le ranking. */
export const FIRST_PARTY_HOST =
  /\b(jemsa\.net|to-tala\.com|sombatekaonline\.com|omega-web\.org|ayeba\.app|ayebi)\b/i;

/**
 * Un hit déjà ramené par un retrieval amont (wiki search, DDG, Bing…)
 * ne doit pas être éliminé par un second filtre lexical trop strict :
 * c’est ce qui produisait des SERP vides alors que Wikipédia avait répondu.
 * `subjects` = entités comprises (toute longueur de requête).
 */
export function isRetrievedHitAdmissible(
  r: {
    domain: string;
    url: string;
    title: string;
    snippet: string;
    sourceType?: string;
    keywords?: string[];
  },
  query: string,
  subjects: readonly string[] = [],
): boolean {
  const text = `${r.title} ${r.snippet} ${r.url}`;
  if (FIRST_PARTY_HOST.test(`${r.domain} ${r.url}`)) {
    return (
      topBrandScore(query) >= 60 ||
      relevanceAgainstSubjects(`${r.title} ${r.snippet}`, query, subjects) >= 12 ||
      r.domain === "ayebi" ||
      r.url.startsWith("/ayebi/")
    );
  }
  if (r.sourceType === "wiki" || r.domain.includes("wikipedia.org")) return true;
  if (r.keywords?.includes("retrieved:upstream")) {
    return (
      relevanceAgainstSubjects(text, query, subjects) >= 8 ||
      r.sourceType === "news"
    );
  }
  return (
    relevanceAgainstSubjects(text, query, subjects) >= 20 ||
    isResultRelevant(r, query)
  );
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

/**
 * Nombre de résultats affiché — honnête : le vrai nombre de sources
 * distinctes trouvées, jamais une projection ×N façon « 50 000 résultats ».
 */
export function estimateResultCount(input: { uniqueHits: number }): number {
  return input.uniqueHits;
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
    keywords?: string[];
  },
  query: string,
): boolean {
  if (FIRST_PARTY_HOST.test(`${r.domain} ${r.url}`)) {
    return topBrandScore(query) >= 60 || isRelevantText(`${r.title} ${r.snippet}`, query, 12);
  }
  // Wikipédia déjà ramenée par le retrieval — le ranking ordonne, il ne vide pas.
  if (r.sourceType === "wiki" || r.domain.includes("wikipedia.org")) return true;
  // Hits amont (Bing, DDG, Mojeek…) marqués à l’ingestion.
  if (r.keywords?.includes("retrieved:upstream")) return true;
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
