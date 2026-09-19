/**
 * Ayeba Studio Enterprise Database Schema
 * Multi-tenant, scalable architecture for high-volume ad serving
 */

import type { AyebaDatabase } from "../storage/database";

export const AYEBA_STUDIO_SCHEMA = `
-- ADVERTISER MANAGEMENT
CREATE TABLE IF NOT EXISTS advertisers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verification_documents TEXT NOT NULL DEFAULT '[]',
  verified_at TEXT,
  billing_currency TEXT NOT NULL DEFAULT 'CDF',
  tax_id TEXT,
  payment_methods TEXT NOT NULL DEFAULT '[]',
  credit_limit REAL NOT NULL DEFAULT 0,
  current_balance REAL NOT NULL DEFAULT 0,
  available_credit REAL NOT NULL DEFAULT 0,
  auto_recharge INTEGER NOT NULL DEFAULT 0,
  recharge_amount REAL NOT NULL DEFAULT 0,
  low_balance_threshold REAL NOT NULL DEFAULT 0,
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  policy_acceptance TEXT,
  violation_count INTEGER NOT NULL DEFAULT 0,
  last_warning_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_advertisers_user ON advertisers(user_id);
CREATE INDEX IF NOT EXISTS idx_advertisers_status ON advertisers(status);

-- PUBLISHER MANAGEMENT
CREATE TABLE IF NOT EXISTS publishers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verification_documents TEXT NOT NULL DEFAULT '[]',
  verified_at TEXT,
  payout_currency TEXT NOT NULL DEFAULT 'CDF',
  payout_method TEXT NOT NULL DEFAULT 'bank_transfer',
  payout_details TEXT NOT NULL DEFAULT '{}',
  tax_id TEXT,
  minimum_payout REAL NOT NULL DEFAULT 50000,
  balance REAL NOT NULL DEFAULT 0,
  pending_balance REAL NOT NULL DEFAULT 0,
  lifetime_earnings REAL NOT NULL DEFAULT 0,
  auto_payout INTEGER NOT NULL DEFAULT 0,
  payout_frequency TEXT NOT NULL DEFAULT 'monthly',
  payout_day INTEGER,
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  policy_acceptance TEXT,
  violation_count INTEGER NOT NULL DEFAULT 0,
  last_warning_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_publishers_user ON publishers(user_id);
CREATE INDEX IF NOT EXISTS idx_publishers_status ON publishers(status);

-- PUBLISHER SITES
CREATE TABLE IF NOT EXISTS publisher_sites (
  id TEXT PRIMARY KEY,
  publisher_id TEXT NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verification_method TEXT,
  verified_at TEXT,
  categories TEXT NOT NULL DEFAULT '[]',
  daily_impressions INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  avg_session_duration REAL NOT NULL DEFAULT 0,
  bounce_rate REAL NOT NULL DEFAULT 0,
  revenue_share_rate REAL NOT NULL DEFAULT 0.7,
  revenue_tier TEXT NOT NULL DEFAULT 'standard',
  ad_policy_compliant INTEGER NOT NULL DEFAULT 1,
  content_quality TEXT NOT NULL DEFAULT 'medium',
  last_audit_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(publisher_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_publisher_sites_pub ON publisher_sites(publisher_id);
CREATE INDEX IF NOT EXISTS idx_publisher_sites_domain ON publisher_sites(domain);
CREATE INDEX IF NOT EXISTS idx_publisher_sites_status ON publisher_sites(status);

-- SITE PLACEMENTS
CREATE TABLE IF NOT EXISTS site_placements (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES publisher_sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slot TEXT NOT NULL,
  format TEXT NOT NULL,
  size TEXT NOT NULL,
  position TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  fill_rate REAL NOT NULL DEFAULT 0,
  ecpm REAL NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  competitive_exclusion INTEGER NOT NULL DEFAULT 0,
  category_blocking TEXT NOT NULL DEFAULT '[]',
  min_cpm REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_site_placements_site ON site_placements(site_id);
CREATE INDEX IF NOT EXISTS idx_site_placements_status ON site_placements(status);

-- CAMPAIGNS
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  advertiser_id TEXT NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'performance',
  status TEXT NOT NULL DEFAULT 'draft',
  daily_budget REAL NOT NULL DEFAULT 0,
  total_budget REAL NOT NULL DEFAULT 0,
  budget_spent REAL NOT NULL DEFAULT 0,
  budget_remaining REAL NOT NULL DEFAULT 0,
  bidding_strategy TEXT NOT NULL DEFAULT 'manual_cpc',
  max_cpc REAL,
  target_cpa REAL,
  target_roas REAL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  time_zone TEXT NOT NULL DEFAULT 'Africa/Kinshasa',
  hours_of_day TEXT NOT NULL DEFAULT '[]',
  days_of_week TEXT NOT NULL DEFAULT '[]',
  geo_targeting TEXT NOT NULL DEFAULT '{}',
  device_targeting TEXT NOT NULL DEFAULT '{}',
  audience_segments TEXT NOT NULL DEFAULT '[]',
  keywords TEXT NOT NULL DEFAULT '[]',
  placements TEXT NOT NULL DEFAULT '[]',
  contextual_targeting TEXT NOT NULL DEFAULT '{}',
  frequency_cap TEXT NOT NULL DEFAULT '{}',
  pacing_type TEXT NOT NULL DEFAULT 'standard',
  deliver_over_timeframe INTEGER,
  auto_optimize INTEGER NOT NULL DEFAULT 0,
  rotation TEXT NOT NULL DEFAULT 'optimize',
  exclude_competitors INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  ctr REAL NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  avg_cpc REAL NOT NULL DEFAULT 0,
  avg_cpm REAL NOT NULL DEFAULT 0,
  conversion_rate REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  ended_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_campaigns_advertiser ON campaigns(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);

-- AD CREATIVES
CREATE TABLE IF NOT EXISTS ad_creatives (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  format TEXT NOT NULL,
  size TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  audio_url TEXT,
  landing_url TEXT NOT NULL,
  display_url TEXT NOT NULL,
  tracking_pixels TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  is_valid INTEGER NOT NULL DEFAULT 0,
  rejected_reason TEXT,
  auto_approved INTEGER NOT NULL DEFAULT 0,
  reviewed_at TEXT,
  reviewed_by TEXT,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  ctr REAL NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ad_creatives_campaign ON ad_creatives(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_status ON ad_creatives(status);

-- AUDIENCE SEGMENTS
CREATE TABLE IF NOT EXISTS audience_segments (
  id TEXT PRIMARY KEY,
  advertiser_id TEXT NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  rules TEXT NOT NULL DEFAULT '[]',
  size INTEGER,
  updated_at TEXT NOT NULL,
  UNIQUE(advertiser_id, name)
);

CREATE INDEX IF NOT EXISTS idx_audience_segments_advertiser ON audience_segments(advertiser_id);

-- AD REQUESTS (HIGH VOLUME)
CREATE TABLE IF NOT EXISTS ad_requests (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  timestamp TEXT NOT NULL,
  domain TEXT NOT NULL,
  placement_id TEXT NOT NULL,
  format TEXT NOT NULL,
  size TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  page_url TEXT NOT NULL,
  referrer TEXT,
  context TEXT NOT NULL DEFAULT '{}',
  targeting TEXT NOT NULL DEFAULT '{}',
  response TEXT NOT NULL DEFAULT '{}',
  no_fill_reason TEXT,
  floor_price REAL NOT NULL DEFAULT 0,
  winning_price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CDF',
  latency_ms INTEGER NOT NULL DEFAULT 0,
  auction_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_ad_requests_timestamp ON ad_requests(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ad_requests_domain ON ad_requests(domain);
CREATE INDEX IF NOT EXISTS idx_ad_requests_placement ON ad_requests(placement_id);
CREATE INDEX IF NOT EXISTS idx_ad_requests_auction ON ad_requests(auction_id);

-- AUCTIONS
CREATE TABLE IF NOT EXISTS auctions (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES ad_requests(request_id) ON DELETE CASCADE,
  timestamp TEXT NOT NULL,
  bids TEXT NOT NULL DEFAULT '[]',
  winner_campaign_id TEXT,
  winner_creative_id TEXT,
  winning_price REAL NOT NULL DEFAULT 0,
  second_price REAL NOT NULL DEFAULT 0,
  clearing_price REAL NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_auctions_timestamp ON auctions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_auctions_request ON auctions(request_id);

-- IMPRESSIONS (HIGH VOLUME)
CREATE TABLE IF NOT EXISTS impressions (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES ad_requests(request_id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  creative_id TEXT NOT NULL,
  publisher_site_id TEXT NOT NULL,
  placement_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  ip_hash TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  page_url TEXT NOT NULL,
  revenue REAL NOT NULL DEFAULT 0,
  publisher_revenue REAL NOT NULL DEFAULT 0,
  fraud_score REAL NOT NULL DEFAULT 0,
  fraud_signals TEXT NOT NULL DEFAULT '[]',
  is_valid INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_impressions_timestamp ON impressions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_impressions_campaign ON impressions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_impressions_site ON impressions(publisher_site_id);
CREATE INDEX IF NOT EXISTS idx_impressions_placement ON impressions(placement_id);

-- CLICKS (HIGH VOLUME)
CREATE TABLE IF NOT EXISTS clicks (
  id TEXT PRIMARY KEY,
  impression_id TEXT NOT NULL REFERENCES impressions(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  creative_id TEXT NOT NULL,
  publisher_site_id TEXT NOT NULL,
  placement_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  ip_hash TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  page_url TEXT NOT NULL,
  landing_url TEXT NOT NULL,
  cost REAL NOT NULL DEFAULT 0,
  publisher_revenue REAL NOT NULL DEFAULT 0,
  fraud_score REAL NOT NULL DEFAULT 0,
  fraud_signals TEXT NOT NULL DEFAULT '[]',
  is_valid INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_clicks_timestamp ON clicks(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_impression ON clicks(impression_id);
CREATE INDEX IF NOT EXISTS idx_clicks_campaign ON clicks(campaign_id);

-- CONVERSIONS
CREATE TABLE IF NOT EXISTS conversions (
  id TEXT PRIMARY KEY,
  click_id TEXT NOT NULL REFERENCES clicks(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  creative_id TEXT NOT NULL,
  publisher_site_id TEXT,
  timestamp TEXT NOT NULL,
  user_id TEXT,
  conversion_type TEXT NOT NULL,
  value REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CDF',
  is_valid INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_conversions_timestamp ON conversions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_conversions_click ON conversions(click_id);
CREATE INDEX IF NOT EXISTS idx_conversions_campaign ON conversions(campaign_id);

-- PERFORMANCE STATS (AGGREGATED)
CREATE TABLE IF NOT EXISTS performance_stats_daily (
  day TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  publisher_site_id TEXT,
  placement_id TEXT,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  publisher_revenue REAL NOT NULL DEFAULT 0,
  ctr REAL NOT NULL DEFAULT 0,
  cpa REAL NOT NULL DEFAULT 0,
  roas REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (day, campaign_id, publisher_site_id, placement_id)
);

CREATE INDEX IF NOT EXISTS idx_perf_stats_day ON performance_stats_daily(day DESC);
CREATE INDEX IF NOT EXISTS idx_perf_stats_campaign ON performance_stats_daily(campaign_id);
CREATE INDEX IF NOT EXISTS idx_perf_stats_site ON performance_stats_daily(publisher_site_id);

-- PERFORMANCE BY GEO
CREATE TABLE IF NOT EXISTS performance_geo_daily (
  day TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  country TEXT NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (day, campaign_id, country)
);

CREATE INDEX IF NOT EXISTS idx_perf_geo_day ON performance_geo_daily(day DESC);

-- PERFORMANCE BY DEVICE
CREATE TABLE IF NOT EXISTS performance_device_daily (
  day TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  device_type TEXT NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (day, campaign_id, device_type)
);

CREATE INDEX IF NOT EXISTS idx_perf_device_day ON performance_device_daily(day DESC);

-- CROSS-DOMAIN TRACKING
CREATE TABLE IF NOT EXISTS cross_domain_profiles (
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  domains TEXT NOT NULL DEFAULT '[]',
  timeline TEXT NOT NULL DEFAULT '[]',
  profile TEXT NOT NULL DEFAULT '{}',
  last_updated TEXT NOT NULL,
  PRIMARY KEY (user_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_cross_domain_user ON cross_domain_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_cross_domain_session ON cross_domain_profiles(session_id);

-- INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  items TEXT NOT NULL DEFAULT '[]',
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CDF',
  status TEXT NOT NULL DEFAULT 'draft',
  due_date TEXT NOT NULL,
  paid_at TEXT,
  payment_method TEXT,
  download_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_entity ON invoices(entity_id);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CDF',
  status TEXT NOT NULL DEFAULT 'pending',
  method TEXT NOT NULL,
  reference TEXT,
  description TEXT NOT NULL,
  related_entity_id TEXT,
  related_entity_type TEXT,
  created_at TEXT NOT NULL,
  processed_at TEXT,
  failed_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- FRAUD DETECTION LOGS
CREATE TABLE IF NOT EXISTS fraud_detection (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES ad_requests(request_id) ON DELETE CASCADE,
  timestamp TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low',
  signals TEXT NOT NULL DEFAULT '[]',
  action TEXT NOT NULL DEFAULT 'allow',
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_fraud_timestamp ON fraud_detection(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_risk ON fraud_detection(risk_level);

-- NETWORK HEALTH MONITORING
CREATE TABLE IF NOT EXISTS network_health (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'healthy',
  fill_rate REAL NOT NULL DEFAULT 0,
  avg_latency_ms INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  active_placements INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_network_health_timestamp ON network_health(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_network_health_domain ON network_health(domain);

-- DASHBOARD LAYOUTS
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  widgets TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user ON dashboard_layouts(user_id);

-- ENHANCED RADAR (SEO)
CREATE TABLE IF NOT EXISTS radar_url_inspection (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES studio_sites(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  indexed INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  snippet TEXT,
  domain TEXT,
  crawled_at TEXT,
  last_indexed_at TEXT,
  in_queue INTEGER NOT NULL DEFAULT 0,
  queue_status TEXT,
  canonical_url TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  headings TEXT NOT NULL DEFAULT '[]',
  internal_links INTEGER NOT NULL DEFAULT 0,
  external_links INTEGER NOT NULL DEFAULT 0,
  word_count INTEGER NOT NULL DEFAULT 0,
  readability_score REAL,
  seo_score REAL,
  last_updated TEXT NOT NULL,
  UNIQUE(site_id, url)
);

CREATE INDEX IF NOT EXISTS idx_radar_inspection_site ON radar_url_inspection(site_id);
CREATE INDEX IF NOT EXISTS idx_radar_inspection_url ON radar_url_inspection(url);

-- ENHANCED TRACE (ANALYTICS)
CREATE TABLE IF NOT EXISTS trace_sessions (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES studio_sites(id) ON DELETE CASCADE,
  user_id TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  pageviews INTEGER NOT NULL DEFAULT 0,
  bounce INTEGER NOT NULL DEFAULT 0,
  entry_page TEXT,
  exit_page TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT
);

CREATE INDEX IF NOT EXISTS idx_trace_sessions_site ON trace_sessions(site_id);
CREATE INDEX IF NOT EXISTS idx_trace_sessions_user ON trace_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_trace_sessions_started ON trace_sessions(started_at DESC);

CREATE TABLE IF NOT EXISTS trace_events_enhanced (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES trace_sessions(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL REFERENCES studio_sites(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'pageview',
  path TEXT NOT NULL,
  title TEXT,
  referrer TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  scroll_depth REAL NOT NULL DEFAULT 0,
  elements_clicked TEXT NOT NULL DEFAULT '[]',
  form_submissions TEXT NOT NULL DEFAULT '[]',
  errors TEXT NOT NULL DEFAULT '[]',
  custom_events TEXT NOT NULL DEFAULT '{}',
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trace_events_session ON trace_events_enhanced(session_id);
CREATE INDEX IF NOT EXISTS idx_trace_events_site ON trace_events_enhanced(site_id);
CREATE INDEX IF NOT EXISTS idx_trace_events_timestamp ON trace_events_enhanced(timestamp DESC);

-- ENHANCED VELOCITY (PERFORMANCE)
CREATE TABLE IF NOT EXISTS velocity_metrics_detailed (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES studio_sites(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  performance_score INTEGER,
  accessibility_score INTEGER,
  best_practices_score INTEGER,
  seo_score INTEGER,
  metrics TEXT NOT NULL DEFAULT '{}',
  opportunities TEXT NOT NULL DEFAULT '[]',
  diagnostics TEXT NOT NULL DEFAULT '[]',
  passed_audits INTEGER NOT NULL DEFAULT 0,
  failed_audits INTEGER NOT NULL DEFAULT 0,
  warnings INTEGER NOT NULL DEFAULT 0,
  total_size_bytes INTEGER NOT NULL DEFAULT 0,
  resource_count INTEGER NOT NULL DEFAULT 0,
  dom_size INTEGER NOT NULL DEFAULT 0,
  cpu_time_ms REAL NOT NULL DEFAULT 0,
  script_execution_time_ms REAL NOT NULL DEFAULT 0,
  rendering_time_ms REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_velocity_site ON velocity_metrics_detailed(site_id);
CREATE INDEX IF NOT EXISTS idx_velocity_url ON velocity_metrics_detailed(url);
CREATE INDEX IF NOT EXISTS idx_velocity_timestamp ON velocity_metrics_detailed(timestamp DESC);

-- AETHER (AI RECOMMENDATIONS)
CREATE TABLE IF NOT EXISTS aether_insights (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES studio_sites(id) ON DELETE CASCADE,
  generated_at TEXT NOT NULL,
  data_period_start TEXT NOT NULL,
  data_period_end TEXT NOT NULL,
  radar_summary TEXT NOT NULL DEFAULT '{}',
  trace_summary TEXT NOT NULL DEFAULT '{}',
  yield_summary TEXT NOT NULL DEFAULT '{}',
  velocity_summary TEXT NOT NULL DEFAULT '{}',
  recommended_actions TEXT NOT NULL DEFAULT '[]',
  priority_score REAL NOT NULL DEFAULT 0,
  estimated_impact TEXT,
  confidence_score REAL NOT NULL DEFAULT 0,
  model_version TEXT NOT NULL DEFAULT '1.0'
);

CREATE INDEX IF NOT EXISTS idx_aether_site ON aether_insights(site_id);
CREATE INDEX IF NOT EXISTS idx_aether_generated ON aether_insights(generated_at DESC);

CREATE TABLE IF NOT EXISTS aether_action_history (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES studio_sites(id) ON DELETE CASCADE,
  insight_id TEXT NOT NULL REFERENCES aether_insights(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  module TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  implemented_at TEXT,
  result TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aether_actions_site ON aether_action_history(site_id);
CREATE INDEX IF NOT EXISTS idx_aether_actions_insight ON aether_action_history(insight_id);

-- TRACE ATTRIBUTION (multi-touch)
CREATE TABLE IF NOT EXISTS attribution_touchpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  touchpoint_type TEXT NOT NULL DEFAULT 'direct',
  source TEXT NOT NULL DEFAULT '',
  medium TEXT NOT NULL DEFAULT '',
  campaign TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  term TEXT NOT NULL DEFAULT '',
  referrer TEXT NOT NULL DEFAULT '',
  page_url TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 1,
  is_conversion INTEGER NOT NULL DEFAULT 0,
  conversion_value REAL NOT NULL DEFAULT 0,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attribution_site ON attribution_touchpoints(site_id);
CREATE INDEX IF NOT EXISTS idx_attribution_session ON attribution_touchpoints(session_id);
CREATE INDEX IF NOT EXISTS idx_attribution_timestamp ON attribution_touchpoints(timestamp DESC);

-- TRACE TAG MANAGER (règles de collecte déclaratives)
CREATE TABLE IF NOT EXISTS trace_tag_rules (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES studio_sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tag_type TEXT NOT NULL DEFAULT 'event',
  trigger_type TEXT NOT NULL DEFAULT 'all_pages',
  trigger_value TEXT NOT NULL DEFAULT '',
  config TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trace_tags_site ON trace_tag_rules(site_id);

-- RADAR — sitemaps soumis (historique + statut de lecture réel)
CREATE TABLE IF NOT EXISTS radar_sitemaps (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES studio_sites(id) ON DELETE CASCADE,
  sitemap_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  discovered_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  submitted_at TEXT NOT NULL,
  last_read TEXT,
  UNIQUE(site_id, sitemap_url)
);

CREATE INDEX IF NOT EXISTS idx_radar_sitemaps_site ON radar_sitemaps(site_id);

-- YIELD — mots-clés de campagne (Google Ads keywords)
CREATE TABLE IF NOT EXISTS campaign_keywords (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'broad',
  max_cpc REAL,
  status TEXT NOT NULL DEFAULT 'enabled',
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(campaign_id, keyword, match_type)
);

CREATE INDEX IF NOT EXISTS idx_campaign_keywords ON campaign_keywords(campaign_id);
`;

