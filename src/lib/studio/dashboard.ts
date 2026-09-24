/**
 * Vue d'ensemble unifiée d'un site — agrège les métriques réelles de chaque
 * module (Radar, Trace, Velocity, Yield, Aether). Aucune donnée fabriquée :
 * chaque KPI vient des tables de production ou est null/absent.
 */
import { getDb } from "@/lib/storage/database";
import { radarCoverage, radarPerformanceTotals } from "./radar-console";
import { traceTotals } from "./trace-analytics";
import { psiAuditHistory } from "./velocity-psi";
import { yieldOverview } from "./yield";
import { aetherInsights } from "./aether-console";
import type { StudioSite } from "./types";

export type StudioDashboard = {
  site: StudioSite;
  radar: {
    impressions28d: number;
    clicks28d: number;
    ctr28d: number;
    avgPosition: number | null;
    indexedPages: number;
    errorPages: number;
    excludedPages: number;
  };
  trace: {
    sessions28d: number;
    pageviews28d: number;
    users28d: number;
    bounceRate: number;
    avgSessionDurationSec: number;
  };
  velocity: {
    lastAudit: {
      url: string;
      strategy: string;
      timestamp: string;
      scores: {
        performance: number | null;
        accessibility: number | null;
        bestPractices: number | null;
        seo: number | null;
      };
    } | null;
    auditsCount: number;
  };
  yield: {
    enabled: boolean;
    impressions30d: number;
    clicks30d: number;
    revenue30dCdf: number;
    ecpmCdf: number;
  };
  insights: { title: string; detail: string; href: string; priority: string }[];
};

export function studioDashboard(site: StudioSite): StudioDashboard {
  const perf = radarPerformanceTotals(site.domain, 28);
  const coverage = radarCoverage(site);
  const trace = traceTotals(site.id, 28);
  const audits = psiAuditHistory(site.id, 1);
  const auditsCount = (
    getDb()
      .prepare("SELECT COUNT(*) AS c FROM velocity_metrics_detailed WHERE site_id = ?")
      .get(site.id) as { c: number }
  ).c;
  const y = yieldOverview(site);
  const insights = aetherInsights(site).slice(0, 4);

  const last = audits[0];
  return {
    site,
    radar: {
      impressions28d: perf.impressions,
      clicks28d: perf.clicks,
      ctr28d: perf.ctr,
      avgPosition: perf.position,
      indexedPages: coverage.totals.indexed,
      errorPages: coverage.totals.failed,
      excludedPages: coverage.totals.discoveredNotIndexed,
    },
    trace: {
      sessions28d: trace.sessions,
      pageviews28d: trace.pageviews,
      users28d: trace.users,
      bounceRate: trace.bounceRate,
      avgSessionDurationSec: trace.avgSessionDurationSec,
    },
    velocity: {
      lastAudit: last
        ? {
            url: last.url,
            strategy: last.strategy,
            timestamp: last.timestamp,
            scores: last.scores,
          }
        : null,
      auditsCount,
    },
    yield: {
      enabled: y.enabled,
      impressions30d: y.impressions30d,
      clicks30d: y.clicks30d,
      revenue30dCdf: y.revenue30dCdf,
      ecpmCdf: y.ecpmCdf,
    },
    insights,
  };
}
