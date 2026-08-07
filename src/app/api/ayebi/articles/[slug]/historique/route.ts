import { NextResponse } from "next/server";
import { authorFromSession } from "@/lib/ayebi/author";
import { diffRevisions } from "@/lib/ayebi/diff";
import { getRevision, getRevisions, restoreRevision } from "@/lib/ayebi/server";
import { getSessionFromCookies } from "@/lib/auth-server";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = new URL(_req.url);
  const revParam = url.searchParams.get("rev");
  const revisions = getRevisions(slug, 50);

  if (revParam) {
    const rev = Number(revParam);
    const current = getRevision(slug, rev);
    if (!current) {
      return NextResponse.json({ error: "Révision introuvable." }, { status: 404 });
    }
    const prev = getRevision(slug, rev - 1);
    const diff = diffRevisions(prev, current);
    return NextResponse.json({ revision: current, prev: prev?.revision ?? null, diff });
  }

  return NextResponse.json({ revisions });
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Connectez-vous." }, { status: 401 });
  }

  const { slug } = await ctx.params;
  const body = (await req.json()) as { revision?: number };
  const revision = Number(body.revision);
  if (!revision) {
    return NextResponse.json({ error: "Numéro de révision requis." }, { status: 400 });
  }

  const result = restoreRevision(slug, revision, authorFromSession(session));
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ article: result.article });
}
