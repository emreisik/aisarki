import { Song } from "@/types";
import sql from "./db";

// Sadece aktif task'lar için in-memory store (geçici, DB'ye yazılmaz)
declare global {
  // eslint-disable-next-line no-var
  var __taskStore: Map<string, Song[]> | undefined;
  // eslint-disable-next-line no-var
  var __tasksTableReady: boolean | undefined;
}

const taskStore: Map<string, Song[]> =
  global.__taskStore ?? (global.__taskStore = new Map<string, Song[]>());

/* ── tasks tablosu ── */

async function ensureTasksTable() {
  if (global.__tasksTableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      task_id   TEXT PRIMARY KEY,
      prompt    TEXT,
      status    TEXT NOT NULL DEFAULT 'processing',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  global.__tasksTableReady = true;
}

export async function saveProcessingTask(
  taskId: string,
  prompt: string,
): Promise<void> {
  await ensureTasksTable();
  await sql`
    INSERT INTO tasks (task_id, prompt)
    VALUES (${taskId}, ${prompt})
    ON CONFLICT (task_id) DO NOTHING
  `;
}

export async function markTaskComplete(taskId: string): Promise<void> {
  try {
    await ensureTasksTable();
    await sql`UPDATE tasks SET status = 'complete' WHERE task_id = ${taskId}`;
  } catch {
    // tasks tablosu yoksa sessizce geç
  }
}

export interface ProcessingTask {
  taskId: string;
  prompt: string;
  startedAt: string;
}

export async function getProcessingTasks(): Promise<ProcessingTask[]> {
  try {
    await ensureTasksTable();
    const rows = await sql`
      SELECT task_id, prompt, created_at
      FROM tasks
      WHERE status = 'processing'
        AND created_at > NOW() - INTERVAL '2 hours'
      ORDER BY created_at DESC
    `;
    return rows.map((r) => ({
      taskId: r.task_id as string,
      prompt: (r.prompt as string) ?? "",
      startedAt:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : (r.created_at as string),
    }));
  } catch {
    return [];
  }
}

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
