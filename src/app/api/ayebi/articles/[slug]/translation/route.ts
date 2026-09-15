import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { getTranslation, translateArticle } from "@/lib/ayebi/platform";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const language = new URL(req.url).searchParams.get("language") || "en";
  return NextResponse.json({ translation: getTranslation(slug, language) });
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const { slug } = await ctx.params;
  const body = (await req.json()) as { language?: string };
  if (!body.language) return NextResponse.json({ error: "Langue requise." }, { status: 400 });
  try {
    return NextResponse.json({ translation: await translateArticle(slug, body.language, session.id) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Traduction impossible." }, { status: 400 });
  }
}
