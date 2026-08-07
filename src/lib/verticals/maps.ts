import type { MapPlace } from "../types";

export type RouteInfo = {
  distanceKm: number;
  durationMin: number;
  geometry?: string;
};

export async function fetchNominatimDeep(query: string, limit = 16): Promise<MapPlace[]> {
  const q = query.includes("RDC") || query.includes("Congo") ? query : `${query} République démocratique du Congo`;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=${limit}&addressdetails=1&extratags=1`,
      {
        headers: { "User-Agent": "AyebaSearch/2.0 (maps; contact@ayeba.app)" },
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      type?: string;
      class?: string;
      extratags?: Record<string, string>;
    }>;
    return data.map((p) => ({
      id: String(p.place_id),
      name: p.display_name.split(",")[0] || p.display_name,
      category: p.extratags?.amenity || p.type || p.class || "lieu",
      lat: Number(p.lat),
      lon: Number(p.lon),
      address: p.display_name,
      url: `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=15/${p.lat}/${p.lon}`,
    }));
  } catch {
    return [];
  }
}

export async function fetchRoute(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): Promise<RouteInfo | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: Array<{ distance: number; duration: number }>;
    };
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.round(route.duration / 60),
    };
  } catch {
    return null;
  }
}

/** Lieux RDC prédéfinis pour requêtes vides ou génériques */
export const RDC_LANDMARKS: MapPlace[] = [
  {
    id: "kin",
    name: "Kinshasa",
    category: "capitale",
    lat: -4.3217,
    lon: 15.312,
    address: "Kinshasa, RDC",
    url: "https://www.openstreetmap.org/#map=12/-4.3217/15.312",
  },
  {
    id: "lub",
    name: "Lubumbashi",
    category: "ville",
    lat: -11.664,
    lon: 27.482,
    address: "Lubumbashi, Haut-Katanga",
    url: "https://www.openstreetmap.org/#map=12/-11.664/27.482",
  },
  {
    id: "goma",
    name: "Goma",
    category: "ville",
    lat: -1.678,
    lon: 29.221,
    address: "Goma, Nord-Kivu",
    url: "https://www.openstreetmap.org/#map=12/-1.678/29.221",
  },
  {
    id: "virunga",
    name: "Parc national des Virunga",
    category: "parc",
    lat: -1.52,
    lon: 29.25,
    address: "Nord-Kivu, RDC",
    url: "https://www.openstreetmap.org/#map=10/-1.52/29.25",
  },
];

export async function searchMapsNative(query: string): Promise<MapPlace[]> {
  const places = await fetchNominatimDeep(query);
  if (places.length >= 4) return places;
  const extra = RDC_LANDMARKS.filter(
    (l) =>
      l.name.toLowerCase().includes(query.toLowerCase()) ||
      query.toLowerCase().includes("rdc") ||
      query.toLowerCase().includes("congo"),
  );
  const seen = new Set(places.map((p) => p.id));
  return [...places, ...extra.filter((e) => !seen.has(e.id))];
}
