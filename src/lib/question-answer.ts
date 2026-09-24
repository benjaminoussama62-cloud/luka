import { meaningfulTokens, normalizeQueryText, tokenMatchesInHay } from "./search-relevance";
import type { FeaturedSnippet, InstantAnswer, KnowledgePanel } from "./types";
import type { QuestionType } from "./query-intent";
import {
  ageValue,
  claimValue,
  claimValues,
  entityUrl,
  getClaims,
  searchEntity,
  type Claims,
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
  lang: "fr" | "en";
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

export async function fetchWikiAnswer(subject: string): Promise<WikiAnswer | undefined> {
  for (const lang of ["fr", "en"] as const) {
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
};

/** Attribut demandé → propriété(s) Wikidata. Couverture large FR/EN. */
const ATTR_PROPS: { re: RegExp; props: string[]; label: string; age?: boolean }[] = [
  { re: /president|chef d[''']?etat|chef de l[''']?etat|head of state|dirigeant/i, props: ["P35", "P6"], label: "Président" },
  { re: /premier ministre|prime minister|chef du gouvernement|head of government/i, props: ["P6"], label: "Premier ministre" },
  { re: /roi|reine|monarque|king|queen/i, props: ["P35"], label: "Chef de l'État" },
  { re: /capitale/i, props: ["P36"], label: "Capitale" },
  { re: /monnaie|devise|currency/i, props: ["P38"], label: "Monnaie" },
  { re: /langue/i, props: ["P37"], label: "Langue officielle" },
  { re: /habitants?|population|demographie/i, props: ["P1082"], label: "Population" },
  { re: /superficie|surface|area|km/i, props: ["P2046"], label: "Superficie" },
  { re: /densite/i, props: ["P2225"], label: "Densité" },
  { re: /fondateur|fondatrice|founder|cofondateur/i, props: ["P112"], label: "Fondateur" },
  { re: /pdg|ceo|directeur general|directrice|chief executive|patron/i, props: ["P169"], label: "Direction" },
  { re: /siege|headquarter|siege social/i, props: ["P159"], label: "Siège" },
  { re: /pays|country|nation/i, props: ["P17"], label: "Pays" },
  { re: /continent/i, props: ["P30"], label: "Continent" },
  { re: /hymne|anthem/i, props: ["P85"], label: "Hymne" },
  { re: /epouse|epoux|mari|femme de|conjoint|spouse|wife|husband/i, props: ["P26"], label: "Conjoint" },
  { re: /\bmere\b|mother/i, props: ["P25"], label: "Mère" },
  { re: /\bpere\b|father/i, props: ["P22"], label: "Père" },
  { re: /enfants?|children|child/i, props: ["P40"], label: "Enfant(s)" },
  { re: /naissance|date de naissance|\bne\b|birth/i, props: ["P569"], label: "Naissance" },
  { re: /mort|deces|deces|death|died|date de deces/i, props: ["P570"], label: "Décès" },
  { re: /lieu de naissance|birthplace|ou est ne/i, props: ["P19"], label: "Lieu de naissance" },
  { re: /lieu de (mort|deces)|death place/i, props: ["P20"], label: "Lieu de décès" },
  { re: /nationalite|citoyennete|citizenship|passeport/i, props: ["P27"], label: "Nationalité" },
  { re: /taille|height|grandeur/i, props: ["P2048"], label: "Taille" },
  { re: /religion|croyance/i, props: ["P140"], label: "Religion" },
  { re: /age\b|quel age/i, props: ["P569"], label: "Âge", age: true },
  { re: /occupation|metier|profession/i, props: ["P106"], label: "Occupation" },
  { re: /site (officiel|web)|website|official site/i, props: ["P856"], label: "Site officiel" },
  { re: /indicatif|code telephonique|calling code|prefixe/i, props: ["P474"], label: "Indicatif" },
  { re: /fuseau|timezone|time zone/i, props: ["P421"], label: "Fuseau horaire" },
  { re: /gentile|demonym|habitants appeles/i, props: ["P1549"], label: "Gentilé" },
  { re: /code iso|iso|code pays/i, props: ["P297"], label: "Code ISO" },
  { re: /tld|domaine internet|extension/i, props: ["P78"], label: "Domaine national" },
  { re: /fleuve|river|riviere/i, props: ["P206"], label: "Fleuve / cours d'eau" },
  { re: /aeroport|airport|iata/i, props: ["P239", "P238"], label: "Aéroport (ICAO/IATA)" },
  { re: /ville|commune|quartier|province|etat|region|departement|district|localite|arrondissement/i, props: ["P159", "P131", "P276", "P17"], label: "Localisation" },
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

const WHEN_ATTR_PROPS: Record<string, { props: string[]; label: string }> = {
  mort: { props: ["P570"], label: "Décès" },
  fondation: { props: ["P571"], label: "Fondation" },
  naissance: { props: ["P569"], label: "Naissance" },
};

function attrProps(qtype: QuestionType, attr?: string): { props: string[]; label: string; age?: boolean } | null {
  if (attr) {
    const hit = ATTR_PROPS.find((a) => a.re.test(attr));
    if (hit) return hit;
    if (qtype === "when" && WHEN_ATTR_PROPS[attr]) return WHEN_ATTR_PROPS[attr];
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
  /homme|femme|personnalit|politicien|homme d[''']etat|femme d[''']etat|acteur|actrice|chanteur|chanteuse|joueur|joueuse|ecrivain|ecrivaine|scientifique|philosophe|artiste|musicien|militaire|footballeur|athlete|journaliste|realisateur|entrepreneur|politician|actor|singer|writer|player|scientist/i;

export async function answerQuestion(intent: QuestionIntentLike): Promise<QuestionAnswerBundle | undefined> {
  // Questions sur des personnes → préférer l'entité « personne » en cas d'homonymie
  // (« poutine » → Vladimir Poutine, pas le plat québécois).
  const personHint =
    intent.qtype === "who" ||
    (intent.qtype === "when" && (intent.attr === "naissance" || intent.attr === "mort")) ||
    (intent.qtype === "which" &&
      intent.attr != null &&
      /epouse|epoux|conjoint|mere|pere|enfant|age|taille|nationalite|naissance/.test(intent.attr));
  // La résolution Wikipedia désambiguïse les sujets ambigus (« poutine » →
  // « Vladimir Poutine », pas le plat québécois) — mais pour les questions
  // attribut/sujet (« président DE la rdc »), le sujet EST l'entité (le pays) ;
  // le titre Wikipedia résoudrait « Président de la RDC » (la fonction).
  const wiki = await fetchWikiAnswer(intent.wikiQuery);
  const attrIntent =
    intent.qtype === "which" || intent.qtype === "where" || intent.qtype === "howmany";
  const entity =
    (attrIntent
      ? await searchEntity(intent.subject, personHint ? PERSON_DESC : undefined)
      : undefined) ??
    (wiki ? await searchEntity(wiki.title, personHint ? PERSON_DESC : undefined) : undefined) ??
    (await searchEntity(intent.subject, personHint ? PERSON_DESC : undefined));

  let lines: { label: string; value: string }[] = [];
  let entityName = wiki?.title ?? entity?.label ?? intent.subject;
  let structuredSource: string | undefined;

  if (entity) {
    const claims = await getClaims(entity.id);
    if (claims) {
      const spec = attrProps(intent.qtype, intent.attr);
      if (spec) {
        const values = spec.age
          ? await claimValues(claims, spec.props, { age: true, max: 1 })
          : await claimValues(claims, spec.props, { max: 3 });
        if (values?.length) {
          lines = [{ label: spec.label, value: values.join(" · ") }];
          structuredSource = entityUrl(entity.id);
        }
      }
      // « qui est X » — fiche enrichie : naissance, nationalité, occupation réelles.
      if (intent.qtype === "who" && !lines.length) {
        const facts: { label: string; value: string }[] = [];
        const birth = await claimValue(claims, ["P569"]);
        if (birth) facts.push({ label: "Naissance", value: birth });
        const death = await claimValue(claims, ["P570"]);
        if (death) facts.push({ label: "Décès", value: death });
        const nat = await claimValues(claims, ["P27"], { max: 2 });
        if (nat?.length) facts.push({ label: "Nationalité", value: nat.join(", ") });
        const occ = await claimValues(claims, ["P106"], { max: 2 });
        if (occ?.length) facts.push({ label: "Occupation", value: occ.join(", ") });
        lines = facts.slice(0, 4);
        if (facts.length) structuredSource = entityUrl(entity.id);
      }
      // « quand » sans valeur structurée → proposer naissance/décès/fondation réels.
      if (intent.qtype === "when" && !lines.length) {
        const cand: { label: string; props: string[] }[] = [
          { label: "Naissance", props: ["P569"] },
          { label: "Fondation", props: ["P571"] },
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
      if (entity.label && !wiki) entityName = entity.label;
    }
  }

  if (!lines.length && wiki) {
    lines = [{ label: QTYPE_LABEL[intent.qtype], value: firstSentences(wiki.extract, 2) }];
  }
  if (!lines.length && !wiki) return undefined;

  const headline = lines[0];
  const sources = [
    structuredSource ? `Wikidata (${entity!.id})` : null,
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

  const panel: KnowledgePanel = wiki
    ? wikiAnswerToPanel(wiki)
    : {
        title: entityName,
        subtitle: entity?.description ?? "Entité Wikidata",
        summary: `${entityName} — ${entity?.description ?? "entité du graphe de connaissances"}.`,
        facts: [
          { label: "Source", value: "Wikidata" },
          { label: "Lien", value: entityUrl(entity!.id) },
        ],
        sources: ["wikidata.org"],
      };

  return { instant, snippet, panel };
}
