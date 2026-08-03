"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAyeba } from "@/lib/store";

export function ToolsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const s = useAyeba();
  const { t } = useI18n();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const items = [
    { label: "Recherche Profonde", go: () => s.setDeepResearchOpen(true), close: true },
    { label: "Canevas interactif", go: () => s.setCanvasOpen(true), close: true },
    { label: "Code exécutable", go: () => s.setCodeOpen(true), close: true, disabled: !s.response?.code },
    { label: "Podcast audio", go: () => s.setPodcastOpen(true), close: true },
    { label: "Zéro spam IA", go: () => s.setZeroAi(!s.zeroAi), on: s.zeroAi },
    { label: "Zéro publicité", go: () => s.setZeroAds(!(s.zeroAds || s.privateMode)), on: s.zeroAds || s.privateMode },
    { label: "Mode privé", go: () => s.setPrivateMode(!s.privateMode), on: s.privateMode },
    { label: "Split synthèse", go: () => s.setSplitScreen(!s.splitScreen), on: s.splitScreen },
  ];

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="ayeba-ghost px-4 py-2 text-sm">
        {t("tools")}
      </button>
      {open && (
        <div className="ayeba-glass absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-3xl py-2 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
          <p className="px-4 pb-2 pt-1 text-[10px] uppercase tracking-[0.2em] text-[var(--faint)]">
            Suite Ayeba
          </p>
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              disabled={it.disabled}
              onClick={() => {
                it.go();
                if (it.close) setOpen(false);
              }}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-[var(--muted)] transition hover:bg-white/5 hover:text-white disabled:opacity-35"
            >
              <span>{it.label}</span>
              {it.on ? (
                <span className="rounded-full bg-[rgba(255,45,63,0.2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--red)]">
                  ON
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
