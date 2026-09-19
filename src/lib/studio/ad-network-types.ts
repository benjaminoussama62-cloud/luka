/**
 * Ayeba Ad Network - Enterprise Ad Server Architecture
 * Multi-platform distributed ad serving across Ayeba ecosystem
 */

export type NetworkDomain = "ayeba.app" | "omega-web.org" | "sombatekaonline.com" | "jemsa.net" | "tala.cd" | "to-tala.com";

export type AdFormat = "display" | "native" | "video" | "audio" | "interstitial" | "banner" | "feed" | "sponsored";

export type AdSize = "728x90" | "300x250" | "160x600" | "320x50" | "300x600" | "responsive" | "custom";

export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "rejected" | "suspended";

export type CampaignType = "brand_awareness" | "performance" | "retargeting" | "video" | "audio" | "native";

export type BiddingStrategy = "manual_cpc" | "maximize_clicks" | "maximize_impressions" | "target_cpa" | "target_roas";

export type TargetingOperator = "equals" | "contains" | "starts_with" | "regex" | "in_list" | "not_in_list";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "under_review";

export type PaymentStatus = "pending" | "processing" | "processed" | "completed" | "failed" | "refunded";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export type FrequencyCap = {
  impressions: number;
  period: "hour" | "day" | "week" | "month";
};

export type GeoTarget = {
  countries: string[];
  regions?: string[];
  cities?: string[];
  exclude?: boolean;
};

export type DeviceTarget = {
  deviceTypes: ("desktop" | "mobile" | "tablet")[];
  os?: string[];
  browsers?: string[];
  carrier?: string[];
};

export type AudienceSegment = {
  id: string;
  name: string;
  description: string;
  rules: AudienceRule[];
  size?: number;
  updatedAt: string;
};

export type AudienceRule = {
  field: "behavior" | "interest" | "demographic" | "custom";
  operator: TargetingOperator;
  value: string | string[] | number;
  timeframe?: string;
};

