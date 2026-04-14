// IndexedDB yardımcısı — recently played + generate queue
import { Song } from "@/types";

const DB_NAME = "aisarki";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
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

// ── Recently Played ──────────────────────────────────────────────

export async function saveRecentSong(song: Song): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("recentSongs", "readwrite");
    const store = tx.objectStore("recentSongs");
    store.put({ ...song, playedAt: Date.now() });

    // 50'den fazlaysa en eskiyi sil
    const idx = store.index("playedAt");
    const curReq = idx.openCursor(null, "prev");
    let count = 0;
    curReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (!cursor) return;
      count++;
      if (count > 50) cursor.delete();
      else cursor.continue();
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getRecentSongs(): Promise<Song[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("recentSongs", "readonly");
    const idx = tx.objectStore("recentSongs").index("playedAt");
    const req = idx.getAll();
    req.onsuccess = () => {
      const songs = (req.result as (Song & { playedAt: number })[])
        .sort((a, b) => b.playedAt - a.playedAt)
        .slice(0, 20);
      resolve(songs);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Generate Queue (Background Sync) ────────────────────────────

export interface QueuedGenerate {
  id?: number;
  prompt: string;
  style: string;
  title: string;
  timestamp: number;
}

export async function enqueueGenerate(
  item: Omit<QueuedGenerate, "id" | "timestamp">,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("generateQueue", "readwrite");
    tx.objectStore("generateQueue").add({ ...item, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllQueued(): Promise<QueuedGenerate[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("generateQueue", "readonly");
    const req = tx.objectStore("generateQueue").getAll();
    req.onsuccess = () => resolve(req.result as QueuedGenerate[]);
    req.onerror = () => reject(req.error);
  });
}

export async function clearQueued(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("generateQueue", "readwrite");
    tx.objectStore("generateQueue").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
