import { meaningfulTokens, normalizeQueryText, tokenMatchesInHay } from "./search-relevance";
import type { FeaturedSnippet, InstantAnswer, KnowledgePanel } from "./types";
import type { QuestionType } from "./query-intent";
import {
  batchClaimValues,
  claimEntityIds,
  claimValue,
  claimValues,
  entityImage,
  entityUrl,
  getClaims,
  getClaimsFor,
  searchEntity,
  searchPositionEntity,
} from "./wikidata";

/**
 * Réponse factuelle à une question — extraction réelle depuis Wikipédia.
 * Chaîne : opensearch (résout translittérations « putin »→« Poutine »,
 * sigles « bcdc »→« Banque commerciale du Congo ») → REST summary → extrait.
 * Aucune donnée inventée : la réponse est le texte réel de l'article trouvé.
 */

export type WikiAnswer = {
  title: string;
  extract: string;
  url: string;
  description?: string;
  image?: string;
  lang: string;
};

const UA = { "User-Agent": "Ayeba/1.0 (https://ayeba.app; search answers)" };
const FETCH_MS = 2200;

type WikiSummary = {
  title?: string;
  extract?: string;
  description?: string;
  type?: string;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source?: string };
};

/** Vrai si l'extrait parle bien du sujet demandé — évite les homonymies. */
function extractMatchesSubject(extract: string, title: string, subject: string): boolean {
  const tokens = meaningfulTokens(subject);
  if (!tokens.length) return true;
  const hay = normalizeQueryText(`${title} ${extract.slice(0, 400)}`);
  let matched = 0;
  for (const t of tokens) {
    if (tokenMatchesInHay(t, hay)) matched++;
  }
  // Un sujet multi-mots doit être recouvert à moitié au moins ; un seul mot doit matcher.
  return tokens.length === 1 ? matched >= 1 : matched >= Math.ceil(tokens.length / 2);
}

export async function fetchWikiAnswer(
  subject: string,
  langHint?: string,
): Promise<WikiAnswer | undefined> {
  const langs = [
    langHint && /^[a-z]{2,3}$/i.test(langHint) ? langHint.toLowerCase() : undefined,
    "fr",
    "en",
  ].filter((l, i, a): l is string => Boolean(l) && a.indexOf(l) === i);
  for (const lang of langs) {
    try {
      const open = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(subject)}&limit=4&namespace=0&format=json&origin=*`,
        { signal: AbortSignal.timeout(FETCH_MS), headers: UA, next: { revalidate: 600 } },
      );
      if (!open.ok) continue;
      const data = (await open.json()) as [string, string[], string[], string[]];
      const titles = data[1] ?? [];

      for (const title of titles.slice(0, 2)) {
        try {
          const res = await fetch(
            `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
            { signal: AbortSignal.timeout(FETCH_MS), headers: UA, next: { revalidate: 600 } },
          );
          if (!res.ok) continue;
          const s = (await res.json()) as WikiSummary;
          if (!s.extract || s.extract.length < 60 || s.type === "disambiguation") continue;
          if (!extractMatchesSubject(s.extract, s.title ?? title, subject)) continue;
          return {
            title: s.title ?? title,
            extract: s.extract,
            url:
              s.content_urls?.desktop?.page ??
              `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
            description: s.description,
            image: s.thumbnail?.source,
            lang,
          };
        } catch {
          /* titre suivant */
        }
      }
    } catch {
      /* langue suivante */
    }
  }
  return undefined;
}

/** Corps complet d'un article — `prop=extracts` SANS exintro : le résumé
 *  REST ne rend que le chapeau ; la réponse (« langue parlée au Sankuru »)
 *  est souvent dans le corps. C'est l'équivalent du featured snippet. */
async function fetchWikiBody(title: string, lang: string): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext&exlimit=1&titles=${encodeURIComponent(title)}&format=json&origin=*`,
      { signal: AbortSignal.timeout(FETCH_MS), headers: UA, next: { revalidate: 3600 } },
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      query?: { pages?: Record<string, { extract?: string }> };
    };
    const page = Object.values(data.query?.pages ?? {})[0];
    const text = page?.extract;
    return text && text.length > 60 ? text : undefined;
  } catch {
    return undefined;
  }
}

/** Termes du domaine par clé canonique — la phrase cherchée cite l'attribut
 *  (« langue parlée », « monnaie »), peu importe la langue de la question. */
const BODY_ATTR_TERMS: Record<string, string[]> = {
  spoken_language: ["langue", "language", "parl", "spoken", "dialecte", "dialect"],
  official_language: ["langue", "language", "offici", "official"],
  currency: ["monnaie", "currency", "franc", "dollar", "euro"],
  religion: ["religion", "culte", "chrétien", "musulman", "christian", "muslim", "catholic"],
  population: ["population", "habitants", "inhabitants", "démographie", "demography"],
  demonym: ["gentilé", "demonym", "habitants", "appelés", "called"],
};

/** Phrases réelles du corps d'article citant l'attribut demandé — score =
 *  nombre de termes du domaine présents, ordre d'apparition conservé. */
function bodySentencesForAttr(
  body: string,
  intent: { attr?: string; attrEn?: string; attrKey?: string },
): string[] {
  const terms = new Set<string>(BODY_ATTR_TERMS[intent.attrKey ?? ""] ?? []);
  for (const raw of [intent.attr, intent.attrEn]) {
    if (!raw) continue;
    for (const w of raw.toLowerCase().split(/[^\p{L}]+/u)) {
      if (w.length >= 4 && !/^(avec|dans|pour|quel|quelle|est|sont|the|this|that|what|which)$/.test(w)) {
        terms.add(w);
      }
    }
  }
  if (!terms.size) return [];
  const sentences = body.split(/(?<=[.!?])\s+/).filter((s) => s.length >= 25 && s.length <= 400);
  const scored = sentences
    .map((s, i) => {
      const low = s.toLowerCase();
      let score = 0;
      for (const t of terms) if (low.includes(t)) score++;
      return { s, score, i };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i);
  if (!scored.length || scored[0].score < 2) return [];
  // Meilleure phrase + éventuellement sa suivante si elle complète.
  const best = scored[0];
  const out = [best.s.trim()];
  const next = scored.find((x) => x.i === best.i + 1 && x.score > 0);
  if (next && out.join(" ").length < 380) out.push(next.s.trim());
  return out;
}

/** Premières phrases d'un extrait — la réponse directe affichée en carte. */
export function firstSentences(text: string, max = 2, cap = 420): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const parts = clean.match(/[^.!?]+[.!?]+/g) ?? [clean];
  let out = "";
  for (const p of parts.slice(0, max)) {
    if (out.length + p.length > cap) break;
    out += p;
  }
  if (!out) out = clean.slice(0, cap);
  return out.trim();
}

