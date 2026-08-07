export type AyebiCategory =
  | "personnalité"
  | "lieu"
  | "institution"
  | "culture"
  | "sport"
  | "économie";

export type AyebiSection = {
  heading: string;
  paragraphs: string[];
};

export type AyebiTimelineEvent = {
  date: string;
  event: string;
};

export type AyebiArticle = {
  slug: string;
  title: string;
  subtitle: string;
  category: AyebiCategory;
  summary: string;
  /** @deprecated utiliser sections */
  body: string[];
  sections?: AyebiSection[];
  timeline?: AyebiTimelineEvent[];
  facts: { label: string; value: string }[];
  image?: string;
  tags: string[];
  relatedSlugs?: string[];
};

export function ayebi(
  slug: string,
  title: string,
  subtitle: string,
  category: AyebiCategory,
  summary: string,
  body: string[],
  facts: { label: string; value: string }[],
  tags: string[],
): AyebiArticle {
  return {
    slug,
    title,
    subtitle,
    category,
    summary,
    body,
    sections: body.length
      ? [{ heading: "Article", paragraphs: body }]
      : undefined,
    facts,
    tags,
  };
}

/** @deprecated — l'enrichissement live remplace le remplissage générique */
export function enrichShallow(article: AyebiArticle): AyebiArticle {
  return article;
}
