import { NextResponse } from "next/server";
import { requireDeveloperSession } from "@/lib/developers/session";
import { getLogs } from "@/lib/developers/console";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") || null;
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 100));
  return NextResponse.json({ logs: getLogs(auth.user.id, projectId, limit) });
}
