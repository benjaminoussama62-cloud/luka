"use client";

import { useEffect } from "react";

async function clearAyebaServiceWorkers() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("ayeba-")).map((k) => caches.delete(k)));
  }
}

/** PWA prod · désactive SW en dev pour éviter chargement bloqué */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      void clearAyebaServiceWorkers();
      return;
    }
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}

export { clearAyebaServiceWorkers };
