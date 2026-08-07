export type SearchTab =
  | "web"
  | "images"
  | "videos"
  | "news"
  | "maps"
  | "shopping"
  | "community";

export type LangCode = "fr" | "ln" | "sw" | "en";

export type AlgorithmSliders = {
  audience: number;
  authority: number;
  locality: number;
};

export type TrustSignals = {
  credibility: number;
  clickbaitRisk: number;
  independentVerification: number;
  humanAuthoredLikelihood: number;
};

export type ConflictOfInterest = {
  detected: boolean;
  category: "pharma" | "finance" | "politique" | "none";
  owner?: string;
  funder?: string;
  detail?: string;
};

export type SiteLink = {
  title: string;
  url: string;
};

export type SearchResult = {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  favicon?: string;
  publishedAt?: string;
  lang: "fr" | "ln" | "sw" | "kg" | "en";
  sourceType: "web" | "news" | "academic" | "gov" | "blog" | "wiki" | "tech" | "local" | "shop";
  isSponsored?: boolean;
  suspectedAiSpam?: boolean;
  trust: TrustSignals;
  conflict: ConflictOfInterest;
  congoRelevant?: boolean;
  region?: "global" | "africa" | "rdc" | "europe" | "americas" | "asia";
  keywords: string[];
  rankScore?: number;
  sitelinks?: SiteLink[];
  rating?: number;
  price?: string;
  address?: string;
};

export type MediaResult = {
  id: string;
  title: string;
  url: string;
  thumb: string;
  source: string;
  type: "image" | "video";
  duration?: string;
};

export type MapPlace = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  address: string;
  url: string;
};

export type ShopItem = {
  id: string;
  title: string;
  price: string;
  currency: string;
  store: string;
  url: string;
  thumb?: string;
  rating?: number;
};

export type CommunityPost = {
  id: string;
  platform: "reddit" | "discord" | "forum" | "x" | "tiktok" | "youtube";
  title: string;
  excerpt: string;
  author: string;
  url: string;
  trustScore: number;
  engagement: number;
  postedAt: string;
};

export type CanvasTable = {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
};

export type DeepResearchStep = {
  id: string;
  label: string;
  status: "pending" | "running" | "done";
  sources?: string[];
};

export type DeepResearchReport = {
  title: string;
  abstract: string;
  sections: { heading: string; body: string; citations: string[] }[];
  sources: { title: string; url: string; credibility: number }[];
  generatedAt: string;
};

export type CodeExecution = {
  language: "javascript" | "python";
  code: string;
  output: string;
  error?: string;
  verified: boolean;
};

export type PodcastSegment = {
  speaker: "A" | "B";
  text: string;
};

export type KnowledgePanel = {
  title: string;
  subtitle: string;
  summary: string;
  facts: { label: string; value: string }[];
  sources: string[];
  image?: string;
};

export type FeaturedSnippet = {
  title: string;
  text: string;
  url: string;
  domain: string;
};

export type InstantAnswerKind =
  | "fx"
  | "fuel"
  | "weather"
  | "time"
  | "unit"
  | "calc"
  | "definition"
  | "population";

export type InstantAnswer = {
  kind: InstantAnswerKind;
  title: string;
  lines: { label: string; value: string }[];
  footnote?: string;
  marketQuoteId?: string;
  defaultAmount?: string;
};

export type SearchResponse = {
  query: string;
  correctedQuery?: string;
  approxResults: number;
  results: SearchResult[];
  images: MediaResult[];
  videos: MediaResult[];
  news: SearchResult[];
  maps: MapPlace[];
  shopping: ShopItem[];
  community: CommunityPost[];
  related: string[];
  peopleAlsoAsk: { q: string; a: string }[];
  knowledge?: KnowledgePanel;
  featuredSnippet?: FeaturedSnippet;
  instantAnswer?: InstantAnswer;
  instantAnswers?: InstantAnswer[];
  aiSummary: string;
  opposingViews?: { title: string; url: string; stance: string; snippet: string }[];
  isSensitiveTopic: boolean;
  canvas?: CanvasTable[];
  code?: CodeExecution;
  podcast?: PodcastSegment[];
};
