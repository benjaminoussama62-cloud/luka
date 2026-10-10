/**
 * Construction des requêtes FTS5 — partagée entre l'index web (search_fts)
 * et l'index Ayebi (ayebi_fts), chemins sync et async.
 *
 * - `and` : tous les tokens en phrases citées → précision maximale.
 *   Les tokens sont découpés sur la ponctuation (unicode61 tokenize pareil) :
 *   « l'hôpital » donnait « "l'hopital" » = token « l » AND « hopital » →
 *   presque aucun doc ne contient le token « l » → SERP vide (bug de rappel).
 * - `or` : tokens préfixés reliés par OR → rappel quand l'AND strict est vide
 *   (requêtes longues, mots tronqués « kinsha », fautes légères). bm25 retrie.
 */
export function ftsMatchQueries(query: string): { and: string; or: string } {
  const tokens = query
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 16);

  const and = tokens.map((t) => `"${t}"`).join(" ");
  const or = tokens.map((t) => `${t}*`).join(" OR ");
  return { and, or };
}
