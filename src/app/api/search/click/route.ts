import { NextResponse } from "next/server";
import { recordClick } from "@/lib/search-index/fts";
import { extractFeatures, trainFromClick } from "@/lib/search-index/ml-rank";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    query?: string;
    url?: string;
    domain?: string;
    title?: string;
    snippet?: string;
    rankScore?: number;
  };
  const query = String(body.query ?? "").trim();
  const url = String(body.url ?? "").trim();
  const domain = String(body.domain ?? "").trim();

  if (query && url) {
    recordClick(query, url, domain || new URL(url, "https://ayeba.app").hostname);

    if (body.title) {
      const features = extractFeatures(
        {
          title: body.title,
          snippet: body.snippet ?? "",
          url,
          domain: domain || new URL(url, "https://ayeba.app").hostname,
          credibility: 0.6,
          localRelevant: domain.endsWith(".cd"),
        },
        query,
      );
      trainFromClick(features, (body.rankScore ?? 50) + 10, body.rankScore ?? 40);
    }
  }

  return NextResponse.json({ ok: true });
}
