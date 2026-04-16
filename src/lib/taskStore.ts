import { Song } from "@/types";
import sql from "./db";
import { keyToCdnUrl } from "./bunnyStorage";

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
  await sql`
    CREATE TABLE IF NOT EXISTS follows (
      follower_id  TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (follower_id, following_id)
    )
  `;
  // Eski tablolara eksik kolonları ekle (idempotent)
  for (const stmt of [
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS task_id TEXT`,
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS created_by TEXT`,
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS audio_key TEXT`,
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS image_key TEXT`,
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS play_count INT NOT NULL DEFAULT 0`,
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS play_count_7d INT NOT NULL DEFAULT 0`,
    sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by TEXT`,
    sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS error_title TEXT`,
    sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS error_message TEXT`,
    sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS payload JSONB`,
    sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS endpoint TEXT`,
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_listeners INT NOT NULL DEFAULT 0`,
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_streams INT NOT NULL DEFAULT 0`,
  ]) {
    try {
      await stmt;
    } catch {
      /* zaten var */
    }
  }
  // song_plays tablosu — her stream event'i burada
  await sql`
    CREATE TABLE IF NOT EXISTS song_plays (
      id                SERIAL PRIMARY KEY,
      song_id           TEXT NOT NULL,
      user_id           TEXT,
      session_id        TEXT,
      duration_listened INT NOT NULL DEFAULT 0,
      counted_as_stream BOOLEAN NOT NULL DEFAULT FALSE,
      played_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  for (const stmt of [
    sql`CREATE INDEX IF NOT EXISTS idx_song_plays_song_played ON song_plays (song_id, played_at DESC)`,
    sql`CREATE INDEX IF NOT EXISTS idx_song_plays_user_song ON song_plays (user_id, song_id, played_at DESC)`,
    sql`CREATE INDEX IF NOT EXISTS idx_song_plays_session_song ON song_plays (session_id, song_id, played_at DESC)`,
    sql`CREATE INDEX IF NOT EXISTS idx_song_plays_played_at ON song_plays (played_at DESC) WHERE counted_as_stream = TRUE`,
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
  payload?: Record<string, unknown>,
  endpoint?: "music" | "sounds",
): Promise<void> {
  await ensureSchema();
  await sql`
    INSERT INTO tasks (task_id, prompt, created_by, payload, endpoint)
    VALUES (
      ${taskId},
      ${prompt},
      ${userId ?? null},
      ${payload ? JSON.stringify(payload) : null},
      ${endpoint ?? null}
    )
    ON CONFLICT (task_id) DO NOTHING
  `;
}

export interface TaskPayload {
  taskId: string;
  payload: Record<string, unknown> | null;
  endpoint: string | null;
  userId: string | null;
  prompt: string;
}

export async function getTaskPayload(
  taskId: string,
): Promise<TaskPayload | null> {
  try {
    await ensureSchema();
    const rows = await sql`
      SELECT task_id, payload, endpoint, created_by, prompt
      FROM tasks
      WHERE task_id = ${taskId}
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      taskId: r.task_id as string,
      payload: (r.payload as Record<string, unknown> | null) ?? null,
      endpoint: (r.endpoint as string | null) ?? null,
      userId: (r.created_by as string | null) ?? null,
      prompt: (r.prompt as string) ?? "",
    };
  } catch {
    return null;
  }
}

export async function markTaskComplete(taskId: string): Promise<void> {
  try {
    await ensureSchema();
    await sql`UPDATE tasks SET status = 'complete' WHERE task_id = ${taskId}`;
  } catch {
    /* sessizce geç */
  }
}

export async function markTaskFailed(
  taskId: string,
  errorTitle: string,
  errorMessage: string,
): Promise<void> {
  try {
    await ensureSchema();
    await sql`
      UPDATE tasks
      SET status = 'failed',
          error_title = ${errorTitle},
          error_message = ${errorMessage}
      WHERE task_id = ${taskId}
    `;
    console.log(`[db] task ${taskId} → failed: ${errorTitle}`);
  } catch (e) {
    console.error("[db] markTaskFailed hatası:", e);
  }
}

export async function getTaskCreatedBy(taskId: string): Promise<string | null> {
  try {
    await ensureSchema();
    const rows =
      await sql`SELECT created_by FROM tasks WHERE task_id = ${taskId} LIMIT 1`;
    return (rows[0]?.created_by as string) ?? null;
  } catch {
    return null;
  }
}

export interface ProcessingTask {
  taskId: string;
  prompt: string;
  startedAt: string;
  status: "processing" | "failed";
  // Suno callback "first" aşamasında geçici cover image gelir — UI blur'lu gösterir
  imageUrl?: string;
  title?: string;
  errorTitle?: string;
  errorMessage?: string;
}

export async function getProcessingTasks(
  userId?: string,
): Promise<ProcessingTask[]> {
  try {
    await ensureSchema();
    const rows = userId
      ? await sql`
          SELECT task_id, prompt, created_at, status, error_title, error_message
          FROM tasks
          WHERE status IN ('processing', 'failed')
            AND created_at > NOW() - INTERVAL '2 hours'
            AND created_by = ${userId}
          ORDER BY created_at DESC
        `
      : await sql`
          SELECT task_id, prompt, created_at, status, error_title, error_message
          FROM tasks
          WHERE status IN ('processing', 'failed')
            AND created_at > NOW() - INTERVAL '2 hours'
          ORDER BY created_at DESC
        `;
    return rows.map((r) => {
      const taskId = r.task_id as string;
      const cached = taskStore.get(taskId);
      const firstWithImage = cached?.find((s) => s.imageUrl);
      return {
        taskId,
        prompt: (r.prompt as string) ?? "",
        startedAt:
          r.created_at instanceof Date
            ? r.created_at.toISOString()
            : (r.created_at as string),
        status: (r.status as "processing" | "failed") ?? "processing",
        imageUrl: firstWithImage?.imageUrl,
        title: cached?.[0]?.title,
        errorTitle: (r.error_title as string) ?? undefined,
        errorMessage: (r.error_message as string) ?? undefined,
      };
    });
  } catch {
    return [];
  }
}

export async function dismissFailedTask(
  taskId: string,
  userId: string,
): Promise<void> {
  try {
    await ensureSchema();
    await sql`
      DELETE FROM tasks
      WHERE task_id = ${taskId}
        AND status = 'failed'
        AND created_by = ${userId}
    `;
  } catch (e) {
    console.error("[db] dismissFailedTask hatası:", e);
  }
}

/** Processing veya failed fark etmeksizin sahibi task'ı siler (kullanıcı iptali). */
export async function cancelTask(
  taskId: string,
  userId: string,
): Promise<void> {
  try {
    await ensureSchema();
    await sql`
      DELETE FROM tasks
      WHERE task_id = ${taskId}
        AND created_by = ${userId}
    `;
    // In-memory cache'ten de sil
    taskStore.delete(taskId);
  } catch (e) {
    console.error("[db] cancelTask hatası:", e);
  }
}

/* ── DB helpers ── */

function rowToSong(row: Record<string, unknown>): Song {
  const creatorId = row.creator_id as string | null;
  const creatorName = row.creator_name as string | null;
  const creatorUsername = row.creator_username as string | null;
  const creatorImage = row.creator_image as string | null;

  // Kalıcı CDN URL'i varsa onu tercih et, yoksa Suno URL fallback
  const audioKey = row.audio_key as string | null;
  const imageKey = row.image_key as string | null;
  const audioUrl =
    (audioKey && keyToCdnUrl(audioKey)) ||
    (row.audio_url as string | null) ||
    undefined;
  const imageUrl =
    (imageKey && keyToCdnUrl(imageKey)) ||
    (row.image_url as string | null) ||
    undefined;

  return {
    id: row.id as string,
    title: row.title as string,
    style: (row.style as string | null) ?? undefined,
    prompt: (row.prompt as string | null) ?? undefined,
    audioUrl,
    streamUrl: (row.stream_url as string | null) ?? undefined,
    imageUrl,
    duration: row.duration != null ? Number(row.duration) : undefined,
    status: row.status as Song["status"],
    playCount: row.play_count != null ? Number(row.play_count) : undefined,
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
    WHERE s.task_id = ${taskId} AND s.status = 'complete' AND s.audio_key IS NOT NULL
    ORDER BY s.created_at ASC
  `;
  return rows.map(rowToSong);
}

export async function getAllSongs(userId?: string): Promise<Song[]> {
  await ensureSchema();
  const rows = userId
    ? await sql`
        SELECT
          s.*,
          u.id           AS creator_id,
          u.display_name AS creator_name,
          u.username     AS creator_username,
          u.avatar_url   AS creator_image
        FROM songs s
        LEFT JOIN users u ON u.id::text = s.created_by
        WHERE s.created_by = ${userId}
          AND s.audio_key IS NOT NULL
        ORDER BY s.created_at DESC
      `
    : await sql`
        SELECT
          s.*,
          u.id           AS creator_id,
          u.display_name AS creator_name,
          u.username     AS creator_username,
          u.avatar_url   AS creator_image
        FROM songs s
        LEFT JOIN users u ON u.id::text = s.created_by
        WHERE s.audio_key IS NOT NULL
        ORDER BY s.created_at DESC
      `;
  return rows.map(rowToSong);
}

export async function updateSongAudioKey(
  songId: string,
  audioKey: string,
): Promise<void> {
  try {
    await ensureSchema();
    await sql`UPDATE songs SET audio_key = ${audioKey} WHERE id = ${songId}`;
    console.log(`[db] song=${songId} audio_key=${audioKey}`);
  } catch (e) {
    console.error("[db] updateSongAudioKey hatası:", e);
  }
}

export async function updateSongImageKey(
  songId: string,
  imageKey: string,
): Promise<void> {
  try {
    await ensureSchema();
    await sql`UPDATE songs SET image_key = ${imageKey} WHERE id = ${songId}`;
  } catch (e) {
    console.error("[db] updateSongImageKey hatası:", e);
  }
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
        style      = COALESCE(EXCLUDED.style, songs.style),
        prompt     = COALESCE(EXCLUDED.prompt, songs.prompt),
        audio_url  = COALESCE(NULLIF(EXCLUDED.audio_url, ''), songs.audio_url),
        stream_url = COALESCE(NULLIF(EXCLUDED.stream_url, ''), songs.stream_url),
        image_url  = COALESCE(NULLIF(EXCLUDED.image_url, ''), songs.image_url),
        duration   = COALESCE(EXCLUDED.duration, songs.duration),
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

/* ── Kullanıcı profil yardımcıları ── */

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export async function getUserByUsername(
  username: string,
): Promise<PublicUser | null> {
  await ensureSchema();
  const rows = await sql`
    SELECT id, username, display_name, avatar_url, created_at
    FROM users
    WHERE username = ${username}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id as string,
    username: r.username as string,
    displayName: r.display_name as string,
    avatarUrl: (r.avatar_url as string | null) ?? undefined,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

export async function getUserSongs(userId: string): Promise<Song[]> {
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
    WHERE s.status = 'complete' AND s.audio_key IS NOT NULL AND s.created_by = ${userId}
    ORDER BY s.created_at DESC
  `;
  return rows.map(rowToSong);
}

/* ── Follow sistemi ── */

export async function toggleFollow(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  await ensureSchema();
  const existing = await sql`
    SELECT 1 FROM follows
    WHERE follower_id = ${followerId} AND following_id = ${followingId}
    LIMIT 1
  `;
  if (existing.length > 0) {
    await sql`
      DELETE FROM follows
      WHERE follower_id = ${followerId} AND following_id = ${followingId}
    `;
    return false; // artık takip etmiyor
  } else {
    await sql`
      INSERT INTO follows (follower_id, following_id)
      VALUES (${followerId}, ${followingId})
      ON CONFLICT DO NOTHING
    `;
    return true; // artık takip ediyor
  }
}

export async function isFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  await ensureSchema();
  const rows = await sql`
    SELECT 1 FROM follows
    WHERE follower_id = ${followerId} AND following_id = ${followingId}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function getFollowerCount(userId: string): Promise<number> {
  await ensureSchema();
  const rows =
    await sql`SELECT COUNT(*)::int AS n FROM follows WHERE following_id = ${userId}`;
  return (rows[0]?.n as number) ?? 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  await ensureSchema();
  const rows =
    await sql`SELECT COUNT(*)::int AS n FROM follows WHERE follower_id = ${userId}`;
  return (rows[0]?.n as number) ?? 0;
}

/* ── Play tracking (Spotify-style streams) ── */

export interface RecordPlayInput {
  songId: string;
  userId?: string | null;
  sessionId?: string | null;
  durationListened: number;
}

/** 30sn+ dinleme = stream. Aynı user/session + song son 1 saatte tekrar sayılmaz. */
export async function recordPlay(
  input: RecordPlayInput,
): Promise<{ counted: boolean; playCount: number }> {
  await ensureSchema();
  const { songId, userId, sessionId, durationListened } = input;
  const isStream = durationListened >= 30;

  const whoClause =
    userId != null
      ? { field: "user_id", value: userId }
      : sessionId != null
        ? { field: "session_id", value: sessionId }
        : null;

  // Dedup: aynı dinleyici son 1 saatte stream kaydettiyse, sadece play_count artırma
  let alreadyStreamed = false;
  if (isStream && whoClause) {
    const recent =
      whoClause.field === "user_id"
        ? await sql`
            SELECT 1 FROM song_plays
            WHERE song_id = ${songId}
              AND user_id = ${whoClause.value}
              AND counted_as_stream = TRUE
              AND played_at > NOW() - INTERVAL '1 hour'
            LIMIT 1
          `
        : await sql`
            SELECT 1 FROM song_plays
            WHERE song_id = ${songId}
              AND session_id = ${whoClause.value}
              AND counted_as_stream = TRUE
              AND played_at > NOW() - INTERVAL '1 hour'
            LIMIT 1
          `;
    alreadyStreamed = recent.length > 0;
  }

  const countAsStream = isStream && !alreadyStreamed;

  await sql`
    INSERT INTO song_plays (song_id, user_id, session_id, duration_listened, counted_as_stream)
    VALUES (${songId}, ${userId ?? null}, ${sessionId ?? null}, ${durationListened}, ${countAsStream})
  `;

  if (countAsStream) {
    const rows = await sql`
      UPDATE songs
      SET play_count = play_count + 1,
          play_count_7d = play_count_7d + 1
      WHERE id = ${songId}
      RETURNING play_count
    `;
    const pc = (rows[0]?.play_count as number) ?? 0;
    return { counted: true, playCount: pc };
  }

  const rows =
    await sql`SELECT play_count FROM songs WHERE id = ${songId} LIMIT 1`;
  return { counted: false, playCount: (rows[0]?.play_count as number) ?? 0 };
}

export interface UserStats {
  monthlyListeners: number;
  totalStreams: number;
  songCount: number;
}

export async function getUserStats(userId: string): Promise<UserStats> {
  await ensureSchema();
  const rows = await sql`
    SELECT
      COALESCE(u.monthly_listeners, 0)::int AS monthly_listeners,
      COALESCE(u.total_streams, 0)::int     AS total_streams,
      (SELECT COUNT(*)::int FROM songs s
         WHERE s.created_by = ${userId}
           AND s.status = 'complete'
           AND s.audio_key IS NOT NULL) AS song_count
    FROM users u
    WHERE u.id = ${userId}
    LIMIT 1
  `;
  const r = rows[0];
  return {
    monthlyListeners: (r?.monthly_listeners as number) ?? 0,
    totalStreams: (r?.total_streams as number) ?? 0,
    songCount: (r?.song_count as number) ?? 0,
  };
}

/** Son N gün stream'e göre top şarkılar. */
export async function getTrendingSongs(
  days: number = 7,
  limit: number = 50,
): Promise<Song[]> {
  await ensureSchema();
  const rows = await sql`
    SELECT
      s.*,
      u.id           AS creator_id,
      u.display_name AS creator_name,
      u.username     AS creator_username,
      u.avatar_url   AS creator_image,
      COUNT(sp.id)::int AS trend_count
    FROM songs s
    LEFT JOIN users u ON u.id::text = s.created_by
    LEFT JOIN song_plays sp
      ON sp.song_id = s.id
     AND sp.counted_as_stream = TRUE
     AND sp.played_at > NOW() - (${days}::text || ' days')::interval
    WHERE s.status = 'complete' AND s.audio_key IS NOT NULL
    GROUP BY s.id, u.id
    ORDER BY trend_count DESC, s.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(rowToSong);
}

/** Lifetime play_count'a göre top şarkılar. */
export async function getTopSongs(limit: number = 50): Promise<Song[]> {
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
    WHERE s.status = 'complete' AND s.audio_key IS NOT NULL
    ORDER BY s.play_count DESC, s.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(rowToSong);
}

/** Cron: monthly_listeners (28 gün unique user+session), total_streams, play_count_7d denormalize. */
export async function recomputeStats(): Promise<{
  usersUpdated: number;
  songsUpdated: number;
}> {
  await ensureSchema();

  // users.monthly_listeners — 28 gün unique dinleyici (user_id veya session_id)
  const usersRes = await sql`
    WITH user_listeners AS (
      SELECT
        s.created_by AS user_id,
        COUNT(DISTINCT COALESCE(sp.user_id, sp.session_id)) AS n
      FROM songs s
      JOIN song_plays sp ON sp.song_id = s.id
      WHERE sp.counted_as_stream = TRUE
        AND sp.played_at > NOW() - INTERVAL '28 days'
        AND s.created_by IS NOT NULL
      GROUP BY s.created_by
    ),
    user_totals AS (
      SELECT created_by AS user_id, COALESCE(SUM(play_count), 0)::int AS total
      FROM songs
      WHERE created_by IS NOT NULL
      GROUP BY created_by
    )
    UPDATE users u
    SET monthly_listeners = COALESCE((SELECT n FROM user_listeners WHERE user_id = u.id)::int, 0),
        total_streams     = COALESCE((SELECT total FROM user_totals WHERE user_id = u.id), 0)
    RETURNING u.id
  `;

  // songs.play_count_7d — son 7 gün stream sayısı
  const songsRes = await sql`
    WITH s7 AS (
      SELECT song_id, COUNT(*)::int AS n
      FROM song_plays
      WHERE counted_as_stream = TRUE
        AND played_at > NOW() - INTERVAL '7 days'
      GROUP BY song_id
    )
    UPDATE songs s
    SET play_count_7d = COALESCE((SELECT n FROM s7 WHERE song_id = s.id), 0)
    RETURNING s.id
  `;

  return {
    usersUpdated: usersRes.length,
    songsUpdated: songsRes.length,
  };
}
