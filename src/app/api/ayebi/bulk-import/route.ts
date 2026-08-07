import { NextResponse } from "next/server";
import { bulkImportRdc, ayebiStats } from "@/lib/ayebi/bulk-import";
import { importSeedIfEmpty } from "@/lib/ayebi/db-sqlite";
import { isCronAuthorized } from "@/lib/cron-auth";

export const maxDuration = 60;

export async function GET() {
  importSeedIfEmpty();
  return NextResponse.json({ stats: ayebiStats() });
}

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    maxPerCategory?: number;
    maxImport?: number;
  };
  importSeedIfEmpty();

  const result = await bulkImportRdc({
    maxPerCategory: Math.min(body.maxPerCategory ?? 40, 120),
    maxImport: Math.min(body.maxImport ?? 25, 80),
    delayMs: 40,
  });

  return NextResponse.json({ ok: true, ...result, stats: ayebiStats() });
}
