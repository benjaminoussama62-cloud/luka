import { getDb } from "@/lib/storage/database";
import { daysAgoIso } from "./domain";
import { DEFAULT_YIELD_PLACEMENTS, ensureSiteModules, setYieldEnabled, updateYieldPlacements } from "./modules";
import type { StudioSite, YieldOverview, YieldPlacement } from "./types";

type PlacementDef = (typeof DEFAULT_YIELD_PLACEMENTS)[number];

function getPlacements(siteId: string): PlacementDef[] {
  const mods = ensureSiteModules(siteId);
  const fromConfig = mods.yieldConfig.placements as PlacementDef[] | undefined;
  return fromConfig?.length ? fromConfig : DEFAULT_YIELD_PLACEMENTS;
}

function statsForPlacement(siteId: string, placementId: string, since: string) {
  const row = getDb()
    .prepare(
      `SELECT SUM(impressions) as impressions, SUM(clicks) as clicks, SUM(revenue_cdf) as revenue
       FROM yield_stats_daily
       WHERE site_id = ? AND placement_id = ? AND day >= ?`,
    )
    .get(siteId, placementId, since.slice(0, 10)) as
    | { impressions: number | null; clicks: number | null; revenue: number | null }
    | undefined;

  const impressions = row?.impressions ?? 0;
  const clicks = row?.clicks ?? 0;
  const revenue = row?.revenue ?? 0;
  return {
    impressions,
    clicks,
    revenue,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
  };
}

export function yieldOverview(site: StudioSite): YieldOverview {
  const mods = ensureSiteModules(site.id);
  const since = daysAgoIso(30);
  const placements = getPlacements(site.id);

  const rows: YieldPlacement[] = placements.map((p) => {
    const s = statsForPlacement(site.id, p.id, since);
    return {
      id: p.id,
      label: p.label,
      slot: p.slot,
      enabled: p.enabled,
      format: p.format,
      impressions30d: s.impressions,
      clicks30d: s.clicks,
      ctr30d: s.ctr,
      revenue30dCdf: Math.round(s.revenue),
    };
  });

  const impressions30d = rows.reduce((a, r) => a + r.impressions30d, 0);
  const clicks30d = rows.reduce((a, r) => a + r.clicks30d, 0);
  const revenue30dCdf = rows.reduce((a, r) => a + r.revenue30dCdf, 0);
  const ctr30d = impressions30d > 0 ? Math.round((clicks30d / impressions30d) * 1000) / 10 : 0;
  const ecpmCdf =
    impressions30d > 0 ? Math.round((revenue30dCdf / impressions30d) * 1000) : 0;

  return {
    domain: site.domain,
    enabled: mods.yieldEnabled,
    impressions30d,
    clicks30d,
    ctr30d,
    revenue30dCdf,
    ecpmCdf,
    placements: rows,
  };
}

export function toggleYield(site: StudioSite, enabled: boolean) {
  setYieldEnabled(site.id, enabled);
  return yieldOverview(site);
}

export function saveYieldPlacements(
  site: StudioSite,
  placements: { id: string; enabled: boolean }[],
) {
  updateYieldPlacements(site.id, placements);
  return yieldOverview(site);
}

export function recordYieldImpression(siteId: string, placementId: string) {
  const day = new Date().toISOString().slice(0, 10);
  getDb()
    .prepare(
      `INSERT INTO yield_stats_daily (day, site_id, placement_id, impressions, clicks, revenue_cdf)
       VALUES (?, ?, ?, 1, 0, 0)
       ON CONFLICT(day, site_id, placement_id)
       DO UPDATE SET impressions = impressions + 1`,
    )
    .run(day, siteId, placementId);
}

export function recordYieldClick(siteId: string, placementId: string, revenueCdf = 12) {
  const day = new Date().toISOString().slice(0, 10);
  getDb()
    .prepare(
      `INSERT INTO yield_stats_daily (day, site_id, placement_id, impressions, clicks, revenue_cdf)
       VALUES (?, ?, ?, 0, 1, ?)
       ON CONFLICT(day, site_id, placement_id)
       DO UPDATE SET clicks = clicks + 1, revenue_cdf = revenue_cdf + ?`,
    )
    .run(day, siteId, placementId, revenueCdf, revenueCdf);
}
