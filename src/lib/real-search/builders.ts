import type { AyebiArticle } from "../ayebi/types";
import type { KnowledgePanel, SearchResult } from "../types";

export function ayebiRichSnippet(article: AyebiArticle, max = 360): string {
  const lead = article.sections?.[0]?.paragraphs?.[0];
  const text = lead ? `${article.summary} ${lead}` : article.summary;
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

export function ayebiKnowledgePanel(article: AyebiArticle): KnowledgePanel {
  return {
    title: article.title,
    subtitle: article.subtitle,
    summary: ayebiRichSnippet(article, 520),
    facts: [
      ...article.facts.slice(0, 5),
      { label: "Lire sur Ayebi", value: `/ayebi/${article.slug}` },
    ],
    sources: ["ayebi"],
    image: article.image,
  };
}

export function officialSiteForAyebi(slug: string): string | undefined {
  const map: Record<string, string> = {
    jemsa: "https://jemsa.net",
    tala: "https://to-tala.com",
    sombateka: "https://sombatekaonline.com",
    omega: "https://omega-web.org",
    devalpha: "https://devalpha1.com",
    ayeba: "https://ayeba.app",
  };
  return map[slug];
}

export function buildSynthesis(
  query: string,
  knowledge: KnowledgePanel | undefined,
  results: SearchResult[],
  news: SearchResult[],
): string {
  if (knowledge?.summary) {
    const text = knowledge.summary.replace(/\s+/g, " ").trim();
    const cut = text.length > 420 ? `${text.slice(0, 417).replace(/\s+\S*$/, "")}…` : text;
    return cut;
  }

  const pieces = results
    .slice(0, 3)
    .map((r) => r.snippet.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 40);

  if (pieces.length >= 2) {
    return `${pieces[0]} ${pieces[1]}`;
  }
  if (pieces[0]) return pieces[0];
  if (news[0]?.snippet) return news[0].snippet.replace(/\s+/g, " ").trim();
  return `Peu de contenu fiable trouvé pour « ${query} ». Reformulez ou élargissez la requête.`;
}

export function buildQuestions(
  query: string,
  knowledge: KnowledgePanel | undefined,
  results: SearchResult[],
  news: SearchResult[],
  congo: boolean,
  ayebiArticle?: AyebiArticle,
): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];

  if (ayebiArticle?.sections?.length) {
    for (const sec of ayebiArticle.sections.slice(0, 2)) {
      const para = sec.paragraphs[0];
      if (para) {
        out.push({
          q: sec.heading,
          a: para.slice(0, 340),
        });
      }
    }
  }

  if (knowledge?.summary && !out.length) {
    out.push({
      q: `Que sait-on de ${knowledge.title} ?`,
      a: knowledge.summary.slice(0, 320),
    });
  } else if (results[0] && !out.length) {
    out.push({
      q: `Que disent les sources principales ?`,
      a: results[0].snippet,
    });
  }

  if (news[0]) {
    out.push({
      q: `Quels faits récents ressortent ?`,
      a: `${news[0].title}. ${news[0].snippet}`.slice(0, 320),
    });
  } else if (results[1] && out.length < 3) {
    out.push({
      q: `Site officiel et compléments`,
      a: results[1].snippet,
    });
  }

  if (congo && out.length < 3) {
    out.push({
      q: `Quel est le lien avec la RDC ou l'Afrique centrale ?`,
      a:
        results.find((r) => r.congoRelevant)?.snippet ??
        "Les sources régionales et .cd sont relevées quand elles existent ; le web mondial reste visible.",
    });
  }

  return out.slice(0, 4);
}
