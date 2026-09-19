import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { toggleWatchlist, getUserWatchlist, isWatching } from "@/lib/ayebi/db-sqlite";

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (slug) {
    return NextResponse.json({ watching: isWatching(session.id, slug) });
  }
  const slugs = getUserWatchlist(session.id);
  return NextResponse.json({ slugs });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const { slug } = (await req.json()) as { slug?: string };
  if (!slug) return NextResponse.json({ error: "slug requis." }, { status: 400 });
  const watching = toggleWatchlist(session.id, slug);
  return NextResponse.json({ watching });
}
