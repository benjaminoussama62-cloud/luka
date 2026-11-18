/**
 * Feature flags plateforme — stockés dans admin_settings (clés "feature:*").
 * isFeatureEnabled() est cachée 30 s : les routes produit peuvent l'appeler
 * par requête sans marteler la DB, tout en restant réactives aux kill-switches.
 * Un flag absent de la DB prend sa valeur par défaut (voir KNOWN_FLAGS).
 */
import { adb } from "@/lib/storage/adb";

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  defaultEnabled: boolean;
  custom: boolean;
  description: string;
  updatedBy: string | null;
  updatedAt: string | null;
}

/** Flags reconnus — la console n'en propose que ceux-ci ; le POST accepte des clés custom. */
export const KNOWN_FLAGS: Record<string, { defaultEnabled: boolean; description: string }> = {
  "money.transfers": { defaultEnabled: true, description: "Transferts Mbongo internes" },
  "money.withdrawals": { defaultEnabled: true, description: "Retraits Mbongo vers providers" },
  "money.deposits": { defaultEnabled: true, description: "Dépôts Mbongo (mobile money, cartes)" },
  "mail.signup": { defaultEnabled: true, description: "Inscriptions Ayeba Mail" },
  "mail.send": { defaultEnabled: true, description: "Envoi de messages Ayeba Mail" },
  "search.live": { defaultEnabled: true, description: "Recherche live (upstreams externes)" },
  "crawl.enabled": { defaultEnabled: true, description: "Crawler / ingestion d'URLs" },
  "ayebi.editing": { defaultEnabled: true, description: "Édition et création d'articles Ayebi" },
  "oauth.new_clients": { defaultEnabled: true, description: "Création de clients OAuth développeurs" },
  "studio.publish": { defaultEnabled: true, description: "Publication de sites Studio" },
};

const PREFIX = "feature:";
const TTL_MS = 30_000;
let cache: { at: number; map: Map<string, boolean> } | null = null;

async function loadMap(): Promise<Map<string, boolean>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  const rows = await adb().all(
    "SELECT key, value FROM admin_settings WHERE key LIKE ?",
    [`${PREFIX}%`],
  );
  const map = new Map<string, boolean>();
  for (const r of rows) {
    map.set(String(r.key).slice(PREFIX.length), String(r.value) === "1");
  }
  cache = { at: Date.now(), map };
  return map;
}

/** True si la fonctionnalité est active (défaut si non stocké). Fail-open ? Non — fail sur défaut. */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  try {
    const map = await loadMap();
    if (map.has(key)) return map.get(key)!;
    return KNOWN_FLAGS[key]?.defaultEnabled ?? true;
  } catch {
    return KNOWN_FLAGS[key]?.defaultEnabled ?? true;
  }
}

/** Réponse 503 standard pour une route coupée par flag. */
export function flagDisabledResponse(feature: string) {
  return Response.json(
    { error: `${feature} temporairement indisponible`, code: "feature_disabled" },
    { status: 503 },
  );
}

/** Liste complète : flags connus + customs, avec état effectif et métadonnées. */
export async function listFlags(): Promise<FeatureFlag[]> {
  const rows = await adb().all(
    "SELECT key, value, description, updated_by, updated_at FROM admin_settings WHERE key LIKE ?",
    [`${PREFIX}%`],
  );
  const stored = new Map(rows.map((r) => [String(r.key).slice(PREFIX.length), r]));
  const flags: FeatureFlag[] = [];

  for (const [key, def] of Object.entries(KNOWN_FLAGS)) {
    const r = stored.get(key);
    stored.delete(key);
    flags.push({
      key,
      enabled: r ? String(r.value) === "1" : def.defaultEnabled,
      defaultEnabled: def.defaultEnabled,
      custom: false,
      description: r?.description ? String(r.description) : def.description,
      updatedBy: (r?.updated_by as string) ?? null,
      updatedAt: (r?.updated_at as string) ?? null,
    });
  }
  for (const [key, r] of stored) {
    flags.push({
      key,
      enabled: String(r.value) === "1",
      defaultEnabled: true,
      custom: true,
      description: String(r.description ?? ""),
      updatedBy: (r.updated_by as string) ?? null,
      updatedAt: (r.updated_at as string) ?? null,
    });
  }
  return flags.sort((a, b) => a.key.localeCompare(b.key));
}

/** Upsert + invalidation du cache. `updatedBy` = id admin_users (null sinon — FK). */
export async function setFlag(key: string, enabled: boolean, updatedBy: string | null, description?: string) {
  const now = new Date().toISOString();
  await adb().run(
    `INSERT INTO admin_settings (key, value, description, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value,
       description = COALESCE(excluded.description, admin_settings.description),
       updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
    [`${PREFIX}${key}`, enabled ? "1" : "0", description ?? null, updatedBy, now],
  );
  cache = null;
}
