import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { runLocalCrawl } from "@/lib/crawler";

export async function POST() {
  try {
    const user = await getSessionFromCookies();
    if (!user) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const docs = await runLocalCrawl();
    return NextResponse.json({
      ok: true,
      count: docs.length,
      lastRun: new Date().toISOString(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Échec du crawl" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const { getCrawlIndex } = await import("@/lib/db");
  const docs = await getCrawlIndex();
  return NextResponse.json({ count: docs.length, docs: docs.slice(0, 20) });
}
