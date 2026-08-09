"use client";

import { useCallback, useEffect } from "react";
import { useBrowserShell } from "@/lib/browser-shell";
import { useAyeba } from "@/lib/store";

/**
 * Nouvel onglet DANS Ayeba (pas une fenêtre navigateur externe).
 * Ctrl/Cmd+T aussi.
 */
export function NewWindowButton({ className = "" }: { className?: string }) {
  const { openHomeTab } = useBrowserShell();
  const { resetHome } = useAyeba();

  const newTab = useCallback(() => {
    resetHome();
    openHomeTab();
  }, [resetHome, openHomeTab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key !== "t" && e.key !== "T") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      newTab();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newTab]);

  return (
    <button
      type="button"
      className={`ayeba-new-window ${className}`.trim()}
      title="Nouvel onglet (Ctrl+T)"
      aria-label="Ouvrir un nouvel onglet Ayeba"
      onClick={newTab}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
      </svg>
      <span className="ayeba-new-window-label">Nouvel onglet</span>
    </button>
  );
}
