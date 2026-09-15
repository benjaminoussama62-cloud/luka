import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { getDb } from "@/lib/storage/database";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const items = getDb().prepare("SELECT slug, created_at FROM ayebi_watchlists WHERE user_id = ? ORDER BY created_at DESC").all(session.id);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const body = (await req.json()) as { slug?: string };
  if (!body.slug?.trim()) return NextResponse.json({ error: "Slug requis" }, { status: 400 });
  getDb().prepare("INSERT OR IGNORE INTO ayebi_watchlists (user_id, slug, created_at) VALUES (?, ?, ?)").run(session.id, body.slug.trim(), new Date().toISOString());
  return NextResponse.json({ watching: true });
}

export async function DELETE(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Slug requis" }, { status: 400 });
  getDb().prepare("DELETE FROM ayebi_watchlists WHERE user_id = ? AND slug = ?").run(session.id, slug);
  return NextResponse.json({ watching: false });
}
