import { NextResponse } from "next/server";
import { queueStats } from "@/lib/crawler/global-crawler";
import { indexStats } from "@/lib/search-index/fts";
import { currentDbMode, getDb } from "@/lib/storage/database";

function isAuthorized(req: Request): boolean {
  if (req.headers.get("x-vercel-cron") === "1") return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function healthPayload() {
  getDb();
  return {
    ok: true,
    site: process.env.NEXT_PUBLIC_SITE_URL || "https://ayeba.app",
    index: indexStats(),
    queue: queueStats(),
    dbMode: currentDbMode(),
    timestamp: new Date().toISOString(),
  };
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(healthPayload());
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(healthPayload());
}
