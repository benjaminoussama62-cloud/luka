import { NextResponse } from "next/server";
import { suggestQueries } from "@/lib/ayeba-index";

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

  // Enrichir avec Wikipedia OpenSearch FR
  let wiki: string[] = [];
  if (q.trim().length >= 2) {
    try {
      const res = await fetch(
        `https://fr.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=6&namespace=0&format=json&origin=*`,
        { next: { revalidate: 0 } },
      );
      if (res.ok) {
        const data = (await res.json()) as [string, string[]];
        wiki = data[1] ?? [];
      }
    } catch {
      /* ignore */
    }
  }

  const local = suggestQueries(q, history);
  const merged = [...new Set([...local.slice(0, 4), ...wiki, ...local.slice(4)])].slice(0, 10);
  return NextResponse.json({ suggestions: merged });
}
