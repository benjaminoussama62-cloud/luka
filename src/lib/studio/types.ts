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

export type TraceOverview = {
  domain: string;
  traceKey: string;
  snippetInstalled: boolean;
  sessions7d: number;
  pageviews7d: number;
  uniquePaths7d: number;
  avgPagesPerSession: number;
  searchReferrals7d: number;
  topReferrer: string | null;
};

export type TracePageRow = {
  path: string;
  pageviews: number;
  sessions: number;
  avgTimeSec: number | null;
};

export type TraceReferrerRow = {
  referrer: string;
  sessions: number;
  pageviews: number;
};

export type YieldPlacement = {
  id: string;
  label: string;
  slot: string;
  enabled: boolean;
  format: "native" | "banner" | "feed";
  impressions30d: number;
  clicks30d: number;
  ctr30d: number;
  revenue30dCdf: number;
};

export type YieldOverview = {
  domain: string;
  enabled: boolean;
  impressions30d: number;
  clicks30d: number;
  ctr30d: number;
  revenue30dCdf: number;
  ecpmCdf: number;
  placements: YieldPlacement[];
};

export type VelocityFinding = {
  id: string;
  severity: "critical" | "warn" | "info";
  title: string;
  detail: string;
  savingsMs?: number;
};

export type VelocityAudit = {
  id: number;
  url: string;
  score: number;
  ttfbMs: number;
  htmlBytes: number;
  findings: VelocityFinding[];
  createdAt: string;
};

export type VelocityOverview = {
  domain: string;
  latestScore: number | null;
  latestTtfbMs: number | null;
  audits: VelocityAudit[];
  actionPlan: VelocityFinding[];
};

export type AetherAction = {
  id: string;
  module: "radar" | "trace" | "yield" | "velocity";
  impact: "high" | "medium";
  title: string;
  detail: string;
  href: string;
};

export type AetherOverview = {
  domain: string;
  headline: string;
  actions: AetherAction[];
  signals: { label: string; value: string }[];
};
