export type StudioSiteStatus = "pending" | "verified";

export type StudioSite = {
  id: string;
  userId: string;
  domain: string;
  displayName: string;
  sitemapUrl: string;
  status: StudioSiteStatus;
  verifyToken: string;
  verifiedAt: string | null;
  createdAt: string;
};

export type RadarOverview = {
  domain: string;
  indexedPages: number;
  submittedUrls: number;
  coveragePct: number;
  clicks7d: number;
  impressions7d: number;
  ctr7d: number;
  avgPosition7d: number | null;
  queuePending: number;
  queueFailed: number;
  alerts: RadarAlert[];
  nextAction: { title: string; detail: string; href?: string };
};

export type RadarAlert = {
  id: string;
  severity: "info" | "warn" | "critical";
  title: string;
  detail: string;
};

export type RadarQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number | null;
};

export type RadarPageRow = {
  url: string;
  title: string;
  clicks: number;
  impressions: number;
  ctr: number;
  indexed: boolean;
  crawledAt: string | null;
};

export type RadarInspectResult = {
  url: string;
  indexed: boolean;
  title: string | null;
  snippet: string | null;
  domain: string | null;
  crawledAt: string | null;
  inQueue: boolean;
  queueStatus: string | null;
  clicks30d: number;
  impressions30d: number;
};