const QTYPE_LABEL: Record<QuestionType, string> = {
  who: "Identité",
  where: "Localisation",
  what: "Réponse",
  when: "Réponse",
  which: "Réponse",
  howmany: "Chiffre",
};

export function wikiAnswerToInstant(answer: WikiAnswer, qtype: QuestionType): InstantAnswer {
  return {
    kind: "answer",
    title: answer.title,
    lines: [{ label: QTYPE_LABEL[qtype], value: firstSentences(answer.extract, 2) }],
    footnote: `Source : Wikipédia ${answer.lang.toUpperCase()} — extrait réel · ${answer.url}`,
  };
}

export function wikiAnswerToPanel(answer: WikiAnswer): KnowledgePanel {
  return {
    title: answer.title,
    subtitle: answer.description ?? `Wikipédia (${answer.lang})`,
    summary: answer.extract,
    facts: [
      { label: "Source", value: `Wikipédia ${answer.lang.toUpperCase()}` },
      { label: "Type", value: "Encyclopédie" },
      { label: "Lien", value: answer.url },
    ],
    sources: [`${answer.lang}.wikipedia.org`],
    image: answer.image,
  };
}

/* ---------- Réponses structurées — Knowledge Graph (Wikidata) ---------- */

type QuestionIntentLike = {
  qtype: QuestionType;
  subject: string;
  wikiQuery: string;
  attr?: string;
  /** Clé canonique émise par la compréhension LLM — la voie principale,
   *  indépendante de la langue. */
  attrKey?: string;
  /** Type d'entité attendu (country/city/person/…) — borne la
   *  désambiguïsation Wikidata. */
  entityType?: string;
  /** Traductions anglaises émises par le modèle — pour chercher les fonctions
   *  Wikidata libellées en anglais (« Minister of Foreign Affairs of Russia »). */
  attrEn?: string;
  entityEn?: string;
  /** Langue détectée de la requête (« ru », « sw »…) — résolution Wikidata
   *  et Wikipedia dans la langue native en dernier repli. */
  lang?: string;
  past?: boolean;
};

/** Attribut demandé → propriété(s) Wikidata. Couverture large FR/EN.
 *  Ordre significatif : les expressions composées (« lieu de mort ») avant les
 *  mots simples (« mort ») qui leur sont inclus. */
type AttrSpec = {
  props: string[];
  label: string;
  age?: boolean;
  fallback?: { props: string[]; label: string };
  /** Deuxième saut dans le graphe : « première dame » = conjoint (P26)
   *  du titulaire de la fonction (P35 du pays). */
  hop?: { props: string[]; label: string };
  /** Libellé par propriété — P35 = « Président » mais P6 = « Premier
   *  ministre » ; une valeur P6 ne doit pas être affichée « Président ». */
  propLabels?: Record<string, string>;
  /** La réponse = le NOMBRE de valeurs (« combien de provinces » → P150
   *  comptées) + échantillon de noms réels. */
  count?: boolean;
};

