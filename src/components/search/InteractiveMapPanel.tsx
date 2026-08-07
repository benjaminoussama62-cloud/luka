"use client";

import { useMemo, useState } from "react";
import type { MapPlace } from "@/lib/types";

export function InteractiveMapPanel({ places }: { places: MapPlace[] }) {
  const [selected, setSelected] = useState(0);
  const [route, setRoute] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [routing, setRouting] = useState(false);

  const center = places[selected] ?? places[0];
  const embed = useMemo(() => {
    if (!center) return "";
    const pad = 0.08;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${center.lon - pad}%2C${center.lat - pad * 0.7}%2C${center.lon + pad}%2C${center.lat + pad * 0.7}&layer=mapnik&marker=${center.lat}%2C${center.lon}`;
  }, [center]);

  async function calcRoute(toIdx: number) {
    if (!center || toIdx === selected) return;
    setRouting(true);
    const to = places[toIdx];
    try {
      const res = await fetch(
        `/api/maps/route?from=${center.lat},${center.lon}&to=${to.lat},${to.lon}`,
      );
      const data = (await res.json()) as { route?: { distanceKm: number; durationMin: number } };
      setRoute(data.route ?? null);
    } catch {
      setRoute(null);
    }
    setRouting(false);
  }

  if (!places.length) {
    return <div className="ayeba-panel p-8 text-center text-[var(--muted)]">Aucun lieu trouvé</div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="ayeba-panel overflow-hidden">
        <iframe title="Carte interactive" src={embed} className="h-[420px] w-full border-0" loading="lazy" />
        {route ? (
          <div className="border-t border-[var(--line)] px-5 py-3 text-sm text-[var(--muted)]">
            Itinéraire · {route.distanceKm} km · ~{route.durationMin} min (OSRM)
          </div>
        ) : null}
      </div>

      <ul className="ayeba-panel max-h-[420px] divide-y divide-[var(--line)] overflow-y-auto">
        {places.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => {
                setSelected(i);
                setRoute(null);
              }}
              className={`block w-full px-4 py-3 text-left transition ${
                selected === i ? "bg-[rgba(0,180,255,0.08)]" : "hover:bg-white/[0.03]"
              }`}
            >
              <span className="font-medium text-white">{p.name}</span>
              <span className="mt-1 block text-xs capitalize text-[var(--faint)]">{p.category}</span>
              <span className="mt-1 block line-clamp-2 text-xs text-[var(--muted)]">{p.address}</span>
              {selected === i && places.length > 1 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {places.slice(0, 4).map((dest, j) =>
                    j !== i ? (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          calcRoute(j);
                        }}
                        className="ayeba-ghost px-2 py-1 text-[10px]"
                      >
                        → {dest.name.slice(0, 12)}
                      </button>
                    ) : null,
                  )}
                  {routing ? <span className="text-[10px] text-[var(--faint)]">Calcul…</span> : null}
                </div>
              ) : null}
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-[10px] text-[var(--link)]"
                onClick={(e) => e.stopPropagation()}
              >
                OSM ↗
              </a>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
