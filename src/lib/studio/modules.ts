import { randomBytes } from "crypto";
import { getDb } from "@/lib/storage/database";

export type SiteModules = {
  siteId: string;
  traceKey: string;
  traceEnabled: boolean;
  yieldEnabled: boolean;
  yieldConfig: Record<string, unknown>;
};

const DEFAULT_YIELD_PLACEMENTS = [
  { id: "search-sidebar", label: "Encart recherche Ayeba", slot: "sidebar", format: "native" as const, enabled: true },
  { id: "article-footer", label: "Pied d’article", slot: "footer", format: "native" as const, enabled: true },
  { id: "feed-native", label: "Fil natif mobile", slot: "feed", format: "feed" as const, enabled: false },
];

function newTraceKey() {
  return randomBytes(12).toString("hex");
}

export function ensureSiteModules(siteId: string): SiteModules {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT site_id, trace_key, trace_enabled, yield_enabled, yield_config_json
       FROM studio_site_modules WHERE site_id = ?`,
    )
    .get(siteId) as
    | {
        site_id: string;
        trace_key: string;
        trace_enabled: number;
        yield_enabled: number;
        yield_config_json: string;
      }
    | undefined;

  if (row) {
    return {
      siteId: row.site_id,
      traceKey: row.trace_key,
      traceEnabled: row.trace_enabled === 1,
      yieldEnabled: row.yield_enabled === 1,
      yieldConfig: parseJson(row.yield_config_json),
    };
  }

  const traceKey = newTraceKey();
  const now = new Date().toISOString();
  const yieldConfig = { placements: DEFAULT_YIELD_PLACEMENTS };
  db.prepare(
    `INSERT INTO studio_site_modules (site_id, trace_key, trace_enabled, yield_enabled, yield_config_json, updated_at)
     VALUES (?, ?, 1, 0, ?, ?)`,
  ).run(siteId, traceKey, JSON.stringify(yieldConfig), now);

  return {
    siteId,
    traceKey,
    traceEnabled: true,
    yieldEnabled: false,
    yieldConfig,
  };
}

export function getSiteByTraceKey(traceKey: string): { siteId: string; domain: string } | null {
  const row = getDb()
    .prepare(
      `SELECT m.site_id, s.domain FROM studio_site_modules m
       JOIN studio_sites s ON s.id = m.site_id
       WHERE m.trace_key = ? AND m.trace_enabled = 1`,
    )
    .get(traceKey) as { site_id: string; domain: string } | undefined;
  return row ? { siteId: row.site_id, domain: row.domain } : null;
}

export function setYieldEnabled(siteId: string, enabled: boolean) {
  ensureSiteModules(siteId);
  getDb()
    .prepare(`UPDATE studio_site_modules SET yield_enabled = ?, updated_at = ? WHERE site_id = ?`)
    .run(enabled ? 1 : 0, new Date().toISOString(), siteId);
}

export function updateYieldPlacements(siteId: string, placements: { id: string; enabled: boolean }[]) {
  const mods = ensureSiteModules(siteId);
  const current = (mods.yieldConfig.placements as typeof DEFAULT_YIELD_PLACEMENTS) || DEFAULT_YIELD_PLACEMENTS;
  const map = new Map(placements.map((p) => [p.id, p.enabled]));
  const next = current.map((p) => ({ ...p, enabled: map.has(p.id) ? Boolean(map.get(p.id)) : p.enabled }));
  const yieldConfig = { ...mods.yieldConfig, placements: next };
  getDb()
    .prepare(`UPDATE studio_site_modules SET yield_config_json = ?, updated_at = ? WHERE site_id = ?`)
    .run(JSON.stringify(yieldConfig), new Date().toISOString(), siteId);
  return yieldConfig;
}

function parseJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export { DEFAULT_YIELD_PLACEMENTS };
