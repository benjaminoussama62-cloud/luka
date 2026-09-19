"use client";

import { useState } from "react";
import type { TOCEntry } from "@/lib/ayebi/wiki-markup";

export function AyebiTOC({ entries }: { entries: TOCEntry[] }) {
  const [collapsed, setCollapsed] = useState(false);
  if (entries.length < 2) return null;

  return (
    <nav className="ayeba-toc my-6 inline-block min-w-[220px] max-w-[320px] rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-4">
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-white">Sommaire</p>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="font-mono text-[10px] text-[var(--faint)] hover:text-white"
        >
          [{collapsed ? "afficher" : "masquer"}]
        </button>
      </div>
      {!collapsed && (
        <ol className="space-y-1">
          {entries.map((e) => (
            <li
              key={`${e.num}-${e.id}`}
              className={e.level === 3 ? "pl-5" : ""}
            >
              <a
                href={`#${e.id}`}
                className="flex gap-2 text-[13px] text-[rgba(0,200,255,0.85)] hover:underline"
              >
                <span className="shrink-0 font-mono text-[11px] text-[var(--faint)]">{e.num}</span>
                <span>{e.heading}</span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
}
