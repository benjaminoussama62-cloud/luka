"use client";

import type { MediaResult } from "@/lib/types";

export function NativeMediaGrid({ items, kind }: { items: MediaResult[]; kind: "image" | "video" }) {
  if (!items.length) {
    return (
      <div className="ayeba-panel p-8 text-center text-[var(--muted)]">
        Aucun résultat {kind === "image" ? "image" : "vidéo"} indexé pour cette requête.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((m) => (
        <a
          key={m.id}
          href={m.url}
          target="_blank"
          rel="noreferrer"
          className="ayeba-panel group overflow-hidden transition hover:border-[var(--line-bright)]"
        >
          {m.thumb.startsWith("http") ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.thumb}
                alt=""
                className="h-52 w-full object-cover transition group-hover:scale-[1.02]"
                loading="lazy"
              />
              {kind === "video" && m.duration ? (
                <span className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-0.5 font-mono text-[10px] text-white">
                  {m.duration}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="flex h-52 items-center justify-center bg-white/[0.03] text-[var(--faint)]">
              {kind === "video" ? "▶" : "◻"}
            </div>
          )}
          <div className="p-3">
            <p className="line-clamp-2 text-sm text-white">{m.title}</p>
            <p className="mt-1 text-[10px] text-[var(--faint)]">{m.source}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
