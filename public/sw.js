/* Ayeba PWA — assets only. Never intercept page navigations (breaks Google in-app browsers). */
const CACHE = "ayeba-v3";
const PRECACHE = ["/manifest.webmanifest", "/brand/ayeba-mark.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never touch HTML navigations, Next runtime, or APIs.
  if (
    req.mode === "navigate" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/__nextjs")
  ) {
    return;
  }

  if (!url.pathname.startsWith("/brand/")) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) void cache.put(req, res.clone());
      return res;
    }),
  );
});
