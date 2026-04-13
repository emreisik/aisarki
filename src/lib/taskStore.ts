import { Song } from "@/types";
import sql from "./db";

// Sadece aktif task'lar için in-memory store (geçici, DB'ye yazılmaz)
declare global {
  // eslint-disable-next-line no-var
  var __taskStore: Map<string, Song[]> | undefined;
}

const taskStore: Map<string, Song[]> =
  global.__taskStore ?? (global.__taskStore = new Map<string, Song[]>());

/* ── DB helpers ── */

function rowToSong(row: Record<string, unknown>): Song {
  return {
    id: row.id as string,
    title: row.title as string,
    style: (row.style as string | null) ?? undefined,
    prompt: (row.prompt as string | null) ?? undefined,
    audioUrl: (row.audio_url as string | null) ?? undefined,
    streamUrl: (row.stream_url as string | null) ?? undefined,
    imageUrl: (row.image_url as string | null) ?? undefined,
    duration: row.duration != null ? Number(row.duration) : undefined,
    status: row.status as Song["status"],
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : (row.created_at as string),
  };
}

/* ── Public API ── */

export async function getSongById(id: string): Promise<Song | null> {
  const rows = await sql`SELECT * FROM songs WHERE id = ${id} LIMIT 1`;
  if (rows.length === 0) return null;
  return rowToSong(rows[0] as Record<string, unknown>);
}

export async function getAllSongs(): Promise<Song[]> {
  const rows = await sql`
    SELECT * FROM songs
    WHERE status = 'complete'
    ORDER BY created_at DESC
  `;
  return rows.map(rowToSong);
}

export async function upsertSongs(songs: Song[]): Promise<void> {
  if (songs.length === 0) return;

  for (const s of songs) {
    await sql`
      INSERT INTO songs (id, title, style, prompt, audio_url, stream_url, image_url, duration, status, created_at)
      VALUES (
        ${s.id},
        ${s.title},
        ${s.style ?? null},
        ${s.prompt ?? null},
        ${s.audioUrl ?? null},
        ${s.streamUrl ?? null},
        ${s.imageUrl ?? null},
        ${s.duration ?? null},
        ${s.status},
        ${s.createdAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        title      = EXCLUDED.title,
        style      = EXCLUDED.style,
        prompt     = EXCLUDED.prompt,
        audio_url  = EXCLUDED.audio_url,
        stream_url = EXCLUDED.stream_url,
        image_url  = EXCLUDED.image_url,
        duration   = EXCLUDED.duration,
        status     = EXCLUDED.status
    `;
  }

  const completed = songs.filter((s) => s.status === "complete");
  if (completed.length > 0) {
    console.log(
      `[db] ${completed.length} şarkı kaydedildi, id: ${completed.map((s) => s.id).join(", ")}`,
    );
  }
}

export function setTaskSongs(taskId: string, songs: Song[]): void {
  taskStore.set(taskId, songs);
  // Completed olanları DB'ye yaz (fire-and-forget)
  const completed = songs.filter((s) => s.status === "complete");
  if (completed.length > 0) {
    upsertSongs(completed).catch((e) =>
      console.error("[db] upsertSongs hatası:", e),
    );
  }
}

export function getTaskSongs(taskId: string): Song[] | undefined {
  return taskStore.get(taskId);
}

export function deleteTask(taskId: string): void {
  taskStore.delete(taskId);
}