/**
 * Runs each schema statement independently so a statement failing against a
 * drifted production table does not abort the rest of the schema.
 */
function execStatements(db: AyebaDatabase, schema: string) {
  for (const raw of schema.split(";")) {
    const stmt = raw.trim();
    if (!stmt || stmt.startsWith("--") && !stmt.includes("\n")) continue;
    try {
      db.exec(stmt);
    } catch (e) {
      console.warn("[db] enterprise schema statement skipped:", (e as Error).message);
    }
  }
}

export function applyEnterpriseSchema(db: AyebaDatabase) {
  execStatements(db, AYEBA_STUDIO_SCHEMA);
  // Column migrations for databases created before these columns existed.
  const migrations = [
    "ALTER TABLE trace_sessions ADD COLUMN gclid TEXT",
    "ALTER TABLE trace_sessions ADD COLUMN fbclid TEXT",
    "ALTER TABLE trace_sessions ADD COLUMN is_first_visit INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE trace_sessions ADD COLUMN session_quality REAL NOT NULL DEFAULT 0",
    "ALTER TABLE trace_sessions ADD COLUMN ad_blocker INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE trace_sessions ADD COLUMN javascript_enabled INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE trace_sessions ADD COLUMN cookies_enabled INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE trace_sessions ADD COLUMN screen_resolution TEXT",
    "ALTER TABLE trace_sessions ADD COLUMN language TEXT",
    "ALTER TABLE trace_sessions ADD COLUMN timezone TEXT",
    "ALTER TABLE trace_sessions ADD COLUMN user_agent TEXT",
    "ALTER TABLE trace_events_enhanced ADD COLUMN custom_dimensions TEXT NOT NULL DEFAULT '{}'",
    "ALTER TABLE velocity_metrics_detailed ADD COLUMN form_factor TEXT",
    "ALTER TABLE velocity_metrics_detailed ADD COLUMN scores TEXT NOT NULL DEFAULT '{}'",
    "ALTER TABLE velocity_metrics_detailed ADD COLUMN audits TEXT NOT NULL DEFAULT '[]'",
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }
}
