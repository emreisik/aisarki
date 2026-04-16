// IndexedDB yardımcısı — recently played (şu an sadece saveRecentSong kullanılıyor)
import { Song } from "@/types";

const DB_NAME = "hubeya";
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
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

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
