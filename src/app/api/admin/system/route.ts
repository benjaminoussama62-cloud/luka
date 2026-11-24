import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { currentDbMode } from "@/lib/storage/database";
import { adb } from "@/lib/storage/adb";

export const runtime = "nodejs";

const COUNTED_TABLES = [
  "users",
  "admin_users",
  "crawl_documents",
  "crawl_queue",
  "search_history",
  "ayebi_articles",
  "ayebi_revisions",
  "ayebi_flags",
  "studio_sites",
  "trace_events",
  "oauth_clients",
  "oauth_access_tokens",
  "developer_projects",
  "developer_api_keys",
  "developer_api_logs",
  "transactions",
  "support_tickets",
  "moderation_queue",
  "admin_audit_log",
  "admin_chat_messages",
  "announcements",
  "incidents",
  "incident_updates",
] as const;

/** GET /api/admin/system — état technique: base, tables, jobs, API. */
export async function GET() {
  const auth = await requireSection("system");
  if (auth instanceof NextResponse) return auth;

  const db = adb();
  const tableCounts: Record<string, number> = {};
  for (const t of COUNTED_TABLES) {
    try {
      tableCounts[t] = (await db.get(`SELECT COUNT(*) AS n FROM ${t}`) as { n: number }).n;
    } catch {
      tableCounts[t] = -1; // table absente
    }
  }

  const day = new Date(Date.now() - 86400_000).toISOString();
  const api = await db.get(`SELECT COUNT(*) AS calls,
              SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS errors,
              AVG(latency_ms) AS avg_latency
       FROM developer_api_logs WHERE created_at >= ?`, [day]) as { calls: number | null; errors: number | null; avg_latency: number | null };

  const jobs = await db.all("SELECT job_type, status, detail, started_at, finished_at FROM job_runs ORDER BY started_at DESC LIMIT 30") as Record<string, unknown>[];

  const alerts = await db.all("SELECT id, type, title, message, created_at, read FROM admin_notifications ORDER BY created_at DESC LIMIT 20") as Record<string, unknown>[];

  return NextResponse.json({
    ok: true,
    runtime: {
      dbMode: currentDbMode(),
      node: process.version,
      env: process.env.VERCEL_ENV ?? "local",
      region: process.env.VERCEL_REGION ?? "local",
      serverTime: new Date().toISOString(),
    },
    tables: tableCounts,
    api24h: {
      calls: api?.calls ?? 0,
      errors: api?.errors ?? 0,
      avgLatencyMs: Math.round(api?.avg_latency ?? 0),
    },
    jobs,
    notifications: alerts,
  });
}
