/**
 * Compréhension de requête par modèle de langue — l'équivalent de l'étape
 * « intent » de Google (BERT/MUM). Aucune règle par mot : le modèle comprend
 * le sens quelle que soit la langue, l'orthographe ou l'ordre des mots.
 *
 *   « mali compte combien de provnce »  → { entity:"Mali", attrKey:"subdivisions_count", entityType:"country" }
 *   « quel langue se parle au sankuru » → { entity:"Sankuru", attrKey:"spoken_language", entityType:"region" }
 *   « minister of sports in guinea »    → { entity:"Guinea", attrKey:"officeholder", attribute:"minister of sports" }
 *   « сколько лет путину »              → { entity:"Vladimir Putin", attrKey:"age", entityType:"person" }
 *
 * Le modèle émet des CLÉS CANONIQUES d'un vocabulaire fermé — la couche
 * suivante fait un lookup de propriété Wikidata par clé, pas une regex sur
 * les mots. Résultat borné (timeout ~1,4 s), mis en cache 24 h ; les règles
 * synchrones de query-intent restent le filet si l'appel échoue.
 */
import { cacheGet, cacheSet } from "./cache/redis";
import type { QuestionType } from "./query-intent";

/** Attributs canoniques — fermés. Chaque clé mappe vers des propriétés
 *  Wikidata dans question-answer.ts (PROP_BY_KEY), indépendamment de la
 *  langue de la requête. */
export const ATTR_KEYS = [
  // territoire / politique
  "capital", "currency", "official_language", "spoken_language", "population",
  "area", "density", "country", "continent", "anthem", "flag", "elevation",
  "river", "river_mouth", "airport", "calling_code", "timezone", "demonym",
  "iso_code", "tld", "postal_code", "subdivisions_count", "location",
  // gouvernance
  "head_of_state", "head_of_government", "monarch", "first_lady", "mayor",
  "officeholder", "governor",
  // organisation / œuvre
  "founder", "ceo", "headquarters", "creator", "author", "composer",
  "director", "performer", "owner", "parent_org", "employees", "website",
  "inception", "dissolution", "duration",
  // personne
  "birth_date", "death_date", "birthplace", "death_place", "death_cause",
  "resting_place", "age", "spouse", "mother", "father", "siblings",
  "children", "nationality", "height", "weight", "religion", "party",
  "team", "awards", "education", "occupation", "position_held",
  "net_worth", "notable_work",
  // divers
  "definition", "other",
] as const;
export type AttrKey = (typeof ATTR_KEYS)[number];

