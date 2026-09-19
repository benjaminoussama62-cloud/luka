import { NextResponse } from "next/server";
import { advancedSearch } from "@/lib/ayebi/db-sqlite";
import type { SearchFilters } from "@/lib/ayebi/db-sqlite";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "";
  const filters: SearchFilters = {
    category: searchParams.get("category") ?? undefined,
    stub: searchParams.has("stub") ? searchParams.get("stub") === "1" : undefined,
    sortBy: (searchParams.get("sort") as SearchFilters["sortBy"]) ?? "relevance",
    limit: Number(searchParams.get("limit") ?? 30),
  };
  const results = advancedSearch(query, filters);
  return NextResponse.json({ results, total: results.length });
}
