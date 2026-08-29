import { NextResponse } from "next/server";
import { suggestQueries } from "@/lib/ayeba-index";
import { searchSisterApps } from "@/lib/sister-search";

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

  const sister = searchSisterApps(q).map((d) => d.title.split("—")[0].trim());
  const local = suggestQueries(q, history);

  // Wikipedia OpenSearch — court timeout pour ne pas ralentir l’autocomplete
  let wiki: string[] = [];
  if (q.trim().length >= 2 && sister.length === 0) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 700);
      const res = await fetch(
        `https://fr.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=6&namespace=0&format=json&origin=*`,
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

  // Apps sœurs d’abord (évite « Dorothée Jemma » avant JEMSA)
  const merged = [...new Set([...sister, ...local.slice(0, 4), ...wiki, ...local.slice(4)])].slice(
    0,
    10,
  );

  if (searchParams.get("format") === "opensearch") {
    return NextResponse.json([q, merged]);
  }

  return NextResponse.json({ suggestions: merged });
}
