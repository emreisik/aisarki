import { Song } from "@/types";
import sql from "./db";

declare global {
  // eslint-disable-next-line no-var
  var __taskStore: Map<string, Song[]> | undefined;
  // eslint-disable-next-line no-var
  var __schemaReady: boolean | undefined;
}

const taskStore: Map<string, Song[]> =
  global.__taskStore ?? (global.__taskStore = new Map<string, Song[]>());

/* ── Tüm tabloları oluştur / migrate et (process başına bir kez) ── */

async function ensureSchema() {
  if (global.__schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      username      TEXT UNIQUE NOT NULL,
      display_name  TEXT NOT NULL,
      avatar_url    TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS songs (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      style      TEXT,
      prompt     TEXT,
      audio_url  TEXT,
      stream_url TEXT,
      image_url  TEXT,
      duration   NUMERIC,
      status     TEXT NOT NULL DEFAULT 'processing',
      task_id    TEXT,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      task_id    TEXT PRIMARY KEY,
      prompt     TEXT,
      status     TEXT NOT NULL DEFAULT 'processing',
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Eski tablolara eksik kolonları ekle (idempotent)
  for (const stmt of [
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS task_id TEXT`,
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS created_by TEXT`,
    sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by TEXT`,
  ]) {
    try {
      await stmt;
    } catch {
      /* zaten var */
    }
  }
  global.__schemaReady = true;
}

/* ── tasks ── */

export async function saveProcessingTask(
  taskId: string,
  prompt: string,
  userId?: string,
): Promise<void> {
  await ensureSchema();
  await sql`
    INSERT INTO tasks (task_id, prompt, created_by)
    VALUES (${taskId}, ${prompt}, ${userId ?? null})
    ON CONFLICT (task_id) DO NOTHING
  `;
}

export async function markTaskComplete(taskId: string): Promise<void> {
  try {
    await ensureSchema();
    await sql`UPDATE tasks SET status = 'complete' WHERE task_id = ${taskId}`;
  } catch {
    /* sessizce geç */
  }
}

export interface ProcessingTask {
  taskId: string;
  prompt: string;
  startedAt: string;
}

export async function getProcessingTasks(): Promise<ProcessingTask[]> {
  try {
    await ensureSchema();
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
  const creatorId = row.creator_id as string | null;
  const creatorName = row.creator_name as string | null;
  const creatorUsername = row.creator_username as string | null;
  const creatorImage = row.creator_image as string | null;

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
    creator:
      creatorId && creatorName && creatorUsername
        ? {
            id: creatorId,
            name: creatorName,
            username: creatorUsername,
            image: creatorImage ?? undefined,
          }
        : undefined,
  };
}

/* ── Public API ── */

export async function getSongById(id: string): Promise<Song | null> {
  await ensureSchema();
  const rows = await sql`
    SELECT
      s.*,
      u.id           AS creator_id,
      u.display_name AS creator_name,
      u.username     AS creator_username,
      u.avatar_url   AS creator_image
    FROM songs s
    LEFT JOIN users u ON u.id::text = s.created_by
    WHERE s.id = ${id}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return rowToSong(rows[0] as Record<string, unknown>);
}

export async function getSongsByTaskId(taskId: string): Promise<Song[]> {
  await ensureSchema();
  const rows = await sql`
    SELECT
      s.*,
      u.id           AS creator_id,
      u.display_name AS creator_name,
      u.username     AS creator_username,
      u.avatar_url   AS creator_image
    FROM songs s
    LEFT JOIN users u ON u.id::text = s.created_by
    WHERE s.task_id = ${taskId} AND s.status = 'complete'
    ORDER BY s.created_at ASC
  `;
  return rows.map(rowToSong);
}

export async function getAllSongs(): Promise<Song[]> {
  await ensureSchema();
  const rows = await sql`
    SELECT
      s.*,
      u.id           AS creator_id,
      u.display_name AS creator_name,
      u.username     AS creator_username,
      u.avatar_url   AS creator_image
    FROM songs s
    LEFT JOIN users u ON u.id::text = s.created_by
    WHERE s.status = 'complete'
    ORDER BY s.created_at DESC
  `;
  return rows.map(rowToSong);
}

export async function upsertSongs(
  songs: Song[],
  taskId?: string,
  creatorId?: string,
): Promise<void> {
  if (songs.length === 0) return;
  await ensureSchema();

  for (const s of songs) {
    await sql`
      INSERT INTO songs (id, title, style, prompt, audio_url, stream_url, image_url, duration, status, created_at, task_id, created_by)
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
        ${s.createdAt},
        ${taskId ?? null},
        ${creatorId ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        title      = EXCLUDED.title,
        style      = EXCLUDED.style,
        prompt     = EXCLUDED.prompt,
        audio_url  = EXCLUDED.audio_url,
        stream_url = EXCLUDED.stream_url,
        image_url  = EXCLUDED.image_url,
        duration   = EXCLUDED.duration,
        status     = EXCLUDED.status,
        task_id    = COALESCE(EXCLUDED.task_id, songs.task_id),
        created_by = COALESCE(EXCLUDED.created_by, songs.created_by)
    `;
  }

  const completed = songs.filter((s) => s.status === "complete");
  if (completed.length > 0) {
    console.log(
      `[db] ${completed.length} şarkı kaydedildi (taskId=${taskId ?? "?"}) id: ${completed.map((s) => s.id).join(", ")}`,
    );
  }
}

export function setTaskSongs(taskId: string, songs: Song[]): void {
  taskStore.set(taskId, songs);
  const completed = songs.filter((s) => s.status === "complete");
  if (completed.length === 0) return;

  sql`SELECT created_by FROM tasks WHERE task_id = ${taskId} LIMIT 1`
    .then((rows) => {
      const creatorId = (rows[0]?.created_by as string | null) ?? undefined;
      return upsertSongs(completed, taskId, creatorId);
    })
    .catch((e) => console.error("[db] upsertSongs hatası:", e));
}

export function getTaskSongs(taskId: string): Song[] | undefined {
  return taskStore.get(taskId);
}

export function deleteTask(taskId: string): void {
  taskStore.delete(taskId);
}
