import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { adb } from "@/lib/storage/adb";
import { SISTER_AD_APPS } from "@/lib/ads/sister-access";

export const runtime = "nodejs";

/** GET /api/admin/network — Yield ad network: advertisers, publishers, campaigns, requests. */
export async function GET() {
  const auth = await requireSection("network");
  if (auth instanceof NextResponse) return auth;

  const db = adb();
  const all = async (sql: string) => db.all(sql);
  const count = async (sql: string) =>
    (await db.get(sql) as { n: number } | undefined)?.n ?? 0;

  return NextResponse.json({
    ok: true,
    advertisers: await all("SELECT * FROM advertisers ORDER BY created_at DESC LIMIT 200"),
    publishers: await all("SELECT * FROM publishers ORDER BY created_at DESC LIMIT 200"),
    campaigns: await all("SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 200"),
    creatives: await all("SELECT * FROM ad_creatives ORDER BY created_at DESC LIMIT 200"),
    placements: await all("SELECT * FROM site_placements ORDER BY created_at DESC LIMIT 200"),
    recentRequests: await all("SELECT * FROM ad_requests ORDER BY timestamp DESC LIMIT 100"),
    sisterApps: SISTER_AD_APPS,
    stats: {
      impressions: await count("SELECT COUNT(*) AS n FROM impressions"),
      clicks: await count("SELECT COUNT(*) AS n FROM clicks"),
      adRequests: await count("SELECT COUNT(*) AS n FROM ad_requests"),
    },
  });
}
