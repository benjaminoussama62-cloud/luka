export type AyebiReference = {
  id: number;
  url: string;
  title: string;
  author?: string;
  date?: string;
  publisher?: string;
};

export type AyebiCategory =
  | "personnalité"
  | "lieu"
  | "institution"
  | "culture"
  | "sport"
  | "économie";

export type AyebiSubSection = {
  heading: string;
  paragraphs: string[];
};

export type AyebiSection = {
  heading: string;
  paragraphs: string[];
  subsections?: AyebiSubSection[];
};

export type AyebiTimelineEvent = {
  date: string;
  event: string;
};

export type AyebiGalleryImage = {
  url: string;
  caption: string;
  credit?: string;
};

export type AyebiCoordinates = {
  lat: number;
  lon: number;
  label?: string;
};

export type AyebiQuality = "ébauche" | "bon article" | "article de qualité" | "standard";

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
  gallery?: AyebiGalleryImage[];
  coordinates?: AyebiCoordinates;
  tags: string[];
  relatedSlugs?: string[];
  stub?: boolean;
  quality?: AyebiQuality;
  references?: AyebiReference[];
  portalId?: string;
  navboxSlugs?: string[];
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

/** @deprecated */
export function enrichShallow(article: AyebiArticle): AyebiArticle {
  return article;
}
