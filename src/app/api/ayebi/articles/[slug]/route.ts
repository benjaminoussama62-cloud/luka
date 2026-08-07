import { NextResponse } from "next/server";
import { authorFromSession } from "@/lib/ayebi/author";
import { getAyebiArticleLive, getStoredArticle, saveArticle } from "@/lib/ayebi/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import type { AyebiArticle } from "@/lib/ayebi/types";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const article = await getAyebiArticleLive(slug);
  if (!article) {
    return NextResponse.json({ error: "Fiche introuvable." }, { status: 404 });
  }
  const stored = await getStoredArticle(slug);
  return NextResponse.json({ article, meta: stored ?? null, editable: true });
}

export async function PUT(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Connectez-vous pour modifier." }, { status: 401 });
  }

  const { slug } = await ctx.params;
  const body = (await req.json()) as Partial<AyebiArticle> & { editSummary?: string };

  if (body.slug && body.slug !== slug) {
    return NextResponse.json({ error: "Impossible de renommer l'identifiant ici." }, { status: 400 });
  }

  const current = await getAyebiArticleLive(slug);
  const article: AyebiArticle = {
    slug,
    title: String(body.title ?? current?.title ?? "").trim(),
    subtitle: String(body.subtitle ?? current?.subtitle ?? "").trim(),
    category: body.category ?? current?.category ?? "lieu",
    summary: String(body.summary ?? current?.summary ?? "").trim(),
    body: body.body ?? current?.body ?? [],
    sections: body.sections ?? current?.sections,
    timeline: body.timeline ?? current?.timeline,
    facts: body.facts ?? current?.facts ?? [],
    image: body.image ?? current?.image,
    tags: body.tags ?? current?.tags ?? [],
    relatedSlugs: body.relatedSlugs ?? current?.relatedSlugs,
  };

  const result = await saveArticle(article, authorFromSession(session), String(body.editSummary ?? ""));
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ article: result.article });
}
