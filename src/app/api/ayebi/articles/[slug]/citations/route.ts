import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { addCitation, listCitations } from "@/lib/ayebi/platform";
import type { AyebiCitation } from "@/lib/ayebi/types";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  return NextResponse.json({ citations: listCitations(slug) });
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const { slug } = await ctx.params;
  const body = (await req.json()) as { revision?: number; key?: string; title?: string; url?: string; publisher?: string; publishedAt?: string; author?: string };
  if (!body.key || !body.title || !body.url || !Number.isInteger(body.revision)) return NextResponse.json({ error: "Référence complète requise." }, { status: 400 });
  try {
    const citation: AyebiCitation = {
      key: body.key,
      title: body.title,
      url: body.url,
      publisher: body.publisher,
      publishedAt: body.publishedAt,
      author: body.author,
    };
    return NextResponse.json({ citation: addCitation(slug, body.revision as number, citation, session.id) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Référence invalide." }, { status: 400 });
  }
}
