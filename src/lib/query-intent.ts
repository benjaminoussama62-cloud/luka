import { navigationalSiteForQuery, type NavigationalSite } from "./search-relevance";

export type QuestionType = "who" | "where" | "what" | "when" | "which" | "howmany";

export type SearchIntent =
  | { kind: "math"; expr: string; display: string }
  | { kind: "capital"; subject: string; wikiQuery: string }
  | { kind: "city"; label: string; wikiQuery: string }
  | { kind: "geography"; subject: string; wikiQuery: string }
  | {
      kind: "question";
      qtype: QuestionType;
      subject: string;
      wikiQuery: string;
      /** Attribut demandé (« président », « commune », « âge »…) pour la réponse structurée. */
      attr?: string;
    }
  | { kind: "navigational"; site: NavigationalSite }
  | { kind: "general" };

const COUNTRY_ALIASES: Record<string, string> = {
  chine: "Chine",
  chinois: "Chine",
  chinoise: "Chine",
  china: "Chine",
  chinese: "Chine",
  mali: "Mali",
  malien: "Mali",
  france: "France",
  français: "France",
  francaise: "France",
  french: "France",
  rdc: "République démocratique du Congo",
  congo: "République démocratique du Congo",
  "republique democratique du congo": "République démocratique du Congo",
  belgique: "Belgique",
  belge: "Belgique",
  usa: "États-Unis",
  "etats-unis": "États-Unis",
  "états-unis": "États-Unis",
  amerique: "États-Unis",
  américain: "États-Unis",
  americain: "États-Unis",
  japon: "Japon",
  japonais: "Japon",
  japonaise: "Japon",
  egypte: "Égypte",
  égypte: "Égypte",
  egyptien: "Égypte",
  égyptien: "Égypte",
  allemagne: "Allemagne",
  allemand: "Allemagne",
  italie: "Italie",
  italien: "Italie",
  espagne: "Espagne",
  espagnol: "Espagne",
  anglais: "Royaume-Uni",
  angleterre: "Royaume-Uni",
  uk: "Royaume-Uni",
  bresil: "Brésil",
  brésil: "Brésil",
  brésilien: "Brésil",
  bresilien: "Brésil",
  afrique: "Afrique",
};

const CITY_LOOKUP: Record<string, { label: string; wikiQuery: string }> = {
  caire: { label: "Le Caire", wikiQuery: "Le Caire" },
  cairo: { label: "Le Caire", wikiQuery: "Le Caire" },
  paris: { label: "Paris", wikiQuery: "Paris" },
  londres: { label: "Londres", wikiQuery: "Londres" },
  london: { label: "Londres", wikiQuery: "Londres" },
  berlin: { label: "Berlin", wikiQuery: "Berlin" },
  pekin: { label: "Pékin", wikiQuery: "Pékin" },
  pékin: { label: "Pékin", wikiQuery: "Pékin" },
  beijing: { label: "Pékin", wikiQuery: "Pékin" },
  kinshasa: { label: "Kinshasa", wikiQuery: "Kinshasa" },
  lubumbashi: { label: "Lubumbashi", wikiQuery: "Lubumbashi" },
  goma: { label: "Goma", wikiQuery: "Goma" },
  dakar: { label: "Dakar", wikiQuery: "Dakar" },
  lagos: { label: "Lagos", wikiQuery: "Lagos" },
  nairobi: { label: "Nairobi", wikiQuery: "Nairobi" },
  madrid: { label: "Madrid", wikiQuery: "Madrid" },
  rome: { label: "Rome", wikiQuery: "Rome" },
  moskou: { label: "Moscou", wikiQuery: "Moscou" },
  moscou: { label: "Moscou", wikiQuery: "Moscou" },
  moscow: { label: "Moscou", wikiQuery: "Moscou" },
  tokyo: { label: "Tokyo", wikiQuery: "Tokyo" },
  tokio: { label: "Tokyo", wikiQuery: "Tokyo" },
  newyork: { label: "New York", wikiQuery: "New York" },
  "new york": { label: "New York", wikiQuery: "New York" },
};

function normKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/['']/g, "'")
    .trim();
}

function normalizeCountry(raw: string): string {
  const k = normKey(raw).replace(/\?+$/, "");
  return COUNTRY_ALIASES[k] ?? raw.trim().replace(/\?+$/, "");
}

