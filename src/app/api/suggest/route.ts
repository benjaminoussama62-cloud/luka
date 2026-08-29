import { NextResponse } from "next/server";
import { suggestQueries } from "@/lib/ayeba-index";
import { scoreBrandDoc, suggestBrandQueries, BRAND_SEARCH_DOCS } from "@/lib/sister-search";

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

  const brands = suggestBrandQueries(q);
  const strongBrand = BRAND_SEARCH_DOCS.some((d) => scoreBrandDoc(d, q) >= 150);

  let wiki: string[] = [];
  if (q.trim().length >= 2 && !strongBrand) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 600);
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
  const merged = [...new Set([...brands, ...local.slice(0, 3), ...wiki, ...local.slice(3)])].slice(0, 10);

  if (searchParams.get("format") === "opensearch") {
    return NextResponse.json([q, merged]);
  }

  return NextResponse.json({ suggestions: merged });
}
