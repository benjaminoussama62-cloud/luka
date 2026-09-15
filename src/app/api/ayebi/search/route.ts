import { NextResponse } from "next/server";
import { searchAyebiArticlesLive } from "@/lib/ayebi/server";
import { liveSearch } from "@/lib/real-search";

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ error: "q requis." }, { status: 400 });
  const [articles, web] = await Promise.all([
    searchAyebiArticlesLive(query, 10),
    liveSearch(query, { zeroAi: true, zeroAds: true, privateMode: true, sliders: { audience: 35, authority: 55, locality: 40 } }),
  ]);
  return NextResponse.json({ ayebi: articles, ayeba: web.results.slice(0, 10), knowledge: web.knowledge });
}