export type AdCreative = {
  id: string;
  campaignId: string;
  format: AdFormat;
  size: AdSize;
  title: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  landingUrl: string;
  displayUrl: string;
  trackingPixels: {
    impression?: string;
    click?: string;
    viewComplete?: string;
  };
  status: ApprovalStatus;
  compliance: {
    isValid: boolean;
    rejectedReason?: string;
    autoApproved: boolean;
    reviewedAt?: string;
    reviewedBy?: string;
  };
  performance: {
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
    cost: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type Campaign = {
  id: string;
  advertiserId: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  budget: {
    daily: number;
    total: number;
    spent: number;
    remaining: number;
  };
  bidding: {
    strategy: BiddingStrategy;
    maxCpc?: number;
    targetCpa?: number;
    targetRoas?: number;
  };
  schedule: {
    startDate: string;
    endDate: string;
    timeZone: string;
    hoursOfDay?: number[];
    daysOfWeek?: number[];
  };
  targeting: {
    geo?: GeoTarget;
    device?: DeviceTarget;
    audienceSegments?: string[];
    keywords?: string[];
    placements?: PlacementTarget[];
    contextual?: {
      categories: string[];
      safeSearch: boolean;
    };
    frequencyCap?: FrequencyCap;
  };
  creatives: AdCreative[];
  pacing: {
    type: "standard" | "accelerated" | "asap";
    deliverOverTimeframe?: number;
  };
  delivery: {
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
    cost: number;
    avgCpc: number;
    avgCpm: number;
    conversionRate: number;
    roas: number;
  };
  geo_targeting?: any;
  device_targeting?: any;
  audience_segments?: any;
  keywords?: any;
  placements?: any;
  contextual_targeting?: any;
  frequency_cap?: any;
  hours_of_day?: any;
  days_of_week?: any;
  ai_recommendations?: any;
  performanceInsights?: any;
  settings: {
    autoOptimize: boolean;
    rotation: "optimize" | "rotate_evenly";
    excludeCompetitors: boolean;
  };
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  endedAt?: string;
};

export type PlacementTarget = {
  domain: NetworkDomain;
  position: "header" | "sidebar" | "content" | "footer" | "popup" | "interstitial";
  format: AdFormat[];
  size: AdSize[];
};

export type PublisherSite = {
  id: string;
  publisherId: string;
  domain: string;
  status: "active" | "pending" | "suspended" | "rejected";
  verification: {
    status: "verified" | "pending" | "failed";
    method: "dns" | "meta" | "file";
    verifiedAt?: string;
  };
  categories: string[];
  traffic: {
    dailyImpressions: number;
    uniqueVisitors: number;
    avgSessionDuration: number;
    bounceRate: number;
  };
  revenueShare: {
    rate: number;
    tier: "standard" | "premium" | "exclusive";
  };
  placements: SitePlacement[];
  compliance: {
    adPolicyCompliant: boolean;
    contentQuality: "high" | "medium" | "low";
    lastAuditAt: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type SitePlacement = {
  id: string;
  siteId: string;
  name: string;
  slot: string;
  format: AdFormat;
  size: AdSize;
  position: string;
  status: "active" | "inactive";
  fillRate: number;
  ecpm: number;
  revenue: number;
  settings: {
    competitiveExclusion: boolean;
    categoryBlocking: string[];
    minCpm?: number;
  };
};

export type AdRequest = {
  requestId: string;
  timestamp: string;
  domain: NetworkDomain;
  placementId: string;
  format: AdFormat;
  size: AdSize;
  userAgent: string;
  ip: string;
  userId?: string;
  sessionId?: string;
  pageUrl: string;
  referrer?: string;
  context: {
    keywords?: string[];
    categories?: string[];
    content?: string;
  };
  targeting: {
    geo?: {
      country: string;
      region?: string;
      city?: string;
    };
    device?: {
      type: "desktop" | "mobile" | "tablet";
      os: string;
      browser: string;
    };
    audience?: string[];
  };
  pricing?: {
    floorPrice: number;
    winningPrice: number;
    currency: string;
  };
};

export type AdResponse = {
  requestId: string;
  ad?: {
    creativeId: string;
    campaignId: string;
    format: AdFormat;
    size: AdSize;
    creative: {
      title: string;
      description: string;
      imageUrl?: string;
      videoUrl?: string;
      landingUrl: string;
      displayUrl: string;
    };
    tracking: {
      impressionUrl: string;
      clickUrl: string;
      viewThroughUrl?: string;
    };
    bid: {
      price: number;
      currency: string;
      auctionId: string;
    };
  };
  noFillReason?: "no_inventory" | "blocked" | "below_floor" | "targeting_mismatch" | "budget_exhausted";
  pricing: {
    floorPrice: number;
    winningPrice: number;
    currency: string;
  };
  latency: number;
};

export type AuctionResult = {
  auctionId: string;
  requestId: string;
  timestamp: string;
  bids: AuctionBid[];
  winner?: {
    campaignId: string;
    creativeId: string;
    price: number;
    secondPrice: number;
  };
  clearingPrice: number;
  latency: number;
};

export type AuctionBid = {
  campaignId: string;
  creativeId: string;
  bidPrice: number;
  bidStrategy: BiddingStrategy;
  targetingScore: number;
  qualityScore: number;
  bidAdjustments: {
    geo?: number;
    device?: number;
    audience?: number;
    time?: number;
  };
  finalPrice: number;
};

export type PerformanceReport = {
  period: {
    start: string;
    end: string;
  };
  campaignId?: string;
  publisherId?: string;
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
    conversionRate: number;
    cost: number;
    revenue: number;
    profit: number;
    roi: number;
    avgCpc: number;
    avgCpm: number;
    avgCpa: number;
  };
  breakdown: {
    byDay: DailyMetrics[];
    byGeo: GeoMetrics[];
    byDevice: DeviceMetrics[];
    byCreative: CreativeMetrics[];
  };
};

export type DailyMetrics = {
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  revenue: number;
};

export type GeoMetrics = {
  country: string;
  impressions: number;
  clicks: number;
  cost: number;
  revenue: number;
};

export type DeviceMetrics = {
  device: string;
  impressions: number;
  clicks: number;
  cost: number;
  revenue: number;
};

export type CreativeMetrics = {
  creativeId: string;
  creativeName: string;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cost: number;
};

export type Advertiser = {
  id: string;
  userId: string;
  companyName: string;
  status: "active" | "pending" | "suspended";
  verification: {
    status: "verified" | "pending" | "failed";
    documents: VerificationDocument[];
    verifiedAt?: string;
  };
  billing: {
    currency: string;
    taxId?: string;
    paymentMethod: PaymentMethod[];
    creditLimit: number;
    currentBalance: number;
    availableCredit: number;
  };
  settings: {
    autoRecharge: boolean;
    rechargeAmount: number;
    lowBalanceThreshold: number;
    notifications: boolean;
  };
  compliance: {
    policyAcceptance: string;
    violationCount: number;
    lastWarningAt?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type Publisher = {
  id: string;
  userId: string;
  companyName: string;
  status: "active" | "pending" | "suspended";
  verification: {
    status: "verified" | "pending" | "failed";
    documents: VerificationDocument[];
    verifiedAt?: string;
  };
  payout: {
    currency: string;
    method: PayoutMethod;
    taxId?: string;
    minimumPayout: number;
    balance: number;
    pendingBalance: number;
    lifetimeEarnings: number;
  };
  settings: {
    autoPayout: boolean;
    payoutFrequency: "weekly" | "biweekly" | "monthly";
    payoutDay?: number;
    notifications: boolean;
  };
  compliance: {
    policyAcceptance: string;
    violationCount: number;
    lastWarningAt?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type VerificationDocument = {
  id: string;
  type: "business_license" | "tax_id" | "identity" | "address_proof" | "bank_statement";
  status: "pending" | "approved" | "rejected";
  documentUrl: string;
  uploadedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
};

export type PaymentMethod = {
  id: string;
  type: "credit_card" | "bank_transfer" | "paypal" | "mobile_money";
  details: string;
  isDefault: boolean;
  status: "active" | "expired" | "failed";
  addedAt: string;
};

export type PayoutMethod = {
  id: string;
  type: "bank_transfer" | "paypal" | "mobile_money";
  details: string;
  currency: string;
  status: "active" | "inactive";
  addedAt: string;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  type: "advertiser" | "publisher";
  userId: string;
  entityId: string;
  period: {
    start: string;
    end: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string;
  paymentMethod?: string;
  downloadUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  metadata?: Record<string, unknown>;
};

export type Transaction = {
  id: string;
  type: "payment" | "payout" | "refund" | "adjustment";
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string;
  reference?: string;
  description: string;
  relatedEntityId?: string;
  relatedEntityType?: "campaign" | "publisher_site" | "invoice";
  createdAt: string;
  processedAt?: string;
  failedReason?: string;
};

export type FraudDetection = {
  requestId: string;
  timestamp: string;
  score: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  signals: FraudSignal[];
  action: "allow" | "block" | "flag" | "rate_limit";
  reason?: string;
};

export type FraudSignal = {
  type: "ip_suspicious" | "user_agent_anomaly" | "click_pattern" | "velocity" | "proxy" | "bot" | "cookie_stuffing";
  severity: number;
  description: string;
  value: string | number;
};

export type NetworkHealth = {
  timestamp: string;
  domains: NetworkDomainStatus[];
  overall: {
    totalImpressions: number;
    totalClicks: number;
    totalRevenue: number;
    avgFillRate: number;
    avgLatency: number;
    activeCampaigns: number;
    activePublishers: number;
  };
};

export type NetworkDomainStatus = {
  domain: NetworkDomain;
  status: "healthy" | "degraded" | "down";
  fillRate: number;
  avgLatency: number;
  impressions: number;
  revenue: number;
  activePlacements: number;
  lastHealthCheck: string;
};

export type CrossDomainTracking = {
  userId: string;
  sessionId: string;
  domains: NetworkDomain[];
  timeline: TrackingEvent[];
  profile: UserProfile;
};

export type TrackingEvent = {
  domain: NetworkDomain;
  timestamp: string;
  type: "impression" | "click" | "conversion" | "page_view";
  url: string;
  referrer?: string;
  campaignId?: string;
  creativeId?: string;
  placementId?: string;
};

export type UserProfile = {
  segments: string[];
  interests: string[];
  demographics: {
    ageRange?: string;
    gender?: string;
    location?: string;
  };
  behavior: {
    totalSessions: number;
    avgSessionDuration: number;
    conversionRate: number;
    preferredCategories: string[];
  };
  lastUpdated: string;
};
