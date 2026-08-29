import { NextResponse } from "next/server";
import { suggestQueries } from "@/lib/ayeba-index";
import {
  scoreBrandDoc,
  suggestBrandQueries,
  BRAND_SEARCH_DOCS,
} from "@/lib/sister-search";
import { isStrongBrandQuery, meaningfulTokens, navigationalSiteForQuery } from "@/lib/search-relevance";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const historyRaw = searchParams.get("history") ?? "[]";
  let history: string[] = [];
  try {
    history = JSON.parse(historyRaw) as string[];
  } catch {
    history = [];
  }

  const nav = navigationalSiteForQuery(q);
  const navSuggest = nav ? [nav.title, nav.url.replace(/^https?:\/\//, "")] : [];

  const brands = isStrongBrandQuery(q) ? suggestBrandQueries(q) : suggestBrandQueries(q).slice(0, 2);
  const strongBrand = BRAND_SEARCH_DOCS.some((d) => scoreBrandDoc(d, q) >= 150);

  let wiki: string[] = [];
  const tokens = meaningfulTokens(q);
  if (q.trim().length >= 2 && tokens.length > 0) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 800);
      const res = await fetch(
        `https://fr.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=8&namespace=0&format=json&origin=*`,
        { signal: ctrl.signal, next: { revalidate: 0 } },
      );
      clearTimeout(t);
      if (res.ok) {
        const data = (await res.json()) as [string, string[]];
        wiki = data[1] ?? [];
      }
    } catch {
      /* ignore */
    }
  }

  const local = suggestQueries(q, history);
  const merged = [
    ...new Set([
      ...navSuggest,
      ...(strongBrand ? brands : []),
      ...wiki,
      ...local.slice(0, 4),
      ...(!strongBrand ? brands : []),
      ...local.slice(4),
    ]),
  ].slice(0, 10);

  if (searchParams.get("format") === "opensearch") {
    return NextResponse.json([q, merged]);
  }

  return NextResponse.json({ suggestions: merged });
}
