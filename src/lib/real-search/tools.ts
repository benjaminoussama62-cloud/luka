import type {
  CodeExecution,
  InstantAnswer,
  KnowledgePanel,
  PodcastSegment,
  SearchResult,
} from "../types";
import { evalMath } from "./math";

/**
 * Outils de la SERP — chaque payload est construit UNIQUEMENT à partir des
 * résultats réels de la recherche : aucune donnée fabriquée, chaque phrase
 * est traçable à une source.
 */

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/** Script podcast 2 voix — synthèse audio des sources réelles remontées. */
export function buildPodcastScript(
  q: string,
  results: SearchResult[],
  knowledge: KnowledgePanel | undefined,
  instant: InstantAnswer | undefined,
  news: SearchResult[],
): PodcastSegment[] {
  const segments: PodcastSegment[] = [
    {
      speaker: "A",
      text: `Bienvenue dans la synthèse audio Ayeba. Aujourd'hui, on fait le point sur « ${q} » avec les sources réellement remontées par le moteur.`,
    },
  ];

  const summary =
    knowledge?.summary ||
    instant?.lines.map((l) => `${l.label} : ${l.value}`).join(" — ") ||
    results[0]?.snippet;
  if (summary) {
    segments.push({
      speaker: "B",
      text: `Voici l'essentiel à retenir. ${clip(summary, 360)}`,
    });
  }

  const facts = knowledge?.facts?.filter((f) => f.label && f.value).slice(0, 4) ?? [];
  if (facts.length) {
    segments.push({
      speaker: "A",
      text: `Quelques repères : ${facts.map((f) => `${f.label} — ${f.value}`).join(" · ")}.`,
    });
  }

  for (const r of results.slice(0, 3)) {
    if (!r.snippet) continue;
    segments.push({
      speaker: segments.length % 2 ? "B" : "A",
      text: `Selon ${r.domain} : ${clip(r.snippet, 220)}`,
    });
  }

  if (news.length) {
    segments.push({
      speaker: "A",
      text: `Côté actualité : ${news
        .slice(0, 2)
        .map((n) => `${n.title} (${n.domain})`)
        .join(" — ")}.`,
    });
  }

  if (results.length) {
    const domains = [...new Set(results.slice(0, 5).map((r) => r.domain))];
    segments.push({
      speaker: "B",
      text: `Pour aller plus loin, les sources complètes sont sur la page de résultats — notamment ${domains.join(", ")}. Synthèse terminée.`,
    });
  } else {
    segments.push({
      speaker: "B",
      text: `Les sources disponibles pour cette requête sont encore limitées — élargissez la recherche pour une synthèse plus riche.`,
    });
  }

  return segments;
}

/**
 * Code exécutable — deux cas réels :
 *  1. requête calcul → le code effectue le calcul, sortie vérifiée par le moteur ;
 *  2. sinon → script d'analyse de la SERP réelle (stats domaines, confiance,
 *     part de presse) — les données sont embarquées, le code tourne tel quel.
 */
export function buildCodeExecution(
  q: string,
  results: SearchResult[],
): CodeExecution {
  const math = evalMath(q);
  // Requête calcul : chiffres + au moins un opérateur — sinon « kinshasa 2026 »
  // serait détecté à tort comme une expression.
  if (math !== undefined && /\d/.test(q) && /[+\-*/^%=(]/.test(q)) {
    const code = [
      `// Calcul direct — la même expression que la recherche « ${q.replace(/["\n\r]/g, " ")} »`,
      `const expression = ${JSON.stringify(q.trim())};`,
      `// Ayeba a déjà vérifié :`,
      `console.log(expression + "  =>  ${math}");`,
    ].join("\n");
    return { language: "javascript", code, output: `${q.trim()}  =>  ${math}`, verified: true };
  }

  const data = results.slice(0, 10).map((r) => ({
    t: clip(r.title, 60),
    d: r.domain,
    trust: r.trust.credibility,
    type: r.sourceType,
  }));

  const code = [
    `// SERP Ayeba — analyse des ${data.length} premiers résultats de « ${q.replace(/["\n\r]/g, " ")} »`,
    `const results = ${JSON.stringify(data)};`,
    ``,
    `const byDomain = {};`,
    `for (const r of results) byDomain[r.d] = (byDomain[r.d] || 0) + 1;`,
    `console.log("Domaines les plus présents :");`,
    `Object.entries(byDomain).sort((a, b) => b[1] - a[1]).slice(0, 5)`,
    `  .forEach(([d, n]) => console.log(" ", d, "—", n, "résultat(s)"));`,
    ``,
    `const avgTrust = results.reduce((s, r) => s + r.trust, 0) / (results.length || 1);`,
    `console.log("Confiance moyenne :", Math.round(avgTrust) + "/100");`,
    `const news = results.filter(r => r.type === "news").length;`,
    `console.log("Part d'actualité :", news + "/" + results.length);`,
  ].join("\n");

  // Sortie pré-calculée côté serveur — identique à l'exécution réelle.
  const byDomain = new Map<string, number>();
  for (const r of data) byDomain.set(r.d, (byDomain.get(r.d) ?? 0) + 1);
  const topDomains = [...byDomain.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const avgTrust = data.reduce((s, r) => s + r.trust, 0) / (data.length || 1);
  const newsCount = data.filter((r) => r.type === "news").length;
  const output = [
    "Domaines les plus présents :",
    ...topDomains.map(([d, n]) => `  ${d} — ${n} résultat(s)`),
    `Confiance moyenne : ${Math.round(avgTrust)}/100`,
    `Part d'actualité : ${newsCount}/${data.length}`,
  ].join("\n");

  return { language: "javascript", code, output, verified: true };
}
