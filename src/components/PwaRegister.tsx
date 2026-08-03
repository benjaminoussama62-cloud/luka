"use client";

import { useEffect } from "react";

/** Enregistre le service worker PWA (cache basique + offline shell). */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore offline/file:// */
    });
  }, []);
  return null;
}
