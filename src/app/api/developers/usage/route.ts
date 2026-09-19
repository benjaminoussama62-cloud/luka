import { NextResponse } from "next/server";
import { requireDeveloperSession } from "@/lib/developers/session";
import { getConsoleOverview, getUsage } from "@/lib/developers/console";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;
  const url = new URL(req.url);
  if (url.searchParams.get("overview") === "1") {
    return NextResponse.json(getConsoleOverview(auth.user.id));
  }
  const projectId = url.searchParams.get("projectId") || null;
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 30));
  return NextResponse.json(getUsage(auth.user.id, projectId, days));
}
