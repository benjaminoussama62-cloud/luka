import { NextResponse } from "next/server";
import { slugifyTitle } from "@/lib/ayebi/constants";
import { authorFromSession } from "@/lib/ayebi/author";
import { getAllArticlesMerged, saveArticle } from "@/lib/ayebi/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import type { AyebiArticle, AyebiCategory } from "@/lib/ayebi/types";

export async function GET() {
  const articles = await getAllArticlesMerged();
  return NextResponse.json({ articles, total: articles.length });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Connectez-vous pour créer une fiche." }, { status: 401 });
  }

  const body = (await req.json()) as Partial<AyebiArticle> & { editSummary?: string };
  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Titre requis." }, { status: 400 });
  }

  const slug = String(body.slug ?? slugifyTitle(title)).trim();
  const category = (body.category ?? "lieu") as AyebiCategory;

  const article: AyebiArticle = {
    slug,
    title,
    subtitle: String(body.subtitle ?? "").trim(),
    category,
    summary: String(body.summary ?? "").trim(),
    body: body.body ?? [],
    sections: body.sections,
    timeline: body.timeline,
    facts: body.facts ?? [{ label: "Pays", value: "République démocratique du Congo" }],
    image: body.image,
    tags: body.tags ?? [],
    relatedSlugs: body.relatedSlugs,
  };

  const result = await saveArticle(article, authorFromSession(session), String(body.editSummary ?? ""), {
    create: true,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ article: result.article });
}