function parseCapitalIntent(query: string): { subject: string; wikiQuery: string } | null {
  const q = query.trim();
  const patterns = [
    /quel(?:le)?s?\s+(?:est\s+)?(?:le\s+)?capital\s+(?:de\s+(?:la\s+)?|du\s+|d[''])?(.+?)\??$/i,
    /quel(?:le)?s?\s+(?:est\s+)?(?:le\s+)?capital\s+(.+?)\??$/i,
    /quel(?:le)?s?\s+(?:est[-\s])?(?:la\s+)?capitale\s+(?:de\s+(?:la\s+)?|du\s+|d[''])?(.+?)\??$/i,
    /quelle\s+est\s+la\s+capitale\s+(?:de\s+(?:la\s+)?|du\s+|d[''])?(.+?)\??$/i,
    /capitale\s+(?:de\s+(?:la\s+)?|du\s+|d[''])?(.+?)\??$/i,
    /capital\s+of\s+(?:the\s+)?(.+?)\??$/i,
    /(.+?)\s+capital\s+city\??$/i,
  ];
  for (const pat of patterns) {
    const m = q.match(pat);
    if (m?.[1]) {
      const subject = normalizeCountry(m[1]);
      return { subject, wikiQuery: `capitale ${subject}` };
    }
  }
  return null;
}

function parseCityIntent(query: string): { label: string; wikiQuery: string } | null {
  const k = normKey(query).replace(/[?.!]+$/, "");
  if (CITY_LOOKUP[k]) return CITY_LOOKUP[k];
  return null;
}

function parseGeographyIntent(query: string): { subject: string; wikiQuery: string } | null {
  const normalized = normKey(query);
  if (!/\b(kilometre|kilometres|km|superficie|surface|distance|largeur|longueur)\b/.test(normalized)) {
    return null;
  }
  for (const city of Object.values(CITY_LOOKUP)) {
    if (normalized.includes(normKey(city.label))) {
      return { subject: city.label, wikiQuery: city.wikiQuery };
    }
  }
  return null;
}

/**
 * Français SMS → forme standard — pour l'analyse d'intention et l'extraction
 * d'entité uniquement (la requête affichée reste celle de l'utilisateur).
 * « dans kel commune c trouve la bcdc » → « dans quelle commune se trouve la bcdc ».
 */
export function normalizeSmsFrench(query: string): string {
  let s = normKey(query).replace(/[?.!]+/g, " ").replace(/\s+/g, " ").trim();
  const fixes: [RegExp, string][] = [
    [/\bc quoi\b/g, "c'est quoi"],
    [/\bski\b/g, "qu'est-ce qui"],
    [/\bske\b/g, "qu'est-ce que"],
    [/\bkels\b/g, "quels"],
    [/\bkelles\b/g, "quelles"],
    [/\bkelle\b/g, "quelle"],
    [/\bkel\b/g, "quel"],
    [/\bkelke\b|\bkelque\b/g, "quelque"],
    [/\bkelkun\b|\bkelkin\b/g, "quelqu'un"],
    [/\bt\b/g, "t'"],
    // « c » isolé = « se » dans « c trouve », « c situe »… (jamais « c'est » : couvert par c quoi)
    [/\bc\b/g, "se"],
  ];
  for (const [re, to] of fixes) s = s.replace(re, to);
  return s;
}

function stripLeadingDeter(s: string): string {
  return s
    .replace(/^(?:au|aux|en|dans|sur|vers|de|du|des|d['']|le|la|les|l['']|un|une)\s+/i, "")
    .trim();
}

const PARTICIPLES =
  /\b(?:ne|nee|nes|nees|mort|morte|morts|mortes|fonde|fondee|fondes|cree|creee|crees|apparu|apparue|commence|commencee|devenu|devenue|est|etait|fut|sont)\b/g;