const ATTR_PROPS: (AttrSpec & { re: RegExp })[] = [
  // — composés d'abord —
  { re: /lieu de naissance|birthplace|ou est ne|born in/i, props: ["P19"], label: "Lieu de naissance" },
  { re: /lieu de (mort|deces)|death place|ou est mort/i, props: ["P20"], label: "Lieu de décès" },
  { re: /cause de (mort|deces)|comment est mort|de quoi est mort|cause of death/i, props: ["P509"], label: "Cause du décès" },
  { re: /lieu de sepulture|inhume|enterre|buried|resting place|tombe/i, props: ["P119"], label: "Sépulture" },
  { re: /premiers?[- ]?ministres?|prime ministers?|chefs? du gouvernement|heads? of government/i, props: ["P6"], label: "Premier ministre" },
  { re: /date de naissance|quand est ne|date of birth/i, props: ["P569"], label: "Naissance" },
  { re: /date de (mort|deces)|quand est mort|date of death/i, props: ["P570"], label: "Décès" },
  { re: /langue officielle|official language/i, props: ["P37"], label: "Langue officielle" },
  { re: /langues? parlees?|parle quelle langue|languages spoken/i, props: ["P1412", "P37"], label: "Langue(s)" },
  // — dirigeants & organisation —
  {
    re: /president|chef d[''']?etat|chef de l[''']?etat|head of state|dirigeant|dirigeante|leader/i,
    props: ["P35", "P6"],
    label: "Président",
    propLabels: { P35: "Président", P6: "Premier ministre" },
  },
  { re: /roi|reine|monarque|king|queen|empereur|imperatrice|souverain|souveraine|tsar|sultan|chah|emir|khan|pape|pontife|pope/i, props: ["P35"], label: "Chef de l'État" },
  {
    // « première dame de X » = conjoint(e) du chef d'État — 2 sauts.
    re: /premieres? dames?|first lad(?:y|ies)|epouse du president|epoux de la presidente/i,
    props: ["P35"],
    label: "Première dame",
    hop: { props: ["P26"], label: "Première dame" },
  },
  { re: /maire|mayor|bourgmestre/i, props: ["P6"], label: "Maire" },
  { re: /fondateur|fondatrice|founder|cofondateur|fonde/i, props: ["P112"], label: "Fondateur" },
  { re: /pdg|ceo|directeur general|directrice|chief executive|patron/i, props: ["P169"], label: "Direction" },
  { re: /siege|headquarter|siege social/i, props: ["P159"], label: "Siège" },
  { re: /createur|creatrice|inventeur|invente|concu|creator|inventor|designed/i, props: ["P170", "P61", "P287"], label: "Créateur" },
  { re: /auteur|ecrit|writer|author|ecrivain/i, props: ["P50"], label: "Auteur" },
  { re: /compositeur|compose|composer/i, props: ["P86"], label: "Compositeur" },
  { re: /realisateur|realise|director|filme/i, props: ["P57"], label: "Réalisateur" },
  { re: /interprete|chante|chanteur|performer|sung/i, props: ["P175"], label: "Interprète" },
  { re: /proprietaire|appartient a|owner|owned by/i, props: ["P127"], label: "Propriétaire" },
  { re: /maison mere|filiale|parent company|subsidiary/i, props: ["P749", "P355"], label: "Groupe" },
  // — géographie & pays —
  { re: /capitale|capital/i, props: ["P36"], label: "Capitale" },
  { re: /monnaie|devise|currency/i, props: ["P38"], label: "Monnaie" },
  { re: /langue/i, props: ["P37"], label: "Langue officielle" },
  { re: /habitants?|population|demographie/i, props: ["P1082"], label: "Population" },
  { re: /superficie|surface|area|km2|km²/i, props: ["P2046"], label: "Superficie" },
  { re: /densite/i, props: ["P2225"], label: "Densité" },
  { re: /pays|country|nation/i, props: ["P17"], label: "Pays" },
  { re: /continent/i, props: ["P30"], label: "Continent" },
  { re: /hymne|anthem/i, props: ["P85"], label: "Hymne" },
  { re: /drapeau|flag/i, props: ["P41"], label: "Drapeau" },
  { re: /altitude|hauteur|elevation/i, props: ["P2044"], label: "Altitude" },
  { re: /fleuve|river|riviere|traverse/i, props: ["P206"], label: "Fleuve / cours d'eau" },
  { re: /embouchure|mouth/i, props: ["P403"], label: "Embouchure" },
  { re: /aeroport|airport|iata/i, props: ["P239", "P238"], label: "Aéroport (ICAO/IATA)" },
  { re: /indicatif|code telephonique|calling code|prefixe/i, props: ["P474"], label: "Indicatif" },
  { re: /fuseau|timezone|time zone/i, props: ["P421"], label: "Fuseau horaire" },
  { re: /gentile|demonym/i, props: ["P1549"], label: "Gentilé" },
  { re: /code iso|iso|code pays/i, props: ["P297"], label: "Code ISO" },
  { re: /tld|domaine internet|extension/i, props: ["P78"], label: "Domaine national" },
  { re: /code postal|postal code|zip/i, props: ["P281"], label: "Code postal" },
  // — personnes —
  { re: /epouse|epoux|\bmari\b|\bfemme\b|conjoint|spouse|wife|husband/i, props: ["P26"], label: "Conjoint" },
  { re: /\bmere\b|mother/i, props: ["P25"], label: "Mère" },
  { re: /\bpere\b|father/i, props: ["P22"], label: "Père" },
  { re: /frere|soeur|sibling|brother|sister/i, props: ["P3373"], label: "Frère(s)/sœur(s)" },
  { re: /enfants?|children|child|fils|fille/i, props: ["P40"], label: "Enfant(s)" },
  { re: /nationalite|citoyennete|citizenship|passeport/i, props: ["P27"], label: "Nationalité" },
  { re: /taille|height|grandeur|mesure/i, props: ["P2048"], label: "Taille" },
  { re: /poids|pese|weight/i, props: ["P2067"], label: "Poids" },
  { re: /religion|croyance/i, props: ["P140"], label: "Religion" },
  { re: /parti|party|politique/i, props: ["P102"], label: "Parti politique" },
  { re: /equipe|club|selection|joue|evolue|team/i, props: ["P54"], label: "Équipe" },
  { re: /prix|award|distinction|recompense|ballon d[''']or|nobel/i, props: ["P166"], label: "Distinctions" },
  { re: /etudes?|education|universite|diplome|scolarite/i, props: ["P69"], label: "Études" },
  { re: /occupation|metier|profession|travail/i, props: ["P106"], label: "Occupation" },
  { re: /fonction|poste|mandat|office|position held/i, props: ["P39"], label: "Fonction" },
  { re: /fortune|richesse|salaire|net worth|vaut/i, props: ["P2218"], label: "Fortune estimée" },
  { re: /oeuvre|travaux|notable work|connu pour/i, props: ["P800"], label: "Œuvre notable" },
  { re: /age\b|quel age/i, props: ["P569"], label: "Âge", age: true },
  // — dates & divers —
  { re: /naissance|\bne\b|\bnee\b|birth/i, props: ["P569"], label: "Naissance" },
  { re: /mort|deces|death|died/i, props: ["P570"], label: "Décès" },
  { re: /fondation|cree|creation|founded|established|lancement|anniversaire/i, props: ["P571"], fallback: { props: ["P1249"], label: "Première mention" }, label: "Fondation" },
  { re: /dissolution|fermeture|disparition/i, props: ["P576"], label: "Dissolution" },
  { re: /site (officiel|web)|website|official site|url/i, props: ["P856"], label: "Site officiel" },
  { re: /duree|dure|duration|long/i, props: ["P2047"], label: "Durée" },
  { re: /effectif|membres|employes|employees|staff/i, props: ["P1128", "P1083"], label: "Effectif" },
  // « combien de provinces/régions » → P150 comptées (vrai dénombrement
  // Wikidata, pas une liste déguisée en chiffre).
  {
    re: /provinces?|régions?|regions?|états? fédérés?|etats? federes?|subdivisions?|circonscriptions?|comtés?|comtes?|préfectures?|prefectures?|oblasts?|wilayas?|cantons?|départements?|departements?|districts?|chefs-lieux/i,
    props: ["P150"],
    label: "Subdivisions",
    count: true,
  },
  { re: /ville|commune|quartier|province|etat|region|departement|district|localite|arrondissement/i, props: ["P159", "P131", "P276", "P17"], label: "Localisation" },
];

/** Lookup par CLÉ CANONIQUE — émise par la compréhension LLM, identique dans
 *  toutes les langues. La table regex ATTR_PROPS n'est plus que le filet de
 *  secours quand le modèle est absent (pas de clé / timeout). */
const PROP_BY_KEY: Record<string, AttrSpec> = {
  // — territoire —
  capital: { props: ["P36"], label: "Capitale" },
  currency: { props: ["P38"], label: "Monnaie" },
  official_language: { props: ["P37"], label: "Langue officielle" },
  spoken_language: { props: ["P1412", "P37"], label: "Langue(s)" },
  population: { props: ["P1082"], label: "Population" },
  area: { props: ["P2046"], label: "Superficie" },
  density: { props: ["P2225"], label: "Densité" },
  country: { props: ["P17"], label: "Pays" },
  continent: { props: ["P30"], label: "Continent" },
  anthem: { props: ["P85"], label: "Hymne" },
  flag: { props: ["P41"], label: "Drapeau" },
  elevation: { props: ["P2044"], label: "Altitude" },
  river: { props: ["P206"], label: "Fleuve / cours d'eau" },
  river_mouth: { props: ["P403"], label: "Embouchure" },
  airport: { props: ["P239", "P238"], label: "Aéroport (ICAO/IATA)" },
  calling_code: { props: ["P474"], label: "Indicatif" },
  timezone: { props: ["P421"], label: "Fuseau horaire" },
  demonym: { props: ["P1549"], label: "Gentilé" },
  iso_code: { props: ["P297"], label: "Code ISO" },
  tld: { props: ["P78"], label: "Domaine national" },
  postal_code: { props: ["P281"], label: "Code postal" },
  subdivisions_count: { props: ["P150"], label: "Subdivisions", count: true },
  location: { props: ["P159", "P131", "P276", "P17"], label: "Localisation" },
  // — gouvernance —
  head_of_state: {
    props: ["P35", "P6"],
    label: "Président",
    propLabels: { P35: "Président", P6: "Premier ministre" },
  },
  head_of_government: { props: ["P6"], label: "Premier ministre" },
  monarch: { props: ["P35"], label: "Chef de l'État" },
  first_lady: {
    props: ["P35"],
    label: "Première dame",
    hop: { props: ["P26"], label: "Première dame" },
  },
  mayor: { props: ["P6"], label: "Maire" },
  governor: { props: ["P6"], label: "Gouverneur" },
  /** « ministre de X » : pas de propriété directe sur le pays — la fonction
   *  est une entité, le titulaire est sa revendication P1308 (saut dédié). */
  officeholder: { props: [], label: "Titulaire" },
  // — organisation / œuvre —
  founder: { props: ["P112"], label: "Fondateur" },
  ceo: { props: ["P169"], label: "Direction" },
  headquarters: { props: ["P159"], label: "Siège" },
  creator: { props: ["P170", "P61", "P287"], label: "Créateur" },
  author: { props: ["P50"], label: "Auteur" },
  composer: { props: ["P86"], label: "Compositeur" },
  director: { props: ["P57"], label: "Réalisateur" },
  performer: { props: ["P175"], label: "Interprète" },
  owner: { props: ["P127"], label: "Propriétaire" },
  parent_org: { props: ["P749", "P355"], label: "Groupe" },
  employees: { props: ["P1128", "P1083"], label: "Effectif" },
  website: { props: ["P856"], label: "Site officiel" },
  inception: {
    props: ["P571"],
    fallback: { props: ["P1249"], label: "Première mention" },
    label: "Fondation",
  },
  dissolution: { props: ["P576"], label: "Dissolution" },
  duration: { props: ["P2047"], label: "Durée" },
  // — personne —
  birth_date: { props: ["P569"], label: "Naissance" },
  death_date: { props: ["P570"], label: "Décès" },
  age: { props: ["P569"], label: "Âge", age: true },
  spouse: { props: ["P26"], label: "Conjoint" },
  mother: { props: ["P25"], label: "Mère" },
  father: { props: ["P22"], label: "Père" },
  siblings: { props: ["P3373"], label: "Frère(s)/sœur(s)" },
  children: { props: ["P40"], label: "Enfant(s)" },
  nationality: { props: ["P27"], label: "Nationalité" },
  height: { props: ["P2048"], label: "Taille" },
  weight: { props: ["P2067"], label: "Poids" },
  religion: { props: ["P140"], label: "Religion" },
  party: { props: ["P102"], label: "Parti politique" },
  team: { props: ["P54"], label: "Équipe" },
  awards: { props: ["P166"], label: "Distinctions" },
  education: { props: ["P69"], label: "Études" },
  occupation: { props: ["P106"], label: "Occupation" },
  position_held: { props: ["P39"], label: "Fonction" },
  net_worth: { props: ["P2218"], label: "Fortune estimée" },
  notable_work: { props: ["P800"], label: "Œuvre notable" },
};

/** Fiche courte pour les questions sans attribut mappé. */
const FICHE: { label: string; props: string[] }[] = [
  { label: "Naissance", props: ["P569"] },
  { label: "Décès", props: ["P570"] },
  { label: "Fondation", props: ["P571"] },
  { label: "Nationalité", props: ["P27"] },
  { label: "Occupation", props: ["P106"] },
  { label: "Pays", props: ["P17"] },
  { label: "Capitale", props: ["P36"] },
  { label: "Dirigeant", props: ["P35", "P6"] },
  { label: "Population", props: ["P1082"] },
  { label: "Superficie", props: ["P2046"] },
  { label: "Localisation", props: ["P131", "P276"] },
  { label: "Siège", props: ["P159"] },
  { label: "Fondateur", props: ["P112"] },
  { label: "Site officiel", props: ["P856"] },
];

/** Faits du panneau de connaissance — équivalent du Knowledge Panel Google :
 *  « Né », « Décédé », « Conjoint », « Enfants », « Fonction », « Parti »… */
const PANEL_FACTS: { label: string; props: string[]; max?: number }[] = [
  { label: "Né", props: ["P569"] },
  { label: "Lieu de naissance", props: ["P19"] },
  { label: "Décédé", props: ["P570"] },
  { label: "Lieu de décès", props: ["P20"] },
  { label: "Conjoint", props: ["P26"], max: 2 },
  { label: "Enfants", props: ["P40"], max: 5 },
  { label: "Nationalité", props: ["P27"] },
  { label: "Occupation", props: ["P106"], max: 3 },
  { label: "Fonction", props: ["P39"], max: 3 },
  { label: "Parti", props: ["P102"], max: 2 },
  { label: "Distinctions", props: ["P166"], max: 3 },
  { label: "Œuvre notable", props: ["P800"], max: 3 },
  { label: "Fondation", props: ["P571"] },
  { label: "Fondateur", props: ["P112"], max: 3 },
  { label: "Siège", props: ["P159"] },
  { label: "Propriétaire", props: ["P127"] },
  { label: "Pays", props: ["P17"] },
  { label: "Capitale", props: ["P36"] },
  { label: "Dirigeant", props: ["P35", "P6"] },
  { label: "Population", props: ["P1082"] },
  { label: "Superficie", props: ["P2046"] },
  { label: "Monnaie", props: ["P38"] },
  { label: "Langue officielle", props: ["P37"] },
  { label: "Localisation", props: ["P131", "P276"] },
  { label: "Site officiel", props: ["P856"] },
];

/** Propriétés par défaut selon le type de question quand aucun attr ne matche. */
const DEFAULT_PROPS: Record<QuestionType, string[]> = {
  where: ["P159", "P131", "P17"],
  when: ["P571", "P569"],
  howmany: ["P1082", "P2046"],
  which: ["P35"],
  who: [],
  what: [],
};

const WHEN_ATTR_PROPS: Record<string, { props: string[]; label: string; fallback?: { props: string[]; label: string } }> = {
  mort: { props: ["P570"], label: "Décès" },
  fondation: { props: ["P571"], fallback: { props: ["P1249"], label: "Première mention" }, label: "Fondation" },
  naissance: { props: ["P569"], label: "Naissance" },
};

function attrProps(qtype: QuestionType, attr?: string, attrKey?: string): AttrSpec | null {
  // Clé canonique du modèle — la voie principale, toutes langues confondues.
  if (attrKey && PROP_BY_KEY[attrKey]) {
    const s = PROP_BY_KEY[attrKey];
    return s.props.length ? s : null; // officeholder : résolu par le saut P1308
  }
  if (attr) {
    // Filet règles (modèle absent) : « count » n'est recevable que pour
    // « combien » — « dans quelle province » cherche une localisation.
    const hit = ATTR_PROPS.find((a) => a.re.test(attr) && (!a.count || qtype === "howmany"));
    if (hit) return hit;
    if (qtype === "when" && WHEN_ATTR_PROPS[attr]) return WHEN_ATTR_PROPS[attr];
    // Attribut demandé mais non mappé → pas de défaut trompeur
    // (« ancien nom » ne doit JAMAIS retourner P35 président).
    return null;
  }
  const def = DEFAULT_PROPS[qtype];
  return def.length ? { props: def, label: "Réponse" } : null;
}

export type QuestionAnswerBundle = {
  instant: InstantAnswer;
  snippet: FeaturedSnippet;
  panel: KnowledgePanel;
};

/**
 * Moteur de réponse à question — niveau Knowledge Graph :
 * 1. entité Wikidata (sigles, translittérations, alias)
 * 2. revendication structurée (président, siège, naissance, population…)
 * 3. extrait Wikipedia en contexte
 * La carte affiche la VALEUR (« Félix Tshisekedi »), pas juste un paragraphe.
 */
const PERSON_DESC =
  /homme|femme|personnalit|politicien|homme d[''']etat|femme d[''']etat|acteur|actrice|chanteur|chanteuse|joueur|joueuse|ecrivain|ecrivaine|scientifique|philosophe|artiste|musicien|militaire|footballeur|athlete|journaliste|realisateur|entrepreneur|politician|actor|singer|writer|player|scientist|president|minister|statesman|stateswoman|monarch|king|queen|sovereign|businessperson|model|comedian|boxer|wrestler|racer|driver|pilot|chef|cook|composer|painter|sculptor|architect|engineer|inventor|explorer|activist|lawyer|judge|historian|economist|mathematician|physicist|chemist|biologist|physician|doctor|professor|teacher|poet|novelist|essayist|screenwriter|director|producer|presenter|host|comedian|humorist|cartoonist|photographer|designer|fashion/i;

/** Description Wikidata d'une entité GÉO/politique — le type attendu quand
 *  l'attribut vise un territoire (« provinces », « capitale », « monnaie »).
 *  Sans ce garde-fou, « MALI » (musée de Lima) gagnait contre le pays. */
const GEO_DESC =
  /pays|état|state|country|nation|république|territoire|province|région|region|commune|ville|city|district|département|departement|souverain|empire|royaume|continent|île|island|fleuve|river|lac|lake|montagne|mountain|forêt|forest|océan|ocean|mer\b|sea\b/i;

/** Territoire POLITIQUE uniquement — une rivière ou une montagne homonyme
 *  (« Мали » = rivière du Myanmar) ne peut répondre à « combien de
 *  provinces ». GEO_DESC reste pour les questions sur les lieux naturels. */
const POLITICAL_GEO_DESC =
  /pays|état|state|country|nation|république|territoire|province|région|region|commune|ville|city|district|département|departement|souverain|empire|royaume|continent/i;

/** Attributs qui exigent une entité politique — jamais un cours d'eau. */
const POLITICAL_ATTR_KEYS = new Set([
  "capital", "currency", "official_language", "spoken_language",
  "subdivisions_count", "population", "area", "density", "head_of_state",
  "head_of_government", "officeholder", "mayor", "governor", "demonym",
  "iso_code", "tld", "calling_code", "anthem", "flag", "timezone",
]);

/** L'attribut exige une entité territoriale (« provinces du Mali »). */
function expectsGeoEntity(attr?: string): boolean {
  return !!attr &&
    /capitale|monnaie|devise|langue|habitant|population|province|région|region|département|departement|subdivision|superficie|drapeau|hymne|indicatif|fuseau|gentile|iso|domaine|tld|continent|président|president|premier|dirigeant|roi|reine|monarque|empereur|ministre|gouverneur|maire|parlement|sénat|senat|drapeau/i.test(
      attr,
    );
}

export async function answerQuestion(intent: QuestionIntentLike): Promise<QuestionAnswerBundle | undefined> {
  // Questions sur des personnes → préférer l'entité « personne » en cas d'homonymie
  // (« poutine » → Vladimir Poutine, pas le plat québécois).
  const personHint =
    intent.qtype === "who" ||
    (intent.qtype === "when" && (intent.attr === "naissance" || intent.attr === "mort")) ||
    (intent.attr != null &&
      /epouse|epoux|\bfemme\b|\bmari\b|conjoint|mere|pere|fils|fille|enfant|frere|soeur|age|taille|poids|nationalite|naissance|lieu de (mort|naissance|sepulture)|cause de mort|equipe|parti|prix|religion|fortune|etude/.test(
        intent.attr,
      ));
  // La résolution Wikipedia désambiguïse les sujets ambigus (« poutine » →
  // « Vladimir Poutine », pas le plat québécois) — mais pour les questions
  // attribut/sujet (« président DE la rdc »), le sujet EST l'entité (le pays) ;
  // le titre Wikipedia résoudrait « Président de la RDC » (la fonction).
  // Wiki et entité en parallèle — chaque appel coûte ~1s, en série la réponse
  // dépasserait le budget temps de la SERP.
  const preferDesc = personHint || intent.entityType === "person" ? PERSON_DESC : undefined;
  // Attribut mappé → la propriété exigée élimine les homonymes qui ne
  // peuvent pas répondre (« Chine » civilisation n'a pas de P35 →
  // « dirigeant chinois » choisit la RPC). Désambiguïsation par le SENS,
  // comme le Knowledge Graph.
  const earlySpec =
    intent.attr != null || intent.attrKey
      ? attrProps(intent.qtype, intent.attr, intent.attrKey)
      : null;
  // Type d'entité attendu : le modèle le déclare (toutes langues) — sinon
  // l'attribut le suggère (filet règles). « provinces du Mali » exige un
  // territoire : le musée « MALI » ne peut pas gagner.
  const expectDesc =
    intent.entityType === "country" ||
    intent.entityType === "city" ||
    intent.entityType === "region" ||
    (intent.attrKey != null && POLITICAL_ATTR_KEYS.has(intent.attrKey))
      ? POLITICAL_GEO_DESC
      : intent.entityType === "place" || expectsGeoEntity(intent.attr)
        ? GEO_DESC
        : undefined;
  const requireProp =
    intent.attr && /mort|deces|sepulture|died|death/.test(intent.attr) && !/naissance|ne\b/.test(intent.attr)
      ? "P570"
      : intent.attr && /naissance|\bnee?\b|birth|age/.test(intent.attr)
        ? "P569"
        : earlySpec?.props[0];
  const attrIntent =
    intent.qtype === "which" || intent.qtype === "where" || intent.qtype === "howmany";
  // Wiki cherché sous les deux formes : le libellé natif ET la forme
  // anglaise canonique — « Мали » ne trouve rien, « Mali » résout.
  const wikiQueries =
    intent.entityEn && intent.entityEn !== intent.wikiQuery
      ? [intent.wikiQuery, intent.entityEn]
      : [intent.wikiQuery];
  const [wikiA, wikiB, directEntity] = await Promise.all([
    fetchWikiAnswer(wikiQueries[0], intent.lang),
    wikiQueries[1] ? fetchWikiAnswer(wikiQueries[1], intent.lang) : Promise.resolve(undefined),
    attrIntent
      ? searchEntity(intent.subject, preferDesc, requireProp, expectDesc, intent.lang)
      : Promise.resolve(undefined),
  ]);
  const wiki = wikiA ?? wikiB;
  const entity =
    directEntity ??
    (wiki ? await searchEntity(wiki.title, preferDesc, requireProp, expectDesc) : undefined) ??
    (await searchEntity(intent.subject, preferDesc, requireProp, expectDesc, intent.lang)) ??
    // Forme anglaise canonique : « Мали » en fr|en ne matche rien, « Mali »
    // résout. Le modèle l'émet pour toute langue non-latine.
    (intent.entityEn && intent.entityEn !== intent.subject
      ? await searchEntity(intent.entityEn, preferDesc, requireProp, expectDesc)
      : undefined);

  let lines: { label: string; value: string }[] = [];
  // Le libellé d'entité prime (« République démocratique du Congo ») — le titre
  // wiki peut résoudre l'attribut (« Président de la RDC », la fonction).
  let entityName = entity?.label ?? wiki?.title ?? intent.subject;
  let structuredSource: string | undefined;
  let panelImage: string | undefined = wiki?.image;
  let panelFacts: { label: string; value: string }[] = [];

  // « ministre des sports de X » — question de FONCTION : le titulaire est la
  // revendication P1308 d'une entité-position (« Minister of Sports of
  // Guinea »). Déclenché par la clé canonique (toutes langues) ou par le
  // filet règles sur le libellé. Hors du bloc claims : le dump d'un pays
  // (~10 Mo) peut échouer alors que la fonction, elle, répond.
  const officeholderAsked =
    intent.attrKey === "officeholder" ||
    (intent.attr != null &&
      /ministre|gouverneur|ambassadeur|secrétaire|secretaire|préfet|prefet|recteur/i.test(intent.attr) &&
      !/premier/i.test(intent.attr));

  // Extraction depuis l'extrait réel — pour les attrs sans propriété Wikidata
  // (« fondé en 1982 par Étienne Tshisekedi », « anciennement Léopoldville »).
  const wikiExtraction = (): { label: string; value: string }[] => {
    if (!wiki || !intent.attr) return [];
    let m: RegExpMatchArray | null = null;
    const trimTail = (v: string) =>
      v
        .trim()
        .replace(/[.,;:]+$/, "")
        .replace(/\s+(?:de|du|des|d[''']|of|the|à|au|en|in)\s*$/, "")
        .replace(/\s+(?:de|du|des|of|in)\s+\d[\d ]*(?:\s*[àaà–-]\s*\d[\d ]*)?$/, "");
    if (/fondateur|createur|inventeur|auteur|lance/.test(intent.attr)) {
      m =
        wiki.extract.match(
          /(?:fond[ée]+s?|cr[ée]+[ée]?s?|invent[ée]+s?|lanc[ée]+s?|initi[ée]+s?)\w*[^.]{0,50}?par\s+(?:le\s+|la\s+|les\s+|l['''])?([A-ZÉÈÊÀ][\p{L}'' .-]{2,50})/u,
        ) ??
        wiki.extract.match(
          /(?:founded|created|invented|launched|established|initiated)\w*[^.]{0,50}?by\s+([A-Z][\p{L}'' .-]{2,50})/u,
        );
      if (m?.[1]) return [{ label: "Fondateur", value: trimTail(m[1]) }];
    }
    if (/ancien|appellation|nomme|appele|jadis/.test(intent.attr)) {
      m =
        wiki.extract.match(
          /(?:anciennement|autrefois|jadis|appelée?|nommée?|dite?|sous le nom(?: d[''']| de )?|ex[- ])\s*(?:le\s+|la\s+|les\s+|l['''])?([A-ZÉÈÊÀ][\p{L}''.-]+(?:\s+(?:de|du|des|d[''']\s*)?[\p{L}\d''.-]+){0,3})/u,
        ) ??
        wiki.extract.match(
          /(?:formerly|previously|once)\s+(?:known as|called|named)?\s*(?:the\s+)?([A-Z][\p{L}''.-]+(?:\s+(?:of|the|de|du|des)?\s*[\p{L}\d''.-]+){0,3})/u,
        );
      if (m?.[1]) return [{ label: "Ancien nom", value: trimTail(m[1]) }];
    }
    return [];
  };

  let spec: ReturnType<typeof attrProps> | null = null;
  let attrMiss = false;
  if (entity) {
    spec = attrProps(intent.qtype, intent.attr, intent.attrKey);
    // Uniquement les propriétés nécessaires : le dump complet d'une entité
    // pays pèse ~10 Mo et expire sous la latence réseau (réponses absentes ou
    // aléatoires en prod). wbgetclaims renvoie de petites réponses en parallèle.
    // Un seul appel pour toutes les revendications : ~35 petites requêtes
    // par question faisaient throttler l'IP chez Wikidata (falaise de
    // réponses après quelques questions). Un appel unique, même lourd, est
    // plus fiable et caché côté Vercel (revalidate).
    // Double voie : l'appel CIBLÉ sur les propriétés demandées (petites
    // réponses, ~200 ms) garantit la réponse même quand le dump complet
    // échoue — Poutine ou un pays pèsent 20-40 Mo et expirent toujours.
    // Le dump, en parallèle, sert au panneau de connaissance (best-effort).
    const specProps = spec
      ? [...spec.props, ...(spec.fallback?.props ?? []), ...(spec.hop?.props ?? [])]
      : [];
    const [dumpClaims, targetedClaims] = await Promise.all([
      getClaims(entity.id),
      specProps.length ? getClaimsFor(entity.id, specProps) : Promise.resolve(undefined),
    ]);
    const claims = dumpClaims ?? targetedClaims;
    if (claims) {
      panelImage ??= await entityImage(claims);
      if (spec) {
        if (spec.hop) {
          // Deuxième saut (« première dame » → conjoint du titulaire P35) :
          // on lit l'id d'entité du poste puis sa revendication P26.
          const holderId = claimEntityIds(claims, spec.props)[0];
          if (holderId) {
            const hc = await getClaimsFor(holderId, spec.hop.props);
            const hv = hc ? await claimValues(hc, spec.hop.props, { max: 2 }) : undefined;
            if (hv?.length) {
              lines = [{ label: spec.hop.label, value: hv.join(" · ") }];
              structuredSource = entityUrl(entity.id);
            }
          }
        }
        if (!lines.length && spec.count) {
          // « combien de provinces » → dénombrement réel des P150 + exemples
          // de noms résolus. Jamais un chiffre inventé. TOUTES les
          // revendications non-dépréciées comptent — allSnaks(max=3)
          // sous-dénombrait (« 3 » affiché pour 4+ régions).
          const allIds = new Set<string>();
          for (const p of spec.props) {
            for (const snak of claims[p] ?? []) {
              if (snak.rank === "deprecated") continue;
              const v = snak.mainsnak?.datavalue?.value;
              if (v && typeof v === "object") {
                if ("id" in v && typeof v.id === "string") allIds.add(v.id);
                else if ("numericId" in v && typeof v.numericId === "number")
                  allIds.add(`Q${v.numericId}`);
              }
            }
          }
          const ids = [...allIds];
          if (ids.length) {
            const sample = (await claimValues(claims, spec.props, { max: 4 })) ?? [];
            const value = sample.length
              ? `${ids.length} — ${sample.join(", ")}…`
              : String(ids.length);
            lines = [{ label: spec.label, value }];
            structuredSource = entityUrl(entity.id);
          }
        }
        if (!lines.length) {
          // Itère les propriétés dans l'ordre — la valeur P6 affiche
          // « Premier ministre », pas « Président ».
          let propLabel = spec.label;
          let values: string[] | undefined;
          for (const p of spec.props) {
            values = spec.age
              ? await claimValues(claims, [p], { age: true, max: 1 })
              : await claimValues(claims, [p], { max: 3 });
            if (values?.length) {
              propLabel = spec.propLabels?.[p] ?? spec.label;
              break;
            }
          }
          if (values?.length) {
            // « qui fut/était… » → Wikidata rend le titulaire ACTUEL ; on le
            // dit honnêtement (« Président (actuel) ») plutôt que de prétendre
            // répondre à une question historique.
            const label =
              intent.past &&
              /president|premier ministre|chef de l|maire|dirigeant|pape|premiere dame/i.test(
                propLabel,
              )
                ? `${propLabel} (actuel)`
                : propLabel;
            lines = [{ label, value: values.join(" · ") }];
            structuredSource = entityUrl(entity.id);
          } else if (spec.fallback) {
            // « fondation » d'une ville sans P571 → première mention écrite (P1249),
            // labellisée honnêtement (« Minsk : Première mention 1067 »).
            const fv = await claimValues(claims, spec.fallback.props, { max: 3 });
            if (fv?.length) {
              lines = [{ label: spec.fallback.label, value: fv.join(" · ") }];
              structuredSource = entityUrl(entity.id);
            }
          }
        }
      }
      // « qui est X » — fiche enrichie : naissance, nationalité, occupation réelles.
      if (intent.qtype === "who" && !lines.length && !officeholderAsked) {
        const m = await batchClaimValues(claims, [
          { key: "Naissance", props: ["P569"], max: 1 },
          { key: "Décès", props: ["P570"], max: 1 },
          { key: "Nationalité", props: ["P27"], max: 2 },
          { key: "Occupation", props: ["P106"], max: 2 },
        ]);
        const facts = [...m.entries()].map(([label, vs]) => ({ label, value: vs.join(", ") }));
        lines = facts.slice(0, 4);
        if (facts.length) structuredSource = entityUrl(entity.id);
      }
      // « quand » sans valeur structurée → proposer naissance/décès/fondation réels.
      if (intent.qtype === "when" && !lines.length) {
        const cand: { label: string; props: string[] }[] = [
          { label: "Naissance", props: ["P569"] },
          { label: "Fondation", props: ["P571"] },
          { label: "Première mention", props: ["P1249"] },
          { label: "Décès", props: ["P570"] },
        ];
        for (const c of cand) {
          const v = await claimValue(claims, c.props);
          if (v) {
            lines = [{ label: c.label, value: v }];
            structuredSource = entityUrl(entity.id);
            break;
          }
        }
      }
      // Extraction réelle avant la fiche (« ancien nom », « fondé par »…).
      if (!lines.length) lines = wikiExtraction();
      // Attribut RECONNU mais sans revendication (« maire de Kinshasa » sans
      // P6, « ministre des sports » sans P1308) → pas de fiche générique :
      // afficher « Fondation : 1881 » ou la fiche d'identité du pays à une
      // question de fonction est trompeur.
      attrMiss = (spec != null || officeholderAsked) && !lines.length;
      if (!lines.length && intent.qtype !== "who" && !attrMiss) {
        const m = await batchClaimValues(
          claims,
          FICHE.map((f) => ({ key: f.label, props: f.props, max: 2 })),
        );
        const facts = [...m.entries()].slice(0, 4).map(([label, vs]) => ({ label, value: vs.join(", ") }));
        if (facts.length) {
          lines = facts;
          structuredSource = entityUrl(entity.id);
        }
      }
      // Panneau de connaissance riche (style Google) — faits structurés de
      // l'entité en UN batch de résolution de libellés (~1 appel, pas 25).
      const pm = await batchClaimValues(
        claims,
        PANEL_FACTS.map((f) => ({ key: f.label, props: f.props, max: f.max ?? 2 })),
      );
      panelFacts = [...pm.entries()].slice(0, 8).map(([label, vs]) => ({ label, value: vs.join(", ") }));
      if (entity.label && !wiki) entityName = entity.label;
    }
  }

  // Le saut fonction→titulaire ne dépend pas des claims du pays — il tourne
  // même si le dump Wikidata de l'entité a échoué ou si l'entité manque.
  if (!lines.length && officeholderAsked && (intent.attr || intent.attrEn)) {
    const ctx = intent.entityEn || entityName;
    const posQueries = [intent.attrEn, intent.attr].filter((x): x is string => Boolean(x));
    for (const pq of posQueries) {
      const pos = await searchPositionEntity(pq, ctx);
      if (!pos) continue;
      const pc = await getClaimsFor(pos.id, ["P1308"]);
      const hv = pc ? await claimValues(pc, ["P1308"], { max: 2 }) : undefined;
      if (hv?.length) {
        const lbl = intent.attr || intent.attrEn || "Titulaire";
        lines = [{ label: lbl[0].toUpperCase() + lbl.slice(1), value: hv.join(" · ") }];
        structuredSource = entityUrl(pos.id);
        break;
      }
    }
  }

  // Même extraction quand l'entité ou les claims manquent (wiki seul).
  if (!lines.length) lines = wikiExtraction();
  // Corps d'article : attribut reconnu sans revendication Wikidata (le
  // Sankuru n'a pas de P1412) → phrases RÉELLES citant le domaine demandé —
  // le « featured snippet » de Google, pas le chapeau générique.
  if (!lines.length && (spec || officeholderAsked) && wiki) {
    const body = await fetchWikiBody(wiki.title, wiki.lang);
    if (body) {
      const sents = bodySentencesForAttr(body, intent);
      if (sents.length) {
        lines = [{ label: QTYPE_LABEL[intent.qtype], value: sents.join(" ") }];
      }
    }
  }
  // Attribut reconnu sans réponse trouvée → pas de chapeau générique :
  // afficher « La Guinée est un pays… » à « qui est le ministre des sports »
  // est une non-réponse déguisée. Rien vaut mieux qu'une carte trompeuse.
  if (!lines.length && wiki && !spec && !officeholderAsked) {
    lines = [{ label: QTYPE_LABEL[intent.qtype], value: firstSentences(wiki.extract, 2) }];
  }
  if (!lines.length && entity?.description && !/homonymie|disambiguation/i.test(entity.description)) {
    lines = [{ label: QTYPE_LABEL[intent.qtype], value: entity.description }];
  }
  if (!lines.length) return undefined;

  const headline = lines[0];
  const sources = [
    structuredSource ? `Wikidata${entity ? ` (${entity.id})` : ""}` : null,
    wiki ? `Wikipédia ${wiki.lang.toUpperCase()}` : null,
  ]
    .filter(Boolean)
    .join(" + ");

  const instant: InstantAnswer = {
    kind: "answer",
    title: entityName,
    lines,
    footnote: `Source : ${sources || "Wikidata/Wikipédia"} — données réelles`,
  };

  const snippet: FeaturedSnippet = {
    title: entityName,
    text: wiki
      ? `${headline.label !== "Réponse" ? `${headline.label} : ${headline.value} — ` : ""}${firstSentences(wiki.extract, 2, 300)}`
      : `${headline.label} : ${headline.value}`,
    url: wiki?.url ?? structuredSource ?? `https://www.wikidata.org/wiki/Special:Search?search=${encodeURIComponent(intent.subject)}`,
    domain: wiki ? `${wiki.lang}.wikipedia.org` : "wikidata.org",
  };

  const panel: KnowledgePanel = {
    title: entityName,
    subtitle: entity?.description ?? wiki?.description ?? `Wikipédia (${wiki?.lang ?? "fr"})`,
    summary: wiki?.extract ?? `${entityName} — ${entity?.description ?? "entité du graphe de connaissances"}.`,
    // Faits structurés réels (Wikidata) — le panneau type Google, pas juste
    // « Source / Lien ». Complétés par la source Wikipedia.
    facts: [
      ...panelFacts,
      ...(wiki
        ? [{ label: "Lire sur Wikipédia", value: wiki.url }]
        : entity
          ? [{ label: "Lien", value: entityUrl(entity.id) }]
          : []),
    ],
    sources: [
      ...(entity ? ["wikidata.org"] : []),
      ...(wiki ? [`${wiki.lang}.wikipedia.org`] : []),
    ],
    image: wiki?.image ?? panelImage,
  };

  return { instant, snippet, panel };
}
