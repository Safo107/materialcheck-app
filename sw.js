const CACHE_NAME = "mc-assets-v2";

// Nur gehashte Assets cachen (JS/CSS/Bilder) — kein HTML
const ASSET_PATTERN = /\/_expo\/static\/|\/assets\//;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // HTML immer frisch vom Server laden — Browser-HTTP-Cache umgehen
  if (
    event.request.mode === "navigate" ||
    event.request.headers.get("accept")?.includes("text/html")
  ) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Gehashte Assets: Cache-first
  if (ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
            return res;
          })
      )
    );
    return;
  }

  // Alles andere: Netzwerk
  event.respondWith(fetch(event.request));
});
