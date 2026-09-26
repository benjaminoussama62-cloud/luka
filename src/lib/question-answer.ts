import { meaningfulTokens, normalizeQueryText, tokenMatchesInHay } from "./search-relevance";
import type { FeaturedSnippet, InstantAnswer, KnowledgePanel } from "./types";
import type { QuestionType } from "./query-intent";
import {
  claimValue,
  claimValues,
  entityImage,
  entityUrl,
  getClaims,
  searchEntity,
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

/** Attribut demandé → propriété(s) Wikidata. Couverture large FR/EN.
 *  Ordre significatif : les expressions composées (« lieu de mort ») avant les
 *  mots simples (« mort ») qui leur sont inclus. */
type AttrSpec = { props: string[]; label: string; age?: boolean; fallback?: { props: string[]; label: string } };

const ATTR_PROPS: (AttrSpec & { re: RegExp })[] = [
  // — composés d'abord —
  { re: /lieu de naissance|birthplace|ou est ne|born in/i, props: ["P19"], label: "Lieu de naissance" },
  { re: /lieu de (mort|deces)|death place|ou est mort/i, props: ["P20"], label: "Lieu de décès" },
  { re: /cause de (mort|deces)|comment est mort|de quoi est mort|cause of death/i, props: ["P509"], label: "Cause du décès" },
  { re: /lieu de sepulture|inhume|enterre|buried|resting place|tombe/i, props: ["P119"], label: "Sépulture" },
  { re: /premier ministre|prime minister|chef du gouvernement|head of government/i, props: ["P6"], label: "Premier ministre" },
  { re: /date de naissance|quand est ne|date of birth/i, props: ["P569"], label: "Naissance" },
  { re: /date de (mort|deces)|quand est mort|date of death/i, props: ["P570"], label: "Décès" },
  { re: /langue officielle|official language/i, props: ["P37"], label: "Langue officielle" },
  { re: /langues? parlees?|parle quelle langue|languages spoken/i, props: ["P1412", "P37"], label: "Langue(s)" },
  // — dirigeants & organisation —
  { re: /president|chef d[''']?etat|chef de l[''']?etat|head of state|dirigeant/i, props: ["P35", "P6"], label: "Président" },
  { re: /roi|reine|monarque|king|queen/i, props: ["P35"], label: "Chef de l'État" },
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
  { re: /ville|commune|quartier|province|etat|region|departement|district|localite|arrondissement/i, props: ["P159", "P131", "P276", "P17"], label: "Localisation" },
];

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

function attrProps(qtype: QuestionType, attr?: string): AttrSpec | null {
  if (attr) {
    const hit = ATTR_PROPS.find((a) => a.re.test(attr));
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
  /homme|femme|personnalit|politicien|homme d[''']etat|femme d[''']etat|acteur|actrice|chanteur|chanteuse|joueur|joueuse|ecrivain|ecrivaine|scientifique|philosophe|artiste|musicien|militaire|footballeur|athlete|journaliste|realisateur|entrepreneur|politician|actor|singer|writer|player|scientist/i;

export async function answerQuestion(intent: QuestionIntentLike): Promise<QuestionAnswerBundle | undefined> {
  // Questions sur des personnes → préférer l'entité « personne » en cas d'homonymie
  // (« poutine » → Vladimir Poutine, pas le plat québécois).
  const personHint =
    intent.qtype === "who" ||
    (intent.qtype === "when" && (intent.attr === "naissance" || intent.attr === "mort")) ||
    (intent.attr != null &&
      /epouse|epoux|conjoint|mere|pere|enfant|frere|soeur|age|taille|poids|nationalite|naissance|lieu de (mort|naissance|sepulture)|cause de mort|equipe|parti|prix|religion|fortune|etude/.test(
        intent.attr,
      ));
  // La résolution Wikipedia désambiguïse les sujets ambigus (« poutine » →
  // « Vladimir Poutine », pas le plat québécois) — mais pour les questions
  // attribut/sujet (« président DE la rdc »), le sujet EST l'entité (le pays) ;
  // le titre Wikipedia résoudrait « Président de la RDC » (la fonction).
  const wiki = await fetchWikiAnswer(intent.wikiQuery);
  const attrIntent =
    intent.qtype === "which" || intent.qtype === "where" || intent.qtype === "howmany";
  // Contrainte sémantique de désambiguïsation : une question « mort » exige une
  // entité morte (P570), « naissance » une entité née (P569) — un footballeur
  // homonyme vivant ne peut pas répondre « où est mort khadafi ».
  const requireProp =
    intent.attr && /mort|deces|sepulture|died|death/.test(intent.attr) && !/naissance|ne\b/.test(intent.attr)
      ? "P570"
      : intent.attr && /naissance|\bnee?\b|birth|age/.test(intent.attr)
        ? "P569"
        : undefined;
  const preferDesc = personHint ? PERSON_DESC : undefined;
  const entity =
    (attrIntent
      ? await searchEntity(intent.subject, preferDesc, requireProp)
      : undefined) ??
    (wiki ? await searchEntity(wiki.title, preferDesc, requireProp) : undefined) ??
    (await searchEntity(intent.subject, preferDesc, requireProp));

  let lines: { label: string; value: string }[] = [];
  let entityName = wiki?.title ?? entity?.label ?? intent.subject;
  let structuredSource: string | undefined;
  let panelImage: string | undefined = wiki?.image;
  let panelFacts: { label: string; value: string }[] = [];

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

  if (entity) {
    const claims = await getClaims(entity.id);
    if (claims) {
      panelImage ??= await entityImage(claims);
      const spec = attrProps(intent.qtype, intent.attr);
      if (spec) {
        const values = spec.age
          ? await claimValues(claims, spec.props, { age: true, max: 1 })
          : await claimValues(claims, spec.props, { max: 3 });
        if (values?.length) {
          lines = [{ label: spec.label, value: values.join(" · ") }];
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
      // Fiche d'entité générique — toute question reconnue sort des faits réels
      // (comme le panneau Knowledge Graph de Google), même sans attr mappé.
      if (!lines.length && intent.qtype !== "who") {
        const facts: { label: string; value: string }[] = [];
        for (const f of FICHE) {
          if (facts.length >= 4) break;
          const v = await claimValues(claims, f.props, { max: 2 });
          if (v?.length) facts.push({ label: f.label, value: v.join(", ") });
        }
        if (facts.length) {
          lines = facts;
          structuredSource = entityUrl(entity.id);
        }
      }
      // Panneau de connaissance riche (style Google) — faits structurés de
      // l'entité : naissance, décès, conjoint, enfants, fonction, parti…
      const pf: { label: string; value: string }[] = [];
      for (const f of PANEL_FACTS) {
        if (pf.length >= 8) break;
        const v = await claimValues(claims, f.props, { max: f.max ?? 2 });
        if (v?.length) pf.push({ label: f.label, value: v.join(", ") });
      }
      panelFacts = pf;
      if (entity.label && !wiki) entityName = entity.label;
    }
  }

  // Même extraction quand l'entité ou les claims manquent (wiki seul).
  if (!lines.length) lines = wikiExtraction();
  if (!lines.length && wiki) {
    lines = [{ label: QTYPE_LABEL[intent.qtype], value: firstSentences(wiki.extract, 2) }];
  }
  if (!lines.length && entity?.description && !/homonymie|disambiguation/i.test(entity.description)) {
    lines = [{ label: QTYPE_LABEL[intent.qtype], value: entity.description }];
  }
  if (!lines.length) return undefined;

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
