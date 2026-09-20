import { NextResponse } from "next/server";
import { getDb } from "@/lib/storage/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/announcements — annonces actives affichées sur ayeba.app. */
export async function GET() {
  try {
    const rows = getDb()
      .prepare(
        `SELECT id, title, body, severity, created_at
         FROM announcements WHERE status = 'active'
         ORDER BY created_at DESC LIMIT 3`,
      )
      .all();
    return NextResponse.json(
      { ok: true, announcements: rows },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch {
    return NextResponse.json({ ok: true, announcements: [] });
  }
}
