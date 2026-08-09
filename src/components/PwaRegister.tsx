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

/**
 * PWA: register only in production. Always purge legacy SWs that intercepted navigations
 * (they broke Google in-app browser / WebView loads).
 */
export function PwaRegister() {
  useEffect(() => {
    void (async () => {
      // Drop broken ayeba-v1/v2 navigators first.
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        const script = r.active?.scriptURL || r.waiting?.scriptURL || r.installing?.scriptURL || "";
        if (script.includes("/sw.js")) {
          // Re-register fresh after unregister to pick up v3 (no navigate intercept).
          await r.unregister();
        }
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((k) => k === "ayeba-v1" || k === "ayeba-v2").map((k) => caches.delete(k)),
        );
      }

      if (process.env.NODE_ENV === "development") {
        await clearAyebaServiceWorkers();
        return;
      }
      await navigator.serviceWorker.register("/sw.js").catch(() => {});
    })();
  }, []);

  return null;
}

export { clearAyebaServiceWorkers };
