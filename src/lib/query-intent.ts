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
      /** Clé canonique de l'attribut émise par la compréhension LLM —
       *  indépendante de la langue (« subdivisions_count », « officeholder »). */
      attrKey?: string;
      /** Type d'entité attendu émis par le modèle (country/city/person/…). */
      entityType?: string;
      /** Traductions anglaises (modèle) — les fonctions Wikidata sont souvent
       *  libellées en anglais (« Minister of Sports of Guinea »). */
      attrEn?: string;
      entityEn?: string;
      /** Question au passé (« qui fut… », « en 1980 ») — le titulaire rendu
       *  par Wikidata est l'ACTUEL ; on le labellise honnêtement. */
      past?: boolean;
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
  return COUNTRY_ALIASES[k] ?? DEMONYMS[k] ?? COUNTRY_BY_NAME[k] ?? raw.trim().replace(/\?+$/, "");
}

/** Démonymes → pays (formes de base ; féminins et pluriels générés). */
const DEMONYM_BASE: Record<string, string> = {
  congolais: "République démocratique du Congo",
  chinois: "Chine",
  japonais: "Japon",
  francais: "France",
  belge: "Belgique",
  americain: "États-Unis",
  egyptien: "Égypte",
  allemand: "Allemagne",
  italien: "Italie",
  espagnol: "Espagne",
  anglais: "Royaume-Uni",
  bresilien: "Brésil",
  malien: "Mali",
  ougandais: "Ouganda",
  kenyan: "Kenya",
  rwandais: "Rwanda",
  tanzanien: "Tanzanie",
  burundais: "Burundi",
  zambien: "Zambie",
  zimbabween: "Zimbabwe",
  angolais: "Angola",
  mozambicain: "Mozambique",
  malgache: "Madagascar",
  senegalais: "Sénégal",
  ivoirien: "Côte d'Ivoire",
  burkinabe: "Burkina Faso",
  nigerien: "Niger",
  guineen: "Guinée",
  camerounais: "Cameroun",
  gabonais: "Gabon",
  tchadien: "Tchad",
  centrafricain: "République centrafricaine",
  somalien: "Somalie",
  ethiopien: "Éthiopie",
  soudanais: "Soudan",
  libyen: "Libye",
  tunisien: "Tunisie",
  algerien: "Algérie",
  marocain: "Maroc",
  mauritanien: "Mauritanie",
  togolais: "Togo",
  beninois: "Bénin",
  ghaneen: "Ghana",
  nigerian: "Nigeria",
  "sud africain": "Afrique du Sud",
  "sud-africain": "Afrique du Sud",
  botswanais: "Botswana",
  namibien: "Namibie",
  malawite: "Malawi",
  liberien: "Liberia",
  gambien: "Gambie",
  mauricien: "Maurice",
  comorien: "Comores",
  djiboutien: "Djibouti",
  erythreeen: "Érythrée",
  lesothan: "Lesotho",
  swazi: "Eswatini",
  suisse: "Suisse",
  autrichien: "Autriche",
  polonais: "Pologne",
  tcheque: "Tchéquie",
  roumain: "Roumanie",
  hongrois: "Hongrie",
  bulgare: "Bulgarie",
  grec: "Grèce",
  suedois: "Suède",
  norvegien: "Norvège",
  danois: "Danemark",
  finlandais: "Finlande",
  neerlandais: "Pays-Bas",
  hollandais: "Pays-Bas",
  irlandais: "Irlande",
  islandais: "Islande",
  portugais: "Portugal",
  ukrainien: "Ukraine",
  russe: "Russie",
  bielorusse: "Biélorussie",
  serbe: "Serbie",
  croate: "Croatie",
  slovene: "Slovénie",
  albanais: "Albanie",
  bosniaque: "Bosnie-Herzégovine",
  macedonien: "Macédoine du Nord",
  montenegrin: "Monténégro",
  kosovar: "Kosovo",
  moldave: "Moldavie",
  lituanien: "Lituanie",
  letton: "Lettonie",
  estonien: "Estonie",
  luxembourgeois: "Luxembourg",
  monegasque: "Monaco",
  britannique: "Royaume-Uni",
  ecossais: "Écosse",
  gallois: "Pays de Galles",
  canadien: "Canada",
  quebecois: "Québec",
  mexicain: "Mexique",
  cubain: "Cuba",
  haitien: "Haïti",
  dominicain: "République dominicaine",
  jamaicain: "Jamaïque",
  argentin: "Argentine",
  chilien: "Chili",
  colombien: "Colombie",
  venezuelien: "Venezuela",
  peruvien: "Pérou",
  bolivien: "Bolivie",
  equatorien: "Équateur",
  paraguayen: "Paraguay",
  uruguayen: "Uruguay",
  panameen: "Panama",
  costaricain: "Costa Rica",
  nicaraguayen: "Nicaragua",
  guatemalteque: "Guatemala",
  hondurien: "Honduras",
  salvadorien: "Salvador",
  portoricain: "Porto Rico",
  indien: "Inde",
  pakistanais: "Pakistan",
  bangladais: "Bangladesh",
  srilankais: "Sri Lanka",
  nepalais: "Népal",
  afghan: "Afghanistan",
  iranien: "Iran",
  irakien: "Irak",
  syrien: "Syrie",
  libanais: "Liban",
  israelien: "Israël",
  palestinien: "Palestine",
  jordanien: "Jordanie",
  saoudien: "Arabie saoudite",
  emirien: "Émirats arabes unis",
  qatari: "Qatar",
  koweitien: "Koweït",
  yemenite: "Yémen",
  omanais: "Oman",
  bahreini: "Bahreïn",
  turc: "Turquie",
  azeri: "Azerbaïdjan",
  armenien: "Arménie",
  georgien: "Géorgie",
  kazakh: "Kazakhstan",
  ouzbek: "Ouzbékistan",
  kirghiz: "Kirghizistan",
  tadjik: "Tadjikistan",
  turkmene: "Turkménistan",
  mongol: "Mongolie",
  coreen: "Corée du Sud",
  "sud coreen": "Corée du Sud",
  "sud-coreen": "Corée du Sud",
  "nord coreen": "Corée du Nord",
  "nord-coreen": "Corée du Nord",
  vietnamien: "Vietnam",
  thailandais: "Thaïlande",
  indonesien: "Indonésie",
  malaisien: "Malaisie",
  philippin: "Philippines",
  singapourien: "Singapour",
  birman: "Birmanie",
  cambodgien: "Cambodge",
  laotien: "Laos",
  australien: "Australie",
  neozelandais: "Nouvelle-Zélande",
  fidjien: "Fidji",
};

