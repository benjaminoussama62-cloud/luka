import { NextResponse } from "next/server";
import { getAllArticlesMerged } from "@/lib/ayebi/server";
import { resolveApiCredential } from "@/lib/developers/credentials";
import { recordDeveloperRequest } from "@/lib/developers/analytics";

export async function GET(req: Request) {
  const started = Date.now();
  const credential = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.headers.get("x-api-key");
  const resolved = credential ? resolveApiCredential(credential) : null;
  if (!resolved) return NextResponse.json({ error: "API key ou service account requis" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const q = (params.get("q") || "").trim().toLocaleLowerCase();
  const category = (params.get("category") || "").trim().toLocaleLowerCase();
  const tag = (params.get("tag") || "").trim().toLocaleLowerCase();
  const limit = Math.min(Math.max(Number(params.get("limit") || 20), 1), 100);
  const articles = (await getAllArticlesMerged()).filter((article) => {
    const haystack = `${article.title} ${article.subtitle} ${article.summary} ${article.tags.join(" ")}`.toLocaleLowerCase();
    return (!q || haystack.includes(q)) &&
      (!category || article.category.toLocaleLowerCase() === category) &&
      (!tag || article.tags.some((item) => item.toLocaleLowerCase() === tag));
  }).slice(0, limit);
  recordDeveloperRequest(resolved.clientId, 200, Date.now() - started);
  return NextResponse.json({ data: articles, total: articles.length, filters: { q, category, tag, limit } });
}
