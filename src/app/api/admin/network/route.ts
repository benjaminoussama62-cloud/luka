import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { getDb } from "@/lib/storage/database";
import { SISTER_AD_APPS } from "@/lib/ads/sister-access";

export const runtime = "nodejs";

/** GET /api/admin/network — Yield ad network: advertisers, publishers, campaigns, requests. */
export async function GET() {
  const auth = await requireSection("network");
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const all = (sql: string) => db.prepare(sql).all();
  const count = (sql: string) =>
    (db.prepare(sql).get() as { n: number } | undefined)?.n ?? 0;

  return NextResponse.json({
    ok: true,
    advertisers: all("SELECT * FROM advertisers ORDER BY created_at DESC LIMIT 200"),
    publishers: all("SELECT * FROM publishers ORDER BY created_at DESC LIMIT 200"),
    campaigns: all("SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 200"),
    creatives: all("SELECT * FROM ad_creatives ORDER BY created_at DESC LIMIT 200"),
    placements: all("SELECT * FROM site_placements ORDER BY created_at DESC LIMIT 200"),
    recentRequests: all("SELECT * FROM ad_requests ORDER BY timestamp DESC LIMIT 100"),
    sisterApps: SISTER_AD_APPS,
    stats: {
      impressions: count("SELECT COUNT(*) AS n FROM impressions"),
      clicks: count("SELECT COUNT(*) AS n FROM clicks"),
      adRequests: count("SELECT COUNT(*) AS n FROM ad_requests"),
    },
  });
}