/** Type d'entité attendu — contraint la désambiguïsation Wikidata. */
export const ENTITY_TYPES = [
  "country", "city", "region", "place", "person", "org", "work",
  "concept", "product", "other", "",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export type Understanding = {
  /** Requête corrigée (orthographe, accents, noms propres) — jamais vide. */
  corrected: string;
  intent:
    | "calc"
    | "question"
    | "definition"
    | "navigation"
    | "location"
    | "comparison"
    | "news"
    | "general";
  /** Sujet canonique de la requête (« Mali », « Sankuru », « Vladimir Poutine »). */
  entity: string;
  /** Clé canonique de l'attribut demandé (vocabulaire fermé), "" si aucun. */
  attrKey: AttrKey | "";
  /** Libellé lisible de l'attribut dans la langue de la requête
   *  (« ministre des sports ») — sert à chercher la fonction pour
   *  attrKey="officeholder" et à labelliser la carte. */
  attribute: string;
  /** Traduction anglaise de l'attribut — les fonctions Wikidata sont souvent
   *  libellées en anglais (« Minister of Sports of Guinea »). */
  attributeEn: string;
  /** Nom canonique anglais de l'entité (« Guinea », « Russia »). */
  entityEn: string;
  /** Type d'entité attendu — borne la désambiguïsation. */
  entityType: EntityType;
  qtype: QuestionType;
  /** Expression/équation si intent = calc. */
  expr: string;
  lang: string;
};

const VALID_INTENTS = new Set([
  "calc",
  "question",
  "definition",
  "navigation",
  "location",
  "comparison",
  "news",
  "general",
]);
const VALID_QTYPES = new Set(["who", "where", "what", "when", "which", "howmany"]);
const VALID_ATTR_KEYS = new Set<string>(ATTR_KEYS);
const VALID_ENTITY_TYPES = new Set<string>(ENTITY_TYPES);

const SYSTEM = `Tu es l'analyseur de requêtes d'un moteur de recherche. La requête peut être en n'importe quelle langue, contenir des fautes d'orthographe, du style SMS, une ponctuation manquante. Tu réponds UNIQUEMENT par un objet JSON, jamais de texte autour.

{
 "corrected": string,   // requête corrigée (orthographe, accents, noms propres capitalisés)
 "intent": "calc"|"question"|"definition"|"navigation"|"location"|"comparison"|"news"|"general",
 "entity": string,      // sujet principal canonique (nom propre normalisé), "" si aucun
 "attrKey": string,     // clé canonique de l'attribut demandé — liste ci-dessous, "" si la requête demande l'entité elle-même
 "attribute": string,   // formulation lisible de l'attribut dans la langue de la requête ("ministre des sports"), "" si aucun
 "attributeEn": string, // traduction anglaise de attribute ("minister of sports"), "" si aucun
 "entityEn": string,    // nom anglais canonique de l'entité ("Guinea", "Russia"), "" si inconnu
 "entityType": "country"|"city"|"region"|"place"|"person"|"org"|"work"|"concept"|"product"|"other"|"",
 "qtype": "who"|"where"|"what"|"when"|"which"|"howmany",
 "expr": string,        // expression mathématique évaluable si intent=calc, sinon ""
 "lang": string         // code langue de la requête ("fr","en","sw","ln","ru",...)
}

intent:
- "calc" : calcul, équation, conversion numérique
- "question" : demande un fait précis sur une entité (personne, pays, lieu, œuvre)
- "definition" : « c'est quoi X », « que veut dire X », « what is X »
- "navigation" : l'utilisateur veut un site/service précis
- "location" : cherche un lieu, un itinéraire, « où est X » (pas « où est mort »)
- "comparison" : « X vs Y », « X ou Y lequel est mieux »
- "news" : actualité récente demandée
- "general" : tout le reste

attrKey — vocabulaire fermé, choisis la clé la plus précise :
territoire: capital, currency, official_language, spoken_language, population, area, density, country, continent, anthem, flag, elevation, river, river_mouth, airport, calling_code, timezone, demonym, iso_code, tld, postal_code, subdivisions_count, location
gouvernance: head_of_state (président/roi dirigeant actuel), head_of_government (premier ministre), monarch, first_lady, mayor, governor, officeholder (« ministre de X », tout titulaire d'un poste nommé — mets le poste dans attribute)
organisation/œuvre: founder, ceo, headquarters, creator, author, composer, director, performer, owner, parent_org, employees, website, inception, dissolution, duration
personne: birth_date, death_date, birthplace, death_place, death_cause, resting_place, age, spouse, mother, father, siblings, children, nationality, height, weight, religion, party, team, awards, education, occupation, position_held, net_worth, notable_work
autre: definition (« c'est quoi »), other

Règles strictes:
- Ne devine jamais un fait : tu classifies la requête, tu ne réponds pas à la question.
- entity = l'entité dont PARLE la requête, pas l'attribut. « qui est le ministre des sports en guinée » → entity="Guinea", attrKey="officeholder", attribute="ministre des sports", entityType="country".
- « combien de provinces/régions/départements… » → attrKey="subdivisions_count", qtype="howmany".
- « dans quel pays/continent/région se trouve X » → entity=X, attrKey="country"|"continent"|"location".
- « c'est quoi X » / « what is X » → intent="definition", entity=X, entityType="concept" (le concept générique, jamais un sous-type).
- Si la requête est une simple série de mots-clés, intent="general" et entity=sujet principal.`;

function parse(raw: string): Understanding | null {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    const j = JSON.parse(cleaned) as Record<string, unknown>;
    if (typeof j.corrected !== "string" || !j.corrected.trim()) return null;
    const attrKey =
      typeof j.attrKey === "string" && VALID_ATTR_KEYS.has(j.attrKey)
        ? (j.attrKey as AttrKey)
        : "";
    return {
      corrected: j.corrected.trim().slice(0, 200),
      intent: VALID_INTENTS.has(j.intent as string) ? (j.intent as Understanding["intent"]) : "general",
      entity: typeof j.entity === "string" ? j.entity.trim().slice(0, 120) : "",
      attrKey,
      attribute: typeof j.attribute === "string" ? j.attribute.trim().slice(0, 120) : "",
      attributeEn: typeof j.attributeEn === "string" ? j.attributeEn.trim().slice(0, 120) : "",
      entityEn: typeof j.entityEn === "string" ? j.entityEn.trim().slice(0, 120) : "",
      entityType:
        typeof j.entityType === "string" && VALID_ENTITY_TYPES.has(j.entityType)
          ? (j.entityType as EntityType)
          : "",
      qtype: VALID_QTYPES.has(j.qtype as string) ? (j.qtype as QuestionType) : "what",
      expr: typeof j.expr === "string" ? j.expr.trim().slice(0, 80) : "",
      lang: typeof j.lang === "string" ? j.lang.trim().slice(0, 8) : "fr",
    };
  } catch {
    return null;
  }
}

/**
 * Compréhension LLM de la requête — null si pas de clé ou échec (le caller
 * retombe sur les règles synchrones). Résultat mis en cache 24 h : une même
 * requête ne paie la latence qu'une fois.
 */
export async function understandQuery(raw: string): Promise<Understanding | null> {
  const query = raw.trim().slice(0, 300);
  if (!query) return null;
  const apiKey = process.env.AYEBA_LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const cacheKey = `understand:${query.toLowerCase()}`;
  const cached = await cacheGet<Understanding>(cacheKey);
  if (cached) return cached;

  const baseUrl =
    process.env.AYEBA_LLM_BASE_URL?.replace(/\/$/, "") || "https://api.openai.com/v1";
  const model = process.env.AYEBA_LLM_MODEL || "gpt-4o-mini";

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        // Modèles à raisonnement (gpt-oss) : budget large — sinon le
        // raisonnement consomme tout et le JSON arrive vide. « low » suffit :
        // la tâche est de la classification, pas de la déduction profonde.
        max_tokens: 600,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: query },
        ],
      }),
      signal: AbortSignal.timeout(1400),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const u = parse(data.choices?.[0]?.message?.content ?? "");
    if (!u) return null;
    await cacheSet(cacheKey, u, 86400);
    return u;
  } catch {
    return null;
  }
}
