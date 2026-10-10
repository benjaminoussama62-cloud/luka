import { FR_STOPWORDS, expandToken } from "./query-expansion";

/**
 * Construction des requêtes FTS5 — partagée entre l'index web (search_fts)
 * et l'index Ayebi (ayebi_fts), chemins sync et async.
 *
 * - `and` : tous les tokens en groupes OR de variantes (« président » →
 *   (président OR president OR dirigeant)) reliés par AND explicite
 *   (FTS5 n'accepte pas la juxtaposition après parenthèse) →
 *   précision maximale avec tolérance aux synonymes/abréviations.
 *   Les mots-outils français sont exclus : « le nom de la banque » ne doit pas
 *   exiger « le » ET « nom » ET « de » dans le même doc (bug de rappel).
 *   Les tokens sont découpés sur la ponctuation (unicode61 tokenize pareil) :
 *   « l'hôpital » donnait « "l'hopital" » = token « l » AND « hopital » →
 *   presque aucun doc ne contient le token « l » → SERP vide.
 * - `or` : tokens + variantes préfixés reliés par OR → rappel quand l'AND
 *   strict est vide (requêtes longues, mots tronqués « kinsha », fautes).
 *   bm25 retrie.
 */
export function queryTokens(query: string): string[] {
  const raw = query
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 2)
    .slice(0, 16);
  const content = raw.filter((t) => !FR_STOPWORDS.has(t));
  return content.length ? content : raw;
}

/** Toutes les variantes d'un token, dédupliquées (token inclus en tête). */
export function tokenVariants(token: string): string[] {
  return [...new Set([token, ...expandToken(token)])];
}

export function ftsMatchQueries(query: string): { and: string; or: string } {
  const tokens = queryTokens(query);

  const and = tokens
    .map((t) => {
      const variants = tokenVariants(t).map((v) => `"${v}"`);
      return variants.length === 1 ? variants[0] : `(${variants.join(" OR ")})`;
    })
    .join(" AND ");

  const or = [...new Set(tokens.flatMap(tokenVariants))].map((t) => `${t}*`).join(" OR ");

  return { and, or };
}
