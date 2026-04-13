import { Song } from "@/types";
import fs from "fs";
import path from "path";

declare global {
  // eslint-disable-next-line no-var
  var __taskStore: Map<string, Song[]> | undefined;
  // eslint-disable-next-line no-var
  var __allSongs: Song[] | undefined;
}

const SONGS_FILE = path.join(process.cwd(), "data", "songs.json");

function ensureDataDir() {
  const dir = path.dirname(SONGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadFromDisk(): Song[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(SONGS_FILE)) return [];
    const raw = fs.readFileSync(SONGS_FILE, "utf-8");
    return JSON.parse(raw) as Song[];
  } catch {
    return [];
  }
}

function saveToDisk(songs: Song[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(SONGS_FILE, JSON.stringify(songs, null, 2), "utf-8");
  } catch (e) {
    console.error("[taskStore] Diske yazılamadı:", e);
  }
}

const taskStore: Map<string, Song[]> =
  global.__taskStore ?? (global.__taskStore = new Map<string, Song[]>());

// İlk yüklemede diskten oku
const allSongs: Song[] =
  global.__allSongs ?? (global.__allSongs = loadFromDisk());

export function setTaskSongs(taskId: string, songs: Song[]): void {
  taskStore.set(taskId, songs);

  const existingIds = new Set(allSongs.map((s) => s.id));
  const newSongs = songs.filter(
    (s) => s.status === "complete" && !existingIds.has(s.id),
  );

  if (newSongs.length > 0) {
    allSongs.unshift(...newSongs);
    saveToDisk(allSongs);
    console.log(
      `[taskStore] ${newSongs.length} şarkı eklendi, toplam=${allSongs.length}`,
    );
  }
}

export function getTaskSongs(taskId: string): Song[] | undefined {
  return taskStore.get(taskId);
}

export function getAllSongs(): Song[] {
  return allSongs;
}

export function deleteTask(taskId: string): void {
  taskStore.delete(taskId);
}
