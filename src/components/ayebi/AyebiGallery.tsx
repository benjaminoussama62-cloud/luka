"use client";

import { useState } from "react";
import type { AyebiGalleryImage } from "@/lib/ayebi/types";

export function AyebiGallery({ images }: { images: AyebiGalleryImage[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightbox(i)}
            className="group relative overflow-hidden rounded-xl border border-[var(--line)] bg-black"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.caption}
              className="h-36 w-full object-cover opacity-85 transition group-hover:opacity-100 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
              <p className="line-clamp-2 text-left text-[11px] text-white">{img.caption}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[lightbox].url}
              alt={images[lightbox].caption}
              className="max-h-[80vh] w-full rounded-xl object-contain"
            />
            <div className="mt-3 text-center">
              <p className="text-sm text-white">{images[lightbox].caption}</p>
              {images[lightbox].credit && (
                <p className="mt-1 text-xs text-[var(--faint)]">© {images[lightbox].credit}</p>
              )}
            </div>
            <div className="mt-4 flex justify-center gap-4">
              <button
                type="button"
                disabled={lightbox === 0}
                onClick={() => setLightbox((l) => (l !== null ? l - 1 : l))}
                className="ayeba-ghost px-4 py-2 text-xs disabled:opacity-30"
              >
                ← Précédent
              </button>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="ayeba-ghost px-4 py-2 text-xs"
              >
                ✕ Fermer
              </button>
              <button
                type="button"
                disabled={lightbox === images.length - 1}
                onClick={() => setLightbox((l) => (l !== null ? l + 1 : l))}
                className="ayeba-ghost px-4 py-2 text-xs disabled:opacity-30"
              >
                Suivant →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