function cleanSubject(raw: string): string {
  return stripLeadingDeter(raw.trim().replace(/[?.!]+$/, ""))
    .replace(PARTICIPLES, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Règles à 2 groupes : [attribut, sujet] — le sujet devient l'entité cherchée. */
const QUESTION_ATTR_RULES: { qtype: QuestionType; re: RegExp }[] = [
  {
    qtype: "which",
    // « qui est le president de la rdc » — demande une valeur, pas une bio
    re: /^qui est (?:le|la|les|l['''])\s*(.+?)\s+(?:de|du|des|d['''])\s+(.+)$/,
  },
  {
    qtype: "which",
    // « quel est le president de la rdc » / « quelle est la monnaie du japon »
    re: /^quel(?:le)?s?\s+(?:est|sont|etait|fut)\s+(?:le\s+|la\s+|les\s+|l['''])?(.+?)\s+(?:de|du|des|d['''])\s+(.+)$/,
  },
  {
    qtype: "which",
    // « quelle est la date de naissance de poutine » (même regex que dessus)
    re: /^qu[''']il est (?:le|la|les|l['''])\s*(.+?)\s+(?:de|du|des|d['''])\s+(.+)$/,
  },
  {
    qtype: "which",
    // « quel age a poutine » / « quelle est la taille de messi »
    re: /^quel(?:le)?s?\s+(age|taille|poids|fortune|salaire)\s+a\s+(?:le\s+|la\s+|l['''])?(.+)$/,
  },
  {
    qtype: "howmany",
    // « combien d'habitants a/compte la rdc » → attr + sujet
    re: /^combien\s+(?:de\s+|d['''])(\w+)\s+(?:a|en|compte|possede|y a[- ]t[''']il(?: dans)?)\s+(?:le\s+|la\s+|les\s+|l[''']|du\s+|des\s+|d['''])?(.+)$/,
  },
  {
    qtype: "where",
    // « dans quel(le) pays/ville/commune… se trouve X » → attr = nom de lieu, sujet = X
    re: /^dans quel(?:le)?s?\s+(\S+)\s+(?:se\s+)?(?:trouve|situe|localise|est|sont)\w*\s+(.+)$/,
  },
  {
    qtype: "where",
    // « quelle commune se trouve au sud est de la rdc »
    re: /^quel(?:le)?s?\s+(\S+)\s+(?:se\s+)?(?:trouve|situe|est|sont)\s+(.+)$/,
  },
];

const QUESTION_RULES: { qtype: QuestionType; re: RegExp; attrFrom?: RegExp }[] = [
  { qtype: "who", re: /^qui (?:est|etait|fut|sont|etaient|reste|devient)\s+(.+)$/ },
  { qtype: "who", re: /^who (?:is|was|are|were)\s+(.+)$/ },
  {
    qtype: "what",
    re: /^(?:qu['']est[- ]ce que|qu['']est[- ]ce qu[''']|quest[- ]ce que|c['']est quoi|que signifie|qu['']appelle[- ]t[''']on|definition (?:de|du|des|d[''']))\s*(.+)$/,
  },
  { qtype: "what", re: /^what (?:is|are|was|does|do)\s+(.+)$/ },
  {
    qtype: "where",
    re: /^ou\s+(?:se trouve(?:nt)?|se situe(?:nt)?|se localise|est|sont|se trouve[- ]t[''']on)\s+(.+)$/,
  },
  { qtype: "where", re: /^where (?:is|are|was)\s+(.+)$/ },
  { qtype: "when", re: /^quand\s+(?:est|etait|a\s+ete|fut|sont|sera)\s+(.+)$/ },
  { qtype: "when", re: /^en quelle annee\s+(.+)$/ },
  { qtype: "when", re: /^when (?:did|was|is|were)\s+(.+)$/ },
  { qtype: "howmany", re: /^combien\s+(?:de\s+|d[''']|y a[- ]t[''']il\s+)?(.+)$/ },
];

/** Indice verbal pour les questions « quand » : naissance vs décès vs fondation. */
function whenAttr(_subjectRaw: string, full: string): string | undefined {
  if (/\b(mort|morte|deces|decede|decedee|died|death)\b/.test(full)) return "mort";
  if (/\b(fondation|fonde|fondee|cree|creee|creation|founded|established)\b/.test(full)) return "fondation";
  if (/\b(ne|nee|nes|nees|naissance|born|birth)\b/.test(full)) return "naissance";
  void _subjectRaw;
  return undefined;
}

function parseQuestionIntent(raw: string): SearchIntent | null {
  const nq = normalizeSmsFrench(raw);
  if (!nq || nq.split(" ").length < 3) return null;

  // Formes [attribut, sujet] d'abord — plus précises que « qui est X » générique.
  for (const rule of QUESTION_ATTR_RULES) {
    const m = nq.match(rule.re);
    if (!m) continue;
    const attr = cleanSubject(m[1]);
    const subj = cleanSubject(m[2]);
    if (!attr || subj.length < 2) continue;
    const canon = normalizeCountry(subj);
    return {
      kind: "question",
      qtype: rule.qtype,
      subject: canon,
      wikiQuery: rule.qtype === "where" || rule.qtype === "howmany" ? canon : `${attr} ${canon}`,
      attr,
    };
  }

  for (const rule of QUESTION_RULES) {
    const m = nq.match(rule.re);
    if (!m) continue;
    const subject = cleanSubject(m[1]);
    if (subject.length < 2) continue;
    const canon = normalizeCountry(subject);
    return {
      kind: "question",
      qtype: rule.qtype,
      subject: canon,
      wikiQuery: canon,
      attr: rule.qtype === "when" ? whenAttr(m[1], nq) : undefined,
    };
  }
  return null;
}

export function parseSearchIntent(query: string): SearchIntent {
  const raw = query.trim();
  if (!raw) return { kind: "general" };

  const mathDisplay = raw.replace(/,/g, ".");
  const mathExpr = mathDisplay.replace(/=+\s*$/, "");
  if (
    /^[\d\s+\-*/().^%]+=?\s*$/.test(mathDisplay) &&
    /[\d]/.test(mathExpr) &&
    /[+\-*/^]/.test(mathExpr)
  ) {
    return { kind: "math", expr: mathExpr, display: raw };
  }

  const capital = parseCapitalIntent(raw);
  if (capital) return { kind: "capital", ...capital };

  const geography = parseGeographyIntent(raw);
  if (geography) return { kind: "geography", ...geography };

  const city = parseCityIntent(raw);
  if (city) return { kind: "city", ...city };

  const nav = navigationalSiteForQuery(raw);
  if (nav) return { kind: "navigational", site: nav };

  const question = parseQuestionIntent(raw);
  if (question) return question;

  return { kind: "general" };
}

/** Capitales connues — réponse immédiate si Wikipedia tarde. */
export const KNOWN_CAPITALS: Record<
  string,
  { capital: string; country: string; summary: string; wiki: string }
> = {
  chine: {
    capital: "Pékin",
    country: "Chine",
    summary:
      "Pékin (Beijing) est la capitale de la République populaire de Chine — siège du gouvernement et centre politique.",
    wiki: "https://fr.wikipedia.org/wiki/P%C3%A9kin",
  },
  mali: {
    capital: "Bamako",
    country: "Mali",
    summary: "Bamako est la capitale du Mali, plus grande ville du pays sur le fleuve Niger.",
    wiki: "https://fr.wikipedia.org/wiki/Bamako",
  },
  france: {
    capital: "Paris",
    country: "France",
    summary: "Paris est la capitale de la France et sa plus grande ville.",
    wiki: "https://fr.wikipedia.org/wiki/Paris",
  },
  egypte: {
    capital: "Le Caire",
    country: "Égypte",
    summary: "Le Caire est la capitale de l'Égypte et la plus grande ville du monde arabe.",
    wiki: "https://fr.wikipedia.org/wiki/Le_Caire",
  },
  "republique democratique du congo": {
    capital: "Kinshasa",
    country: "RDC",
    summary: "Kinshasa est la capitale de la République démocratique du Congo.",
    wiki: "https://fr.wikipedia.org/wiki/Kinshasa",
  },
};

export function knownCapitalAnswer(intent: SearchIntent): {
  capital: string;
  country: string;
  summary: string;
  wiki: string;
} | null {
  if (intent.kind !== "capital") return null;
  const k = normKey(intent.subject);
  return KNOWN_CAPITALS[k] ?? null;
}

/** Requête envoyée à Wikipedia / DDG (peut différer de la saisie utilisateur). */
export function upstreamQuery(query: string, intent: SearchIntent): string {
  switch (intent.kind) {
    case "capital":
      return intent.wikiQuery;
    case "city":
      return intent.wikiQuery;
    case "geography":
      return intent.wikiQuery;
    case "question":
      // « qui est vladimir putin ? » → upstream cherche « vladimir putin », pas la question.
      return intent.wikiQuery;
    default:
      return query;
  }
}

/** Entités géo mentionnées dans la requête — pour pénaliser les résultats hors-sujet. */
export function geoSubjectsInQuery(query: string): string[] {
  const subjects = new Set<string>();
  const k = normKey(query);
  for (const [alias, canonical] of Object.entries(COUNTRY_ALIASES)) {
    if (k.includes(alias)) subjects.add(normKey(canonical));
  }
  for (const cityKey of Object.keys(CITY_LOOKUP)) {
    if (k === cityKey || k.includes(` ${cityKey}`) || k.startsWith(`${cityKey} `)) {
      subjects.add(normKey(CITY_LOOKUP[cityKey].label));
    }
  }
  const cap = parseCapitalIntent(query);
  if (cap) subjects.add(normKey(cap.subject));
  return [...subjects];
}

export function geoMismatchPenalty(
  resultText: string,
  query: string,
): number {
  const subjects = geoSubjectsInQuery(query);
  if (!subjects.length) return 0;
  const hay = normKey(resultText);

  const mentionsSubject = subjects.some((s) => hay.includes(s.replace(/[\s-]/g, "")) || hay.includes(s));
  if (mentionsSubject) return 0;

  const congoOnly =
    /\b(rdc|congo|kinshasa|lubumbashi|goma|franc congolais|bcc)\b/.test(hay) ||
    hay.includes("republique democratique du congo");
  const queryAboutOther =
    subjects.some(
      (s) =>
        s.includes("chine") ||
        s.includes("mali") ||
        s.includes("france") ||
        s.includes("egypte") ||
        s.includes("le caire") ||
        s.includes("cairo"),
    );

  if (congoOnly && queryAboutOther) return 200;
  if (/\bcapital\b|\bcapitale\b/.test(normKey(query)) && congoOnly && !subjects.some((s) => s.includes("congo"))) {
    return 180;
  }
  return 0;
}
