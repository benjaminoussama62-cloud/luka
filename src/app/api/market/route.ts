import { NextResponse } from "next/server";
import { getMarketData } from "@/lib/market";

export async function GET() {
  try {
    const data = await getMarketData();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Marchés indisponibles" }, { status: 500 });
  }
}