const DEMONYMS: Record<string, string> = (() => {
  const femOf = (m: string): string =>
    /een$/.test(m)
      ? m.replace(/een$/, "eenne")
      : /ien$/.test(m)
        ? m.replace(/ien$/, "ienne")
        : /yen$/.test(m)
          ? m.replace(/yen$/, "yenne")
          : /ain$/.test(m)
            ? m.replace(/ain$/, "aine")
            : /ais$/.test(m)
              ? m.replace(/ais$/, "aise")
              : /ois$/.test(m)
                ? m.replace(/ois$/, "oise")
                : /an$/.test(m)
                  ? m.replace(/an$/, "ane")
                  : /c$/.test(m)
                    ? `${m}que`
                    : m.endsWith("e")
                      ? m
                      : `${m}e`;
  const out: Record<string, string> = {};
  for (const [m, c] of Object.entries(DEMONYM_BASE)) {
    const f = femOf(m);
    out[m] = c;
    out[`${m}s`] = c;
    out[f] = c;
    out[`${f}s`] = c;
  }
  return out;
})();

/**
 * Noms de pays tels quels (« ouganda », « kenya »…) — générés depuis les
 * valeurs canoniques des démonymes pour que « premier ministre de l'ouganda »
 * résolve le même Q1036 que « premier ministre ougandais ».
 */
const COUNTRY_BY_NAME: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const c of Object.values(DEMONYM_BASE)) out[normKey(c)] = c;
  return out;
})();

/**
 * Mots « rôle » qui peuvent précéder une entité dans un sujet composé :
 * « premier ministre ougandais », « roi de Belgique », « fils de Kadhafi ».
 */
const ROLE_WORDS = new Set([
  "premier", "premiere", "ministre", "president", "presidente", "vice",
  "roi", "reine", "maire", "bourgmestre", "gouverneur", "chef", "dirigeant",
  "dirigeante", "pdg", "ceo", "pape", "sultan", "empereur", "imperatrice",
  "prince", "princesse", "fondateur", "fondatrice", "createur", "creatrice",
  "inventeur", "auteur", "autrice", "compositeur", "realisateur", "pere",
  "mere", "fils", "fille", "conjoint", "conjointe", "epoux", "epouse",
  "femme", "mari", "frere", "soeur", "enfant", "successeur", "predecesseur",
  "ambassadeur", "champion", "capitaine", "joueur", "joueuse", "chanteur",
  "chanteuse", "porte-parole", "dame", "leader", "commandant", "adjoint",
  "secretaire", "capitale", "monnaie", "langue", "hymne", "drapeau",
  "devise", "gentile", "symbole", "emblème", "embleme", "religion", "parti",
  "equipe", "selection",
]);

