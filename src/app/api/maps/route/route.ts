import { NextResponse } from "next/server";
import { fetchRoute } from "@/lib/verticals/maps";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "Paramètres from/to requis." }, { status: 400 });
  }

  const [fLat, fLon] = from.split(",").map(Number);
  const [tLat, tLon] = to.split(",").map(Number);
  if ([fLat, fLon, tLat, tLon].some((n) => Number.isNaN(n))) {
    return NextResponse.json({ error: "Coordonnées invalides." }, { status: 400 });
  }

  const route = await fetchRoute({ lat: fLat, lon: fLon }, { lat: tLat, lon: tLon });
  return NextResponse.json({ route });
}
