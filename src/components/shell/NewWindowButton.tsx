"use client";

import { useEffect } from "react";

function isInstalledAyebaShell() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: tabbed)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches
  );
}

/** Ouvre une nouvelle fenêtre / onglet Ayeba (comportement type navigateur). */
export function openAyebaWindow(path = "/") {
  const url = new URL(path, window.location.origin).toString();
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Bouton + raccourcis Ctrl/Cmd+T et Ctrl/Cmd+N (app installée)
 * pour ouvrir plusieurs fenêtres comme Edge / Chrome / Yandex.
 */
export function NewWindowButton({ className = "" }: { className?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key !== "t" && e.key !== "n" && e.key !== "T" && e.key !== "N") return;
      if (!isInstalledAyebaShell()) return;
      e.preventDefault();
      openAyebaWindow("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <button
      type="button"
      className={`ayeba-new-window ${className}`.trim()}
      title="Nouvelle fenêtre (Ctrl+T)"
      aria-label="Ouvrir une nouvelle fenêtre Ayeba"
      onClick={() => openAyebaWindow("/")}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M4 4h10v2H6v8H4V4zm6 4h10v12H10V8zm2 2v8h6v-8h-6z"
        />
      </svg>
      <span className="ayeba-new-window-label">Nouveau</span>
    </button>
  );
}
