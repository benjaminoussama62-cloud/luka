import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { listPortals, upsertPortal } from "@/lib/ayebi/db-sqlite";
import { authorFromSession } from "@/lib/ayebi/author";

export async function GET() {
  const portals = listPortals();
  return NextResponse.json({ portals });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const author = authorFromSession(session);
  if (!["admin", "moderator"].includes(author.role)) {
    return NextResponse.json({ error: "Modérateur requis." }, { status: 403 });
  }
  const body = (await req.json()) as { id?: string; title?: string; description?: string; image?: string; tags?: string[] };
  if (!body.id || !body.title) return NextResponse.json({ error: "id et title requis." }, { status: 400 });
  upsertPortal({ id: body.id, title: body.title, description: body.description ?? "", image: body.image, tags: body.tags ?? [] });
  return NextResponse.json({ ok: true });
}
