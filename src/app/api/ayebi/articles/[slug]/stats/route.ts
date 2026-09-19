import { NextResponse } from "next/server";
import { getArticleStats, recordPageView } from "@/lib/ayebi/db-sqlite";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const stats = getArticleStats(slug);
  return NextResponse.json(stats);
}

export async function POST(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  recordPageView(slug);
  return NextResponse.json({ ok: true });
}
