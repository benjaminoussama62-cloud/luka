import { NextResponse } from "next/server";
import { bulkImportRdc, ayebiStats } from "@/lib/ayebi/bulk-import";
import { importSeedIfEmpty } from "@/lib/ayebi/db-sqlite";

export async function GET() {
  importSeedIfEmpty();
  return NextResponse.json({ stats: ayebiStats() });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { maxPerCategory?: number };
  importSeedIfEmpty();

  const result = await bulkImportRdc({
    maxPerCategory: Math.min(body.maxPerCategory ?? 200, 400),
    delayMs: 80,
  });

  return NextResponse.json({ ok: true, ...result, stats: ayebiStats() });
}
