import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { getDb } from "@/lib/storage/database";

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const body = (await req.json()) as { slug?: string; revision?: number; value?: number };
  if (!body.slug || !Number.isInteger(body.revision) || ![1, -1].includes(body.value ?? 0)) {
    return NextResponse.json({ error: "Vote invalide" }, { status: 400 });
  }
  getDb().prepare(
    "INSERT INTO ayebi_revision_votes (user_id, slug, revision, value, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, slug, revision) DO UPDATE SET value = excluded.value",
  ).run(session.id, body.slug, body.revision, body.value, new Date().toISOString());
  const totals = getDb().prepare("SELECT SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END) AS up, SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END) AS down FROM ayebi_revision_votes WHERE slug = ? AND revision = ?").get(body.slug, body.revision);
  return NextResponse.json({ totals });
}
