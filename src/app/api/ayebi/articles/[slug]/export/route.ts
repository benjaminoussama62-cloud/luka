import { NextResponse } from "next/server";
import { getAyebiArticleLive } from "@/lib/ayebi/server";
import { articleEpub, articlePdf } from "@/lib/ayebi/export";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const article = await getAyebiArticleLive(slug);
  if (!article) return NextResponse.json({ error: "Fiche introuvable." }, { status: 404 });
  const format = new URL(req.url).searchParams.get("format")?.toLowerCase();
  if (format === "pdf") return new Response(articlePdf(article), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${slug}.pdf"` } });
  if (format === "epub") return new Response(articleEpub(article), { headers: { "content-type": "application/epub+zip", "content-disposition": `attachment; filename="${slug}.epub"` } });
  return NextResponse.json({ error: "Format supporté: pdf ou epub." }, { status: 400 });
}
