const CACHE = "aisarki-v1";
const PRECACHE = ["/", "/discover", "/create", "/playlists", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // API, ses dosyaları ve dış kaynaklar → her zaman network
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname !== self.location.hostname ||
    e.request.destination === "audio"
  ) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Navigasyon → network-first, offline'da cache
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/") ?? fetch(e.request)),
    );
    return;
  }

  // Statik dosyalar → cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => cached ?? fetch(e.request)),
  );
});