/**
 * Sujet composé « rôle + entité » : « premier ministre ougandais » →
 * { attr: "premier ministre", entity: "Ouganda" } ; « roi de belgique » →
 * { attr: "roi", entity: "Belgique" } ; « fils de putin » → personne.
 * Null si le préfixe n'est pas un rôle — sinon on casserait des entités
 * légitimes (« parc national congolais » ≠ Congo).
 */
function splitRoleEntity(subject: string): { attr: string; entity: string } | null {
  const n = normKey(subject);
  const tokens = n.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;

  // « <rôle> <démonyme> » — le démonyme en fin de sujet.
  for (const len of [3, 2, 1]) {
    if (tokens.length <= len) continue;
    const tail = tokens.slice(-len).join(" ");
    const country = DEMONYMS[tail] ?? DEMONYMS[tail.replace(/ /g, "-")];
    if (!country) continue;
    const attr = tokens.slice(0, -len).join(" ");
    if (attr.length < 3 || !ROLE_WORDS.has(attr.split(" ")[0])) return null;
    return { attr, entity: country };
  }

  // « <rôle> de/du/des/d' <entité> ».
  const m = n.match(/^(\S+(?:\s\S+)?)\s+(?:de|du|des|d')\s*(.+)$/);
  if (m && ROLE_WORDS.has(m[1].split(" ")[0]) && m[2].trim().length >= 2) {
    return { attr: m[1], entity: normalizeCountry(stripLeadingDeter(m[2].trim())) };
  }
  return null;
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
    // « t »/« c » isolés = « t' »/« se » — JAMAIS devant une apostrophe :
    // sans le lookahead, « c'est » devenait « se'est » (fuite jusqu'à la
    // suggestion affichée à l'utilisateur).
    [/\bt\b(?!['''])/g, "t'"],
    [/\bc\b(?!['''])/g, "se"],
  ];
  for (const [re, to] of fixes) s = s.replace(re, to);
  return s;
}

function stripLeadingDeter(s: string): string {
  return s
    .replace(/^(?:d[''']|l['''])/i, "")
    .replace(/^(?:au|aux|en|dans|sur|vers|de|du|des|d['']|le|la|les|l['']|un|une)\s+/i, "")
    .trim();
}

const PARTICIPLES =
  /\b(?:ne|nee|nes|nees|mort|morte|morts|mortes|fonde|fondee|fondes|cree|creee|crees|apparu|apparue|commence|commencee|devenu|devenue|est|etait|fut|sont)\b/g;

function cleanSubject(raw: string): string {
  return stripLeadingDeter(raw.trim().replace(/[?.!]+$/, ""))
    // Clause temporelle (« en 1980 ») et adjectifs de fonction (« actuel »,
    // « en fonction ») ne font pas partie de l'entité.
    .replace(/\ben\s+(?:l[''']an\s+)?\d{4}\b.*$/i, "")
    .replace(
      /\b(?:actuel|actuelle|actuels|actuelles|courant|courante|present|presente|en fonction|nouveau|nouvelle)\b/g,
      " ",
    )
    .replace(PARTICIPLES, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Marqueur temporel passé — « qui fut », « était », « ancien », « en 1980 ». */
function isPastQuery(nq: string): boolean {
  return /\b(fut|etaient?|a\s+ete|ont\s+ete|ancienn?e?s?|jadis|ex)\b/.test(nq) ||
    /\ben\s+(?:l[''']an\s+)?\d{4}\b/.test(nq);
}

/** Règles à 2 groupes : [attribut, sujet] — le sujet devient l'entité cherchée. */
const QUESTION_ATTR_RULES: { qtype: QuestionType; re: RegExp; attrMap?: Record<string, string> }[] = [
  {
    qtype: "which",
    // « qui est le president de la rdc » — demande une valeur, pas une bio
    re: /^qui est (?:le|la|les|l['''])\s*(.+?)\s+(?:de|du|des|d['''])\s+(.+)$/,
  },
  {
    qtype: "which",
    // « qui sont les fondateurs de google »
    re: /^qui sont (?:les|des|le|la)\s+(.+?)\s+(?:de|du|des|d['''])\s+(.+)$/,
  },
  {
    qtype: "which",
    // « quel est le president de la rdc » / « quelle est la monnaie du japon »
    re: /^quel(?:le)?s?\s+(?:est|sont|etait|fut)\s+(?:le\s+|la\s+|les\s+|l['''])?(.+?)\s+(?:de|du|des|d['''])\s+(.+)$/,
  },
  {
    qtype: "which",
    // « qu'il est le president de la rdc »
    re: /^qu[''']il est (?:le|la|les|l['''])\s*(.+?)\s+(?:de|du|des|d['''])\s+(.+)$/,
  },
  {
    qtype: "which",
    // « quel age a poutine » / « quelle est la taille de messi »
    re: /^quel(?:le)?s?\s+(age|taille|poids|fortune|salaire)\s+a\s+(?:le\s+|la\s+|l['''])?(.+)$/,
  },
  {
    qtype: "which",
    // « de quelle nationalité/parti/religion est X »
    re: /^de quel(?:le)?s?\s+(\S+)\s+(?:est|etait|fut|sont)\s+(.+)$/,
  },
  {
    qtype: "which",
    // « pour qui joue mbappe » / « dans quelle équipe joue X »
    re: /^(?:pour|dans)\s+quel(?:le)?s?\s+(\S+)\s+(?:joue|evolue|travaille|milit(e|e))\w*\s+(.+)$/,
  },
  {
    qtype: "which",
    // « qui a fondé/créé/inventé/écrit X » → créateur/fondateur/auteur
    re: /^qui a\s+(fonde|cree|invente|ecrit|compose|realise|concu|lance)\w*\s+(.+)$/,
    attrMap: {
      fonde: "fondateur",
      cree: "createur",
      invente: "inventeur",
      ecrit: "auteur",
      compose: "compositeur",
      realise: "realisateur",
      concu: "createur",
      lance: "fondateur",
    },
  },
  {
    qtype: "which",
    // « comment s'appelle le president de la rdc »
    re: /^comment\s+(?:s[''']appelle|se nomme)\s+(?:le\s+|la\s+|les\s+|l['''])?(.+?)\s+(?:de|du|des|d['''])\s+(.+)$/,
  },
  {
    qtype: "howmany",
    // « combien d'habitants a/compte la rdc » → attr + sujet
    re: /^combien\s+(?:de\s+|d['''])(\w+)\s+(?:a|en|compte|possede|y a[- ]t[''']il(?: dans)?|mesure|pese|fait)\s+(?:le\s+|la\s+|les\s+|l[''']|du\s+|des\s+|d['''])?(.+)$/,
  },
  {
    qtype: "howmany",
    // « combien mesure/pèse/coûte X » — attribut implicite par le verbe
    re: /^combien\s+(mesure|pese|coute|vaut|dure|duree)\w*\s+(.+)$/,
    attrMap: {
      mesure: "taille",
      pese: "poids",
      coute: "prix",
      vaut: "fortune",
      dure: "duree",
      duree: "duree",
    },
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
  {
    qtype: "which",
    // « quel est l'ancien nom/appellation de kinshasa » → extraction « anciennement … »
    re: /^(?:quel(?:le)?s?\s+(?:est|etait|sont|fut)\s+)?(?:le\s+|la\s+|les\s+|l['''])?(ancien\w*\s*\w*|appellation)\s+(?:de|du|des|d['''])\s+(.+)$/,
  },
];

const QUESTION_RULES: { qtype: QuestionType; re: RegExp; attrFixed?: string }[] = [
  { qtype: "who", re: /^qui (?:est|etait|fut|sont|etaient|reste|devient)\s+(.+)$/ },
  { qtype: "who", re: /^who (?:is|was|are|were)\s+(.+)$/ },
  // « quelle est la capitale ougandaise », « quel est le roi belge » — sujet
  // composé résolu par splitRoleEntity (rôle + démonyme) plus bas.
  {
    qtype: "which",
    re: /^quel(?:le)?s?\s+(?:est|sont|etait|fut|a ete|reste|devient)\s+(?:le\s+|la\s+|les\s+|l[''']|du\s+|des\s+|d['''])?(.+)$/,
  },
  // Formes à groupe unique — attribut fixe, le groupe entier est le sujet.
  { qtype: "which", re: /^pour qui (?:joue|evolue|travaille|chante|milite)\w*\s+(.+)$/, attrFixed: "equipe" },
  { qtype: "which", re: /^qui a (?:gagne|remporte|recu)\w*\s+(.+)$/, attrFixed: "prix" },
  { qtype: "which", re: /^a qui appartient\s+(.+)$/, attrFixed: "proprietaire" },
  { qtype: "which", re: /^dans quel pays (?:se trouve|est|vit|joue)\w*\s+(.+)$/, attrFixed: "pays" },
  { qtype: "which", re: /^(?:quel est |quelle est )?le proprietaire (?:de|du|des|d['''])\s*(.+)$/, attrFixed: "proprietaire" },
  // « X est créé/fondé/inventé par qui » — forme inversée
  {
    qtype: "which",
    re: /^(.+?)\s+(?:est|etait|fut|a ete|ont ete)\s+(?:cree|creee|fonde|fondee|invente|inventee|lance|lancee|construit|construite|ecrit|ecrite)\w*\s+par\s+(?:qui|quelle entreprise|quel pays|quel)\w*\s*$/,
    attrFixed: "fondateur",
  },
  // « X fête son N-ième anniversaire/année » → date de fondation
  {
    qtype: "when",
    re: /^(.+?)\s+fete\s+\w+(?:\s+\w+)?\s+an\w*\s*$/,
    attrFixed: "fondation",
  },
  { qtype: "when", re: /^anniversaire (?:de|du|des|d['''])\s+(.+)$/, attrFixed: "fondation" },
  { qtype: "when", re: /^depuis quand\s+(?:existe|y a[- ]t[''']il)?\s*(.+)$/, attrFixed: "fondation" },
  {
    qtype: "what",
    re: /^(?:qu['']est[- ]ce que|qu['']est[- ]ce qu[''']|quest[- ]ce que|c['']est quoi|que signifie|qu['']appelle[- ]t[''']on|definition (?:de|du|des|d[''']))\s*(.+)$/,
  },
  { qtype: "what", re: /^what (?:is|are|was|does|do)\s+(.+)$/ },
  {
    qtype: "where",
    // « où est mort/né/situé X » — l'attr (lieu de mort/naissance) est déduit du verbe
    re: /^ou\s+(?:est|etait|fut|sont|se trouve(?:nt)?|se situe(?:nt)?|se localise|se trouve[- ]t[''']on)\s+(.+)$/,
  },
  { qtype: "where", re: /^where (?:is|are|was|did)\s+(.+)$/ },
  { qtype: "when", re: /^quand\s+(?:est|etait|a\s+ete|fut|sont|sera)\s+(.+)$/ },
  { qtype: "when", re: /^en quelle annee\s+(.+)$/ },
  { qtype: "when", re: /^when (?:did|was|is|were)\s+(.+)$/ },
  {
    qtype: "what",
    // « comment est mort X » / « de quoi est mort X » → cause de décès
    re: /^(?:comment|de quoi|pourquoi)\s+(?:est|etait|fut)\s+(.+)$/,
  },
  { qtype: "howmany", re: /^combien\s+(?:de\s+|d[''']|y a[- ]t[''']il\s+)?(.+)$/ },
];

/** Attribut déduit du verbe dans les questions « où est mort/né X ». */
function verbAttr(full: string): string | undefined {
  if (/\b(mort|morte|morts|mortes|decede|decedee|tue|tuee|assassine|assassinee|died|death|killed)\b/.test(full))
    return "lieu de mort";
  if (/\b(ne|nee|nes|nees|born|birth)\b/.test(full)) return "lieu de naissance";
  if (/\b(inhume|enterre|enterree|buried)\b/.test(full)) return "lieu de sepulture";
  return undefined;
}

/** « comment/de quoi est mort X » → cause ; les autres « comment » restent génériques. */
function whatAttr(full: string): string | undefined {
  if (/\b(mort|morte|decede|decedee|tue|tuee|assassine|assassinee|died|death)\b/.test(full))
    return "cause de mort";
  if (/\b(cree|creee|invente|inventee|apparu|apparue|commence|commencee)\b/.test(full)) return "origine";
  return undefined;
}

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
    // NB : l'attr n'est PAS passé par cleanSubject — les participes (« fondé »,
    // « mort ») SONT le sens de la question (« qui a fondé apple »).
    const attrRaw = stripLeadingDeter(m[1].trim().replace(/[?.!]+$/, ""));
    const attr = rule.attrMap ? rule.attrMap[attrRaw.split(" ")[0]] ?? attrRaw : attrRaw;
    const subj = cleanSubject(m[2]);
    if (!attr || subj.length < 2) continue;
    const canon = normalizeCountry(subj);
    return {
      kind: "question",
      qtype: rule.qtype,
      subject: canon,
      // Le wikiQuery cible le SUJET — l'attribut ne doit pas polluer la
      // résolution d'article (« femme poutine » résolvait une chanson
      // satirique au lieu de Vladimir Poutine).
      wikiQuery: canon,
      attr,
      past: isPastQuery(nq) || undefined,
    };
  }

  for (const rule of QUESTION_RULES) {
    const m = nq.match(rule.re);
    if (!m) continue;
    const subject = cleanSubject(m[1]);
    if (subject.length < 2) continue;
    const canon = normalizeCountry(subject);
    const attr =
      rule.attrFixed ??
      (rule.qtype === "when"
        ? whenAttr(m[1], nq)
        : rule.qtype === "where"
          ? verbAttr(nq)
          : rule.qtype === "what"
            ? whatAttr(nq)
            : undefined);
    // Sujet composé « rôle + entité » (« qui fut le premier ministre
    // ougandais ») : le sujet entier n'est PAS une entité — on extrait
    // l'attribut et l'entité. Uniquement quand la question n'a pas déjà
    // un attribut verbal (« où est né le président ougandais » vise la
    // personne, pas le pays).
    if (!attr && (rule.qtype === "who" || rule.qtype === "which" || rule.qtype === "what")) {
      const split = splitRoleEntity(subject);
      if (split) {
        return {
          kind: "question",
          qtype: "which",
          subject: split.entity,
          wikiQuery: `${split.attr} ${split.entity}`,
          attr: split.attr,
          past: isPastQuery(nq) || undefined,
        };
      }
    }
    return {
      kind: "question",
      qtype: rule.qtype,
      subject: canon,
      wikiQuery: canon,
      attr,
      past: isPastQuery(nq) || undefined,
    };
  }

  // Marqueur interrogatif N'IMPORTE OÙ dans la phrase — la position du mot et
  // la ponctuation ne définissent pas une question :
  //   « messi a combien de buts en carrière » → sujet « messi », attr « buts »
  //   « la forêt amazone est dans quel pays » → sujet « forêt amazone », attr « pays »
  //   « le pape actuel c'est qui »            → sujet « pape »
  // Garde-fou : le marqueur doit toucher un mot-outil (« a », « est », « dans »)
  // ou la requête finir par « ? » — sinon « thé ou café » deviendrait une question.
  const generic = parseLooseQuestion(nq, raw);
  if (generic) return generic;

  return null;
}

/** Mots-outils sans valeur d'entité — délimiteurs entre sujet et attribut. */
const GLUE_WORDS = new Set([
  "a", "ai", "as", "ont", "avez", "avons", "est", "sont", "etait", "etaient",
  "fut", "furent", "sera", "serait", "soit", "se", "s", "c", "ce", "ca",
  "cela", "celui", "celle", "ceux", "celles", "dans", "de", "du", "des", "d",
  "en", "au", "aux", "par", "pour", "sur", "sous", "chez", "avec", "sans",
  "vers", "y", "le", "la", "les", "l", "un", "une", "et", "ou", "mais", "ni",
  "car", "donc", "alors", "que", "qui", "quoi", "dont", "il", "elle", "ils",
  "elles", "on", "nous", "vous", "je", "j", "tu", "t", "m", "me", "te",
  "lui", "leur", "son", "sa", "ses", "mon", "ma", "mes", "ton", "ta", "tes",
  "the", "an", "of", "in", "on", "at", "to", "for", "is", "are", "was",
  "were", "do", "does", "did", "be", "been", "it", "its",
]);

/** Verbes de liaison courants pouvant précéder le marqueur interrogatif. */
const VERB_WORDS = new Set([
  "trouve", "trouves", "trouvent", "situe", "situee", "situes", "situees",
  "situent", "localise", "localisee", "vit", "vis", "vivent", "habite",
  "habites", "habitent", "reside", "resides", "resident", "joue", "joues",
  "jouent", "evolue", "evolues", "travaille", "travailles", "travaillent",
  "fete", "fetes", "mesure", "mesures", "mesurent", "pese", "peses", "pesent",
  "coute", "coutes", "coutent", "vaut", "vaux", "fait", "font", "compte",
  "comptes", "comptent", "possede", "possedes", "possedent", "appartient",
  "appartiennent", "devient", "deviennent", "reste", "restent", "pense",
  "penses", "pensent", "dit", "dits", "disent", "vient", "viennent",
  "appelle", "appelles", "nomme", "nommes", "nomment", "concerne", "regarde",
  "parle", "parles", "parlent", "interesse", "interesses",
]);

/** Retire les mots-outils/verbes en TÊTE ou en QUEUE d'un fragment. */
function stripGlue(s: string, edge: "head" | "tail"): string {
  const tokens = s.split(/\s+/).filter(Boolean);
  if (edge === "head") {
    while (tokens.length && (GLUE_WORDS.has(tokens[0]) || VERB_WORDS.has(tokens[0]))) tokens.shift();
  } else {
    while (tokens.length && (GLUE_WORDS.has(tokens[tokens.length - 1]) || VERB_WORDS.has(tokens[tokens.length - 1]))) tokens.pop();
  }
  return tokens.join(" ");
}

/** Marqueur interrogatif → type de question. */
const LOOSE_MARKERS: [RegExp, QuestionType][] = [
  [/\bcombien\b/, "howmany"],
  [/\bquand\b/, "when"],
  [/\bou\b/, "where"],
  [/\bqui\b/, "who"],
  [/\bquelles?\b|\bquels?\b|\blequel\b|\blaquelle\b|\blesquelles\b|\blesquels\b/, "which"],
  [/\bcomment\b|\bpourquoi\b|\bquoi\b/, "what"],
  [/\bwho\b|\bwhom\b/, "who"],
  [/\bwhere\b/, "where"],
  [/\bwhen\b/, "when"],
  [/\bwhich\b/, "which"],
  [/\bhow many\b|\bhow much\b/, "howmany"],
  [/\bhow\b|\bwhy\b|\bwhat\b/, "what"],
];

/**
 * Question « lâche » : le marqueur peut être n'importe où dans la phrase.
 * Structure reconnue : [SUJET] …verbe/outil… [MARQUEUR] …outil… [ATTRIBUT].
 * Exige un ancrage (mot-outil adjacent ou « ? » final) pour ne pas détourner
 * les requêtes déclaratives contenant un mot comme « ou » (thé ou café).
 */
function parseLooseQuestion(nq: string, raw: string): SearchIntent | null {
  const hasQMark = /\?\s*$/.test(raw.trim());
  for (const [re, qtype] of LOOSE_MARKERS) {
    const mm = nq.match(new RegExp(`${re.source}`.replace(/^\^/, ""), "i"));
    if (!mm || mm.index == null) continue;
    const idx = mm.index;
    const marker = mm[0];
    const before = nq.slice(0, idx).trim();
    const after = nq.slice(idx + marker.length).trim();
    if (idx === 0) continue; // en tête, les règles structurées ont déjà eu leur chance

    const prevWord = before.split(/\s+/).pop() ?? "";
    const nextWord = after.split(/\s+/)[0] ?? "";
    // Le marqueur exige un sujet significatif AVANT lui — « thé ou café »
    // n'a que « the » (mot-outil anglais) avant « ou » : pas une question.
    const subjectBefore = stripGlue(before, "tail");
    const anchored =
      subjectBefore.length >= 2 &&
      (GLUE_WORDS.has(prevWord) ||
        VERB_WORDS.has(prevWord) ||
        GLUE_WORDS.has(nextWord) ||
        VERB_WORDS.has(nextWord) ||
        // « ou » est trop ambigu (« X ou Y ? » = comparaison, pas « où ») —
        // seuls les autres marqueurs s'ancrent au « ? » seul.
        (hasQMark && marker !== "ou"));
    if (!anchored) continue;

    let subject = subjectBefore;
    // Attribut = mots significatifs en tête seulement — « de buts en
    // carrière » → « buts » ; « en » coupe la suite qui n'est pas la propriété.
    const attrTokens = stripGlue(after, "head").split(/\s+/).filter(Boolean);
    const headTokens: string[] = [];
    for (const tok of attrTokens) {
      if (GLUE_WORDS.has(tok) || VERB_WORDS.has(tok)) break;
      headTokens.push(tok);
    }
    let attr = headTokens.join(" ");

    // « c'est qui/quoi » en fin → attribut vide, sujet conservé.
    if (/^(qui|quoi|lequel|laquelle)\b/.test(marker) && !attr) attr = "";

    if (subject.length < 2) {
      if (after.length < 2) continue;
      subject = stripGlue(after, "head");
      attr = "";
    }
    if (subject.length < 2) continue;
    // L'attribut « lâche » ne dépasse pas quelques mots — sinon il contient le
    // reste de la phrase et n'est pas une propriété demandée.
    if (attr.split(/\s+/).length > 5) attr = attr.split(/\s+/).slice(0, 5).join(" ");

    const canon = normalizeCountry(cleanSubject(subject));
    if (canon.length < 2) continue;
    const attrFinal =
      attr ||
      (qtype === "where" ? verbAttr(nq) : qtype === "what" ? whatAttr(nq) : qtype === "when" ? whenAttr(subject, nq) : undefined);
    if (!attrFinal && (qtype === "who" || qtype === "which" || qtype === "what")) {
      const split = splitRoleEntity(canon);
      if (split) {
        return {
          kind: "question",
          qtype: "which",
          subject: split.entity,
          wikiQuery: `${split.attr} ${split.entity}`,
          attr: split.attr,
          past: isPastQuery(nq) || undefined,
        };
      }
    }
    return {
      kind: "question",
      qtype,
      subject: canon,
      wikiQuery: canon,
      attr: attrFinal,
      past: isPastQuery(nq) || undefined,
    };
  }
  return null;
}

/**
 * Mathématiques — toute requête mathématiquement structurée, pas seulement
 * celles finissant par « ? » : « 1+1 », « x = 2+3x », « 2x+4=10 »,
 * « combien font 6 et 7 », « racine de 144 », « 20% de 150 », « 3 au carré ».
 * Retourne l'expression (ou l'équation du 1er degré) à évaluer — jamais un
 * texte à chercher sur le web.
 */
function parseMathIntent(raw: string): { kind: "math"; expr: string; display: string } | null {
  const trimmed = raw.trim().replace(/[?!.\s]+$/, "");
  if (!trimmed || trimmed.length > 60) return null;
  let t = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/,/g, ".")
    .replace(/\s+/g, " ");

  // Formes verbales françaises → expression.
  t = t.replace(/^combien\s+(?:font|fait|vaut|donne|egalent?)\s+/, "");
  const pct = t.match(/^([\d.]+)\s*(?:%|pour\s*cents?)\s*de\s*([\d.]+)$/);
  if (pct) t = `(${pct[1]}*${pct[2]}/100)`;
  const root = t.match(/^racine(?:\s+carree?)?\s+(?:de\s+|d[''']\s*)?\(?([\d.]+)\)?$/);
  if (root) t = `(${root[1]}^0.5)`;
  const cubic = t.match(/^racine\s+cubique\s+(?:de\s+|d[''']\s*)?\(?([\d.]+)\)?$/);
  if (cubic) t = `(${cubic[1]}^(1/3))`;
  t = t
    .replace(/\bau\s+carre\b/g, "^2")
    .replace(/\bau\s+cube\b/g, "^3")
    .replace(/\bpuissance\b/g, "^")
    .replace(/\bfois\b|\bmultiplie\s+par\b|\bx(?=\s*\d)/g, "*")
    .replace(/\bplus\b/g, "+")
    .replace(/\bmoins\b/g, "-")
    .replace(/\bdivise\s+par\b|\bsur\b/g, "/")
    .replace(/\bet\b/g, "+")
    .replace(/\bsqrt\s*\(?\s*([\d.]+)\s*\)?/g, "($1^0.5)")
    .trim();

  // Équation : exactement un « = ». « x = 2+3x », « 2x+4 = 10 » → résolution
  // du 1er degré ; « 2+3 = » → le « = » terminal est décoratif, on évalue la
  // partie gauche ; plusieurs « = » ou variable absente → pas un calcul.
  const eq = t.match(/^([^=]+)=\s*([^=]*)$/);
  if (eq) {
    const [left, right] = [eq[1].trim(), eq[2].trim()];
    if (!right) {
      t = left; // « 2+3 = » → évalue « 2+3 »
    } else {
      const vars = new Set((left + right).match(/[a-z]/g) ?? []);
      if (vars.size === 1) {
        const v = [...vars][0];
        const sides = [left, right].map((s) =>
          s.replace(new RegExp(`(\\d)${v}`, "g"), `$1*${v}`),
        );
        if (sides.every((s) => /^[\d\s+\-*/().^%a-z]+$/.test(s))) {
          return { kind: "math", expr: `${sides[0]}=${sides[1]}`, display: trimmed };
        }
      }
      return null;
    }
  }

  // Expression arithmétique pure (avec ou sans « ? »/« = » final).
  if (
    /^[\d\s+\-*/().^%*]+$/.test(t) &&
    /[\d]/.test(t) &&
    /[+\-*/^*]/.test(t) &&
    /\d\s*[+\-*/^*]\s*[\d(]/.test(t) // exige une vraie opération entre nombres
  ) {
    return { kind: "math", expr: t, display: trimmed };
  }
  return null;
}

export function parseSearchIntent(query: string): SearchIntent {
  const raw = query.trim();
  if (!raw) return { kind: "general" };

  const math = parseMathIntent(raw);
  if (math) return math;

  const capital = parseCapitalIntent(raw);
  // Capitale « connue » → réponse instantanée hors-ligne. Sinon on laisse
  // le pipeline de questions résoudre via Wikidata (P36) — sinon des pays
  // absents de la table (« capitale ougandaise ») échouaient silencieusement.
  if (capital && KNOWN_CAPITALS[normKey(capital.subject)]) {
    return { kind: "capital", ...capital };
  }

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
