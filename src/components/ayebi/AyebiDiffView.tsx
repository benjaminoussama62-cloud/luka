"use client";

import type { DiffLine } from "@/lib/ayebi/diff";

export function AyebiDiffView({ lines }: { lines: DiffLine[] }) {
  if (!lines.length) {
    return <p className="text-sm text-[var(--muted)]">Aucune différence.</p>;
  }

  return (
    <div className="ayeba-panel overflow-hidden font-mono text-xs leading-relaxed">
      {lines.map((line, i) => (
        <div
          key={`${i}-${line.type}-${line.text.slice(0, 20)}`}
          className={
            line.type === "add"
              ? "bg-[rgba(0,200,120,0.12)] px-4 py-0.5 text-[var(--good)]"
              : line.type === "remove"
                ? "bg-[rgba(255,80,80,0.1)] px-4 py-0.5 text-[var(--bad)] line-through opacity-80"
                : "px-4 py-0.5 text-[var(--muted)]"
          }
        >
          <span className="mr-2 inline-block w-4 select-none opacity-50">
            {line.type === "add" ? "+" : line.type === "remove" ? "−" : " "}
          </span>
          {line.text || "\u00a0"}
        </div>
      ))}
    </div>
  );
}
