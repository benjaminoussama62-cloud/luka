import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { getSearchHistory, pushSearchHistory } from "@/lib/db";

export async function GET() {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ history: [] });
  const history = await getSearchHistory(user.id);
  return NextResponse.json({ history });
}

export async function POST(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json()) as { query?: string };
  const q = body.query?.trim();
  if (!q) return NextResponse.json({ error: "query required" }, { status: 400 });

  await pushSearchHistory(user.id, q);
  return NextResponse.json({ ok: true });
}
