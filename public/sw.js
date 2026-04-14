const CACHE = "aisarki-v2";
const PRECACHE = ["/", "/discover", "/create", "/playlists", "/manifest.json"];

// ── Install ───────────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

// ── Activate ──────────────────────────────────────────────────────
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

// ── Fetch ─────────────────────────────────────────────────────────
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // API, ses dosyaları ve dış kaynaklar → her zaman network
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname !== self.location.hostname ||
    e.request.destination === "audio"
  ) {
    e.respondWith(
      fetch(e.request).catch(
        () =>
          new Response(JSON.stringify({ error: "offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
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

// ── Push Notification ─────────────────────────────────────────────
self.addEventListener("push", (e) => {
  let data = { title: "AI Şarkı", body: "Yeni bir bildirim var!", url: "/" };
  try {
    data = { ...data, ...e.data.json() };
  } catch {
    if (e.data) data.body = e.data.text();
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "aisarki-notification",
      renotify: true,
      data: { url: data.url || "/" },
      actions: [
        { action: "open", title: "Aç" },
        { action: "close", title: "Kapat" },
      ],
    }),
  );
});

// ── Notification Click ────────────────────────────────────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();

  if (e.action === "close") return;

  const targetUrl = e.notification.data?.url || "/";

  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) =>
          c.url.includes(self.location.origin),
        );
        if (existing) {
          existing.focus();
          existing.navigate(targetUrl);
        } else {
          self.clients.openWindow(targetUrl);
        }
      }),
  );
});

// ── Background Sync ───────────────────────────────────────────────
self.addEventListener("sync", (e) => {
  if (e.tag === "generate-queue") {
    e.waitUntil(flushGenerateQueue());
  }
});

async function flushGenerateQueue() {
  const db = await openIDB();
  const items = await getAllFromStore(db, "generateQueue");

  for (const item of items) {
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: item.prompt,
          style: item.style,
          title: item.title,
        }),
      });
      if (res.ok) {
        await deleteFromStore(db, "generateQueue", item.id);
        // Kullanıcıya başarı bildirimi
        self.registration.showNotification("Şarkı kuyruğa alındı", {
          body: `"${item.title}" oluşturma başladı!`,
          icon: "/icon-192.png",
          tag: "sync-success",
        });
      }
    } catch {
      // Sonraki sync'e bırak
    }
  }
}

// ── IndexedDB helpers (SW context) ───────────────────────────────
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("aisarki", 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("recentSongs")) {
        const store = db.createObjectStore("recentSongs", { keyPath: "id" });
        store.createIndex("playedAt", "playedAt");
      }
      if (!db.objectStoreNames.contains("generateQueue")) {
        db.createObjectStore("generateQueue", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteFromStore(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
