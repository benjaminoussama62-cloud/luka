"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAyeba } from "@/lib/store";

type ToolItem = {
  label: string;
  go: () => void;
  close?: boolean;
  disabled?: boolean;
  on?: boolean;
  kind: "action" | "toggle";
};

export function ToolsMenu() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const s = useAyeba();
  const { t } = useI18n();

  function place() {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 8,
      right: Math.max(12, window.innerWidth - r.right),
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onReposition() {
      place();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  const actions: ToolItem[] = [
    { kind: "action", label: "Recherche profonde", go: () => s.setDeepResearchOpen(true), close: true },
    { kind: "action", label: "Canevas interactif", go: () => s.setCanvasOpen(true), close: true },
    {
      kind: "action",
      label: "Code exécutable",
      go: () => s.setCodeOpen(true),
      close: true,
      disabled: !s.response?.code,
    },
    { kind: "action", label: "Podcast audio", go: () => s.setPodcastOpen(true), close: true },
  ];

  const toggles: ToolItem[] = [
    { kind: "toggle", label: "Zéro spam IA", go: () => s.setZeroAi(!s.zeroAi), on: s.zeroAi },
    {
      kind: "toggle",
      label: "Zéro publicité",
      go: () => s.setZeroAds(!(s.zeroAds || s.privateMode)),
      on: s.zeroAds || s.privateMode,
    },
    { kind: "toggle", label: "Mode privé", go: () => s.setPrivateMode(!s.privateMode), on: s.privateMode },
    { kind: "toggle", label: "Split synthèse", go: () => s.setSplitScreen(!s.splitScreen), on: s.splitScreen },
  ];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={`ayeba-tools-trigger ${open ? "is-open" : ""}`}
      >
        {t("tools")}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="menu"
          className="ayeba-tools-panel"
          style={{ top: pos.top, right: pos.right }}
        >
          <p className="ayeba-tools-heading">Outils</p>
          <div className="ayeba-tools-group">
            {actions.map((it) => (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                className="ayeba-tools-item"
                onClick={() => {
                  it.go();
                  if (it.close) setOpen(false);
                }}
              >
                {it.label}
              </button>
            ))}
          </div>

          <div className="ayeba-tools-divider" />

          <p className="ayeba-tools-heading">Préférences</p>
          <div className="ayeba-tools-group">
            {toggles.map((it) => (
              <button
                key={it.label}
                type="button"
                role="menuitemcheckbox"
                aria-checked={Boolean(it.on)}
                className={`ayeba-tools-item ayeba-tools-toggle ${it.on ? "is-on" : ""}`}
                onClick={() => it.go()}
              >
                <span>{it.label}</span>
                <span className="ayeba-tools-switch" aria-hidden>
                  <span className="ayeba-tools-switch-knob" />
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
