import { fetchWikiCorpus } from "./fetch-wiki";
import { wikiTitleForArticle } from "./wiki-sources";
import type { AyebiArticle } from "./types";

export function isDeepArticle(article: AyebiArticle): boolean {
  const paras = (article.sections ?? []).reduce((n, s) => n + s.paragraphs.length, 0);
  return paras >= 8 || ((article.timeline?.length ?? 0) >= 4 && paras >= 4);
}

function mergeFacts(
  local: AyebiArticle["facts"],
  description?: string,
): AyebiArticle["facts"] {
  const facts = [...local];
  if (description && !facts.some((f) => f.value === description)) {
    facts.unshift({ label: "En bref", value: description });
  }
  if (!facts.some((f) => f.label === "Corpus")) {
    facts.push({ label: "Corpus", value: "Sources ouvertes vérifiées · Ayebi" });
  }
  return facts.slice(0, 12);
}

/** Enrichit une fiche courte avec du contenu encyclopédique réel (sources ouvertes). */
export async function enrichArticleFromSources(base: AyebiArticle): Promise<AyebiArticle> {
  if (isDeepArticle(base)) return base;

  const wikiTitle = wikiTitleForArticle(base);
  const corpus = await fetchWikiCorpus(wikiTitle, base.title);

  if (!corpus || corpus.sections.length === 0) {
    return {
      ...base,
      facts: mergeFacts(base.facts),
    };
  }

  const localIntro = base.sections?.[0]?.paragraphs ?? base.body;
  const wikiSections = corpus.sections;

  const sections =
    localIntro.length && localIntro[0] !== wikiSections[0]?.paragraphs[0]
      ? [
          {
            heading: "Contexte RDC",
            paragraphs: [base.summary, ...localIntro].filter(Boolean).slice(0, 3),
          },
          ...wikiSections,
        ]
      : wikiSections;

  return {
    ...base,
    summary: corpus.summary.length > base.summary.length ? corpus.summary : base.summary,
    sections: sections.slice(0, 10),
    facts: mergeFacts(base.facts, corpus.description),
    image: base.image ?? corpus.image,
  };
}

export async function getEnrichedArticle(slug: string, base: AyebiArticle | undefined): Promise<AyebiArticle | undefined> {
  if (!base) return undefined;
  return enrichArticleFromSources(base);
}
