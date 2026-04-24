import { Song, Persona } from "@/types";
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

export async function ensureSchema() {
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
  // Moderasyon: kullanıcı engelleme (iki taraflı etki)
  await sql`
    CREATE TABLE IF NOT EXISTS user_blocks (
      blocker_id TEXT NOT NULL,
      blocked_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (blocker_id, blocked_id)
    )
  `;
  // Feed'den gizleme (tek taraflı, kullanıcıyı engellemeden içeriğini gizler)
  await sql`
    CREATE TABLE IF NOT EXISTS user_hidden (
      user_id    TEXT NOT NULL,
      hidden_id  TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, hidden_id)
    )
  `;
  // Şikayet sistemi
  await sql`
    CREATE TABLE IF NOT EXISTS reports (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      reporter_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id   TEXT NOT NULL,
      reason      TEXT NOT NULL,
      note        TEXT,
      status      TEXT NOT NULL DEFAULT 'open',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS like_count INT NOT NULL DEFAULT 0`,
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS comment_count INT NOT NULL DEFAULT 0`,
    sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by TEXT`,
    sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS error_title TEXT`,
    sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS error_message TEXT`,
    sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS payload JSONB`,
    sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS endpoint TEXT`,
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_listeners INT NOT NULL DEFAULT 0`,
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_streams INT NOT NULL DEFAULT 0`,
    // Whisper telaffuz doğrulama kolonları
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS pronunciation_score INTEGER`,
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS transcribed_lyrics TEXT`,
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS enhanced_audio_key TEXT`,
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT true`,
    // Profil genişletmeleri (Suno-style profile)
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`,
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url TEXT`,
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS genre_tags TEXT[] NOT NULL DEFAULT '{}'::text[]`,
    // Remix kaynağı takibi — kim kimden remix yapmış
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS remix_source_id TEXT`,
    // Görünürlük: public feed'de görünür mü? (default true — mevcut şarkılarla uyumlu)
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE`,
    // Zamanlanmış sözler (LRC formatı, Whisper segments → karaoke render için)
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS lrc TEXT`,
    // Stems (vocal/enstrümantal veya 12-stem ayırma sonuçları)
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS stems_data JSONB`,
    // WAV (HD) format dönüşüm URL'si
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS wav_url TEXT`,
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
  // song_likes — Spotify tarzı beğeni sistemi
  await sql`
    CREATE TABLE IF NOT EXISTS song_likes (
      user_id    TEXT NOT NULL,
      song_id    TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, song_id)
    )
  `;
  // song_comments — Suno tarzı yorum sistemi
  await sql`
    CREATE TABLE IF NOT EXISTS song_comments (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      song_id    TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      body       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS personas (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id         TEXT NOT NULL,
      suno_persona_id TEXT NOT NULL,
      name            TEXT NOT NULL,
      description     TEXT,
      source_song_id  TEXT,
      vocal_start     NUMERIC DEFAULT 0.0,
      vocal_end       NUMERIC DEFAULT 30.0,
      persona_type    TEXT NOT NULL DEFAULT 'voice_persona',
      style           TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  for (const stmt of [
    sql`CREATE INDEX IF NOT EXISTS idx_personas_user ON personas (user_id, created_at DESC)`,
    sql`CREATE INDEX IF NOT EXISTS idx_song_likes_user_created ON song_likes (user_id, created_at DESC)`,
    sql`CREATE INDEX IF NOT EXISTS idx_song_likes_song ON song_likes (song_id)`,
    // Hot path indexleri — discover/charts/feed/profile query'lerini hızlandırır
    sql`CREATE INDEX IF NOT EXISTS idx_songs_listed ON songs (status, created_at DESC) WHERE audio_key IS NOT NULL`,
    sql`CREATE INDEX IF NOT EXISTS idx_songs_owner ON songs (created_by, status, created_at DESC) WHERE audio_key IS NOT NULL`,
    sql`CREATE INDEX IF NOT EXISTS idx_songs_top ON songs (play_count DESC, created_at DESC) WHERE status = 'complete' AND audio_key IS NOT NULL`,
    sql`CREATE INDEX IF NOT EXISTS idx_songs_task ON songs (task_id)`,
    sql`CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows (follower_id, created_at DESC)`,
    sql`CREATE INDEX IF NOT EXISTS idx_follows_following ON follows (following_id)`,
    sql`CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks (blocker_id)`,
    sql`CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks (blocked_id)`,
    sql`CREATE INDEX IF NOT EXISTS idx_user_hidden_user ON user_hidden (user_id)`,
    sql`CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports (status, created_at DESC)`,
    sql`CREATE INDEX IF NOT EXISTS idx_songs_remix_source ON songs (remix_source_id) WHERE remix_source_id IS NOT NULL`,
    sql`CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks (status, created_at DESC) WHERE status IN ('processing', 'failed')`,
    sql`CREATE INDEX IF NOT EXISTS idx_song_comments_song_created ON song_comments (song_id, created_at DESC)`,
    sql`CREATE INDEX IF NOT EXISTS idx_song_comments_user ON song_comments (user_id)`,
  ]) {
    try {
      await stmt;
    } catch {
      /* zaten var */
    }
  }

  // ── Plan & abonelik & kredi ────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS plans (
      id                       TEXT PRIMARY KEY,
      name                     TEXT NOT NULL,
      monthly_credits          INTEGER NOT NULL,
      refresh_period           TEXT NOT NULL,
      price_monthly_usd        INTEGER NOT NULL DEFAULT 0,
      price_yearly_usd         INTEGER NOT NULL DEFAULT 0,
      features                 JSONB NOT NULL DEFAULT '{}'::jsonb,
      stripe_price_id_monthly  TEXT,
      stripe_price_id_yearly   TEXT,
      sort_order               INTEGER NOT NULL DEFAULT 0,
      is_active                BOOLEAN NOT NULL DEFAULT TRUE,
      created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // NOT: users.id prod'da UUID, dev'de TEXT olabilir. Tip uyumsuzluğu FK
  // oluşturmayı bozduğu için user_id'de FK kullanmıyoruz — veri bütünlüğü
  // app seviyesinde sağlanıyor (auth guard + ensureCreditsRow).
  await sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id                TEXT NOT NULL,
      plan_id                TEXT NOT NULL REFERENCES plans(id),
      status                 TEXT NOT NULL,
      billing_period         TEXT NOT NULL,
      current_period_start   TIMESTAMPTZ NOT NULL,
      current_period_end     TIMESTAMPTZ NOT NULL,
      credit_period_end      TIMESTAMPTZ NOT NULL,
      cancel_at_period_end   BOOLEAN NOT NULL DEFAULT FALSE,
      stripe_customer_id     TEXT,
      stripe_subscription_id TEXT UNIQUE,
      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS credits (
      user_id         TEXT PRIMARY KEY,
      balance         INTEGER NOT NULL DEFAULT 0,
      plan_credits    INTEGER NOT NULL DEFAULT 0,
      addon_credits   INTEGER NOT NULL DEFAULT 0,
      last_refresh_at TIMESTAMPTZ,
      next_refresh_at TIMESTAMPTZ,
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS credit_ledger (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id       TEXT NOT NULL,
      delta         INTEGER NOT NULL,
      reason        TEXT NOT NULL,
      ref_task_id   TEXT,
      balance_after INTEGER NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Index'ler — FK yok ama user_id'ye göre sorgu yapıyoruz
  for (const stmt of [
    sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id)`,
  ]) {
    try {
      await stmt;
    } catch {
      /* zaten var */
    }
  }
  for (const stmt of [
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`,
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'free'`,
    // TRY → USD kolon göçü (eski DB'ler için)
    sql`ALTER TABLE plans RENAME COLUMN price_monthly_try TO price_monthly_usd`,
    sql`ALTER TABLE plans RENAME COLUMN price_yearly_try TO price_yearly_usd`,
    sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_active
         ON subscriptions (user_id)
         WHERE status IN ('active', 'trialing', 'past_due')`,
    sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_credit_period
         ON subscriptions (credit_period_end)
         WHERE status IN ('active', 'trialing')`,
    sql`CREATE INDEX IF NOT EXISTS idx_credit_ledger_user
         ON credit_ledger (user_id, created_at DESC)`,
  ]) {
    try {
      await stmt;
    } catch {
      /* zaten var */
    }
  }

  // Plan seed — idempotent upsert
  const { PLAN_DEFINITIONS } = await import("./plans");
  for (const p of Object.values(PLAN_DEFINITIONS)) {
    await sql`
      INSERT INTO plans (
        id, name, monthly_credits, refresh_period,
        price_monthly_usd, price_yearly_usd, features, sort_order
      )
      VALUES (
        ${p.id}, ${p.name}, ${p.monthlyCredits}, ${p.refreshPeriod},
        ${p.priceMonthlyUsd}, ${p.priceYearlyUsd},
        ${JSON.stringify(p.features)}::jsonb, ${p.sortOrder}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        monthly_credits = EXCLUDED.monthly_credits,
        refresh_period = EXCLUDED.refresh_period,
        price_monthly_usd = EXCLUDED.price_monthly_usd,
        price_yearly_usd = EXCLUDED.price_yearly_usd,
        features = EXCLUDED.features,
        sort_order = EXCLUDED.sort_order
    `;
  }

  // Mevcut kullanıcılara Free subscription + credits satırı
  // NOT: users.id UUID, subscriptions.user_id TEXT — cast şart.
  await sql`
    INSERT INTO subscriptions (
      user_id, plan_id, status, billing_period,
      current_period_start, current_period_end, credit_period_end
    )
    SELECT u.id::text, 'free', 'active', 'monthly',
           NOW(), NOW() + INTERVAL '30 days',
           NOW() + INTERVAL '1 month'
    FROM users u
    WHERE NOT EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = u.id::text
        AND s.status IN ('active', 'trialing', 'past_due')
    )
  `;
  await sql`
    INSERT INTO credits (user_id, balance, plan_credits, last_refresh_at, next_refresh_at)
    SELECT u.id::text, 10, 10, NOW(), NOW() + INTERVAL '1 month'
    FROM users u
    WHERE NOT EXISTS (SELECT 1 FROM credits c WHERE c.user_id = u.id::text)
  `;

  global.__schemaReady = true;
}

/* ── tasks ── */

export async function saveProcessingTask(
  taskId: string,
  prompt: string,
  userId?: string,
  payload?: Record<string, unknown>,
  endpoint?: string,
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
        AND status <> 'complete'
    `;
    console.log(`[db] task ${taskId} → failed: ${errorTitle}`);
  } catch (e) {
    console.error("[db] markTaskFailed hatası:", e);
  }
}

/**
 * Task'ı failed olarak işaretle + task'ın endpoint'ine göre doğru miktarda
 * kredi iadesi yap. Hem callback hem polling (record-info failure) hem de
 * stale-task timeout için ortak path. Idempotent — aynı taskId için birden
 * çok kez çağrılırsa iade ledger'da tekrarlanmaz (refundCredits içindeki
 * duplicate check sayesinde).
 */
export async function failTaskAndRefund(
  taskId: string,
  errorTitle: string,
  errorMessage: string,
): Promise<void> {
  await markTaskFailed(taskId, errorTitle, errorMessage);
  try {
    const { refundCredits } = await import("./credits");
    const { CREDIT_COSTS } = await import("./plans");
    const ENDPOINT_TO_ACTION: Record<string, string> = {
      music: "generate",
      extend: "extend",
      "upload-cover": "cover",
      "upload-extend": "upload_extend",
      mashup: "mashup",
      "stems-separate": "stems_separate",
      "stems-split": "stems_split",
      wav: "wav_convert",
    };
    const tp = await getTaskPayload(taskId);
    if (!tp?.userId || !tp.endpoint) return;
    const action = ENDPOINT_TO_ACTION[tp.endpoint];
    if (!action) return;
    const amount = (CREDIT_COSTS as Record<string, number>)[action];
    if (!amount || amount <= 0) return;
    await refundCredits(tp.userId, amount, taskId);
  } catch (e) {
    console.error("[failTaskAndRefund] refund hatası:", e);
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

/** Task'ın DB'deki durumunu ve hata bilgisini döndür */
export async function getTaskStatus(taskId: string): Promise<{
  status: string;
  errorTitle?: string;
  errorMessage?: string;
  createdAt?: Date;
  ageSeconds?: number;
} | null> {
  try {
    await ensureSchema();
    const rows = await sql`
      SELECT status, error_title, error_message, created_at
      FROM tasks WHERE task_id = ${taskId} LIMIT 1
    `;
    if (rows.length === 0) return null;
    const createdAt =
      rows[0].created_at instanceof Date
        ? (rows[0].created_at as Date)
        : rows[0].created_at
          ? new Date(rows[0].created_at as string)
          : undefined;
    const ageSeconds = createdAt
      ? Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 1000))
      : undefined;
    return {
      status: rows[0].status as string,
      errorTitle: (rows[0].error_title as string) ?? undefined,
      errorMessage: (rows[0].error_message as string) ?? undefined,
      createdAt,
      ageSeconds,
    };
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

    // 15 dakikadır processing'de takılı task'ları otomatik fail + refund et.
    // UI polling tetiklemese bile (ör. kullanıcı sekmeyi kapatmış) bu pull
    // sırasında temizlenir ve açınca failed görünür.
    const stale = userId
      ? await sql`
          SELECT task_id FROM tasks
          WHERE status = 'processing'
            AND created_by = ${userId}
            AND created_at < NOW() - INTERVAL '15 minutes'
          LIMIT 20
        `
      : [];
    if (stale.length > 0) {
      const errorTitle = "Zaman aşımı";
      const errorMessage =
        "Şarkı 15 dakikayı geçti ve hâlâ hazır değil. Kredin iade edildi, tekrar deneyebilirsin.";
      for (const row of stale) {
        await failTaskAndRefund(
          row.task_id as string,
          errorTitle,
          errorMessage,
        ).catch(() => {});
      }
    }

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
    taskId: (row.task_id as string | null) ?? undefined,
    title: row.title as string,
    style: (row.style as string | null) ?? undefined,
    prompt: (row.prompt as string | null) ?? undefined,
    audioUrl,
    streamUrl: (row.stream_url as string | null) ?? undefined,
    imageUrl,
    duration: row.duration != null ? Number(row.duration) : undefined,
    status: row.status as Song["status"],
    playCount: row.play_count != null ? Number(row.play_count) : undefined,
    playCount7d:
      row.play_count_7d != null ? Number(row.play_count_7d) : undefined,
    likeCount: row.like_count != null ? Number(row.like_count) : undefined,
    commentCount:
      row.comment_count != null ? Number(row.comment_count) : undefined,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : (row.created_at as string),
    pronunciationScore:
      row.pronunciation_score != null
        ? Number(row.pronunciation_score)
        : undefined,
    transcribedLyrics: (row.transcribed_lyrics as string | null) ?? undefined,
    lrc: (row.lrc as string | null) ?? undefined,
    enhancedAudioKey: (row.enhanced_audio_key as string | null) ?? undefined,
    isPrimary: row.is_primary != null ? Boolean(row.is_primary) : undefined,
    isPublic: row.is_public != null ? Boolean(row.is_public) : undefined,
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
    WHERE s.task_id = ${taskId}
      AND s.status = 'complete'
      AND (s.audio_key IS NOT NULL OR s.stream_url IS NOT NULL OR s.audio_url IS NOT NULL) AND s.takedown_at IS NULL
    ORDER BY s.created_at ASC
  `;
  return rows.map(rowToSong);
}

export async function getAllSongs(
  userId?: string,
  limit?: number,
): Promise<Song[]> {
  await ensureSchema();
  // Neon HTTP adapter LIMIT değerini template literal'da kabul ediyor.
  // Default: kendi profili için tüm şarkılar, discover için 500.
  const lim = limit && limit > 0 ? limit : 500;
  const rows = userId
    ? await sql`
        SELECT
          s.id, s.title, s.style, s.audio_url, s.stream_url, s.image_url,
          s.audio_key, s.image_key, s.duration, s.status, s.task_id,
          s.play_count, s.play_count_7d, s.like_count, s.comment_count,
          s.pronunciation_score, s.is_primary, s.is_public, s.created_at,
          u.id           AS creator_id,
          u.display_name AS creator_name,
          u.username     AS creator_username,
          u.avatar_url   AS creator_image
        FROM songs s
        LEFT JOIN users u ON u.id::text = s.created_by
        WHERE s.created_by = ${userId}
          AND (s.audio_key IS NOT NULL OR s.stream_url IS NOT NULL OR s.audio_url IS NOT NULL) AND s.takedown_at IS NULL
        ORDER BY s.created_at DESC
        LIMIT ${lim}
      `
    : await sql`
        SELECT
          s.id, s.title, s.style, s.audio_url, s.stream_url, s.image_url,
          s.audio_key, s.image_key, s.duration, s.status, s.task_id,
          s.play_count, s.play_count_7d, s.like_count, s.comment_count,
          s.pronunciation_score, s.is_primary, s.is_public, s.created_at,
          u.id           AS creator_id,
          u.display_name AS creator_name,
          u.username     AS creator_username,
          u.avatar_url   AS creator_image
        FROM songs s
        LEFT JOIN users u ON u.id::text = s.created_by
        WHERE (s.audio_key IS NOT NULL OR s.stream_url IS NOT NULL OR s.audio_url IS NOT NULL) AND s.takedown_at IS NULL
        ORDER BY s.created_at DESC
        LIMIT ${lim}
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

/**
 * Stems verisini şarkıya kaydet — type bazlı merge (separate_vocal + split_stem
 * ayrı slot'larda saklanır, biri diğerini ezmez).
 */
export async function saveSongStems(
  songId: string,
  type: "separate_vocal" | "split_stem",
  info: Record<string, unknown>,
): Promise<void> {
  try {
    await ensureSchema();
    await sql`
      UPDATE songs
      SET stems_data = COALESCE(stems_data, '{}'::jsonb) ||
                       jsonb_build_object(${type}, ${JSON.stringify(info)}::jsonb)
      WHERE id = ${songId}
    `;
    console.log(`[db] song=${songId} stems(${type}) saved`);
  } catch (e) {
    console.error("[db] saveSongStems hatası:", e);
  }
}

/** WAV (HD) URL'sini şarkıya kaydet. */
export async function saveSongWavUrl(
  songId: string,
  wavUrl: string,
): Promise<void> {
  try {
    await ensureSchema();
    await sql`UPDATE songs SET wav_url = ${wavUrl} WHERE id = ${songId}`;
    console.log(`[db] song=${songId} wav_url saved`);
  } catch (e) {
    console.error("[db] saveSongWavUrl hatası:", e);
  }
}

/** Whisper transcription sonucunu ve telaffuz skorunu DB'ye yaz */
export async function updateSongTranscription(
  songId: string,
  pronunciationScore: number,
  transcribedLyrics: string,
  lrc?: string,
): Promise<void> {
  try {
    await ensureSchema();
    if (lrc) {
      await sql`
        UPDATE songs
        SET pronunciation_score = ${pronunciationScore},
            transcribed_lyrics = ${transcribedLyrics},
            lrc = ${lrc}
        WHERE id = ${songId}
      `;
    } else {
      await sql`
        UPDATE songs
        SET pronunciation_score = ${pronunciationScore},
            transcribed_lyrics = ${transcribedLyrics}
        WHERE id = ${songId}
      `;
    }
  } catch (e) {
    console.error("[db] updateSongTranscription hatası:", e);
  }
}

/** Aynı task'taki varyantlar arasında en yüksek score'luyu primary yap */
export async function setPrimaryByScore(taskId: string): Promise<void> {
  try {
    await ensureSchema();
    // Önce tüm varyantları non-primary yap
    await sql`
      UPDATE songs SET is_primary = false WHERE task_id = ${taskId}
    `;
    // En yüksek pronunciation_score olan varyantı primary yap
    // Score null olanlar dahil (henüz score gelmemişse created_at'a göre ilk olan)
    await sql`
      UPDATE songs SET is_primary = true
      WHERE id = (
        SELECT id FROM songs
        WHERE task_id = ${taskId}
        ORDER BY pronunciation_score DESC NULLS LAST, created_at ASC
        LIMIT 1
      )
    `;
  } catch (e) {
    console.error("[db] setPrimaryByScore hatası:", e);
  }
}

/** Bir şarkının orijinal prompt/lyrics'ini getir (Whisper karşılaştırma için) */
export async function getTaskPrompt(taskId: string): Promise<string | null> {
  try {
    await ensureSchema();
    const rows = await sql`
      SELECT prompt, payload FROM tasks WHERE task_id = ${taskId} LIMIT 1
    `;
    if (rows.length === 0) return null;
    // payload JSONB'den lyrics'i çıkarmayı dene (wizard-generate bunu koyar)
    const payload = rows[0].payload as Record<string, unknown> | null;
    if (payload?.prompt && typeof payload.prompt === "string") {
      return payload.prompt as string;
    }
    return (rows[0].prompt as string) || null;
  } catch {
    return null;
  }
}

export async function upsertSongs(
  songs: Song[],
  taskId?: string,
  creatorId?: string,
  isPublic: boolean = true,
): Promise<void> {
  if (songs.length === 0) return;
  await ensureSchema();

  // Paralel upsert — önceden sequential for-loop idi (N+1 latency). Neon
  // HTTP serverless adapter her query'yi bağımsız HTTP çağrısı yapar; Promise.all
  // ile 2 şarkı 2x hızlanır (typical case).
  await Promise.all(
    songs.map(
      (s) => sql`
        INSERT INTO songs (id, title, style, prompt, audio_url, stream_url, image_url, duration, status, created_at, task_id, created_by, is_public)
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
          ${creatorId ?? null},
          ${isPublic}
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
      `,
    ),
  );

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

  sql`SELECT created_by, payload FROM tasks WHERE task_id = ${taskId} LIMIT 1`
    .then(async (rows) => {
      const creatorId = (rows[0]?.created_by as string | null) ?? undefined;
      const payload =
        (rows[0]?.payload as Record<string, unknown> | null) ?? null;
      const remixSourceId =
        payload && typeof payload.remixFromSourceId === "string"
          ? (payload.remixFromSourceId as string)
          : null;
      // Default public; explicitly false → private
      const isPublic =
        payload && typeof payload.isPublic === "boolean"
          ? (payload.isPublic as boolean)
          : true;

      await upsertSongs(completed, taskId, creatorId, isPublic);

      if (remixSourceId) {
        await sql`
          UPDATE songs
          SET remix_source_id = ${remixSourceId}
          WHERE task_id = ${taskId} AND remix_source_id IS NULL
        `.catch((e) => console.error("[db] remix_source_id update hatası:", e));
      }
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

/**
 * Bir kullanıcının şarkıları. viewerId verildiyse ve viewerId == userId ise
 * private şarkılar da dahil — aksi halde sadece is_public = TRUE olanlar.
 */
export async function getUserSongs(
  userId: string,
  viewerId?: string | null,
): Promise<Song[]> {
  await ensureSchema();
  const isOwner = viewerId && viewerId === userId;
  const rows = isOwner
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
          AND (s.audio_key IS NOT NULL OR s.stream_url IS NOT NULL OR s.audio_url IS NOT NULL) AND s.takedown_at IS NULL
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
        WHERE s.created_by = ${userId}
          AND (s.audio_key IS NOT NULL OR s.stream_url IS NOT NULL OR s.audio_url IS NOT NULL) AND s.takedown_at IS NULL
          AND s.is_public = TRUE
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
    WHERE follower_id::text = ${followerId} AND following_id::text = ${followingId}
    LIMIT 1
  `;
  if (existing.length > 0) {
    await sql`
      DELETE FROM follows
      WHERE follower_id::text = ${followerId} AND following_id::text = ${followingId}
    `;
    return false; // artık takip etmiyor
  } else {
    await sql`
      INSERT INTO follows (follower_id, following_id)
      VALUES (${followerId}::uuid, ${followingId}::uuid)
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
    WHERE follower_id::text = ${followerId} AND following_id::text = ${followingId}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function getFollowerCount(userId: string): Promise<number> {
  await ensureSchema();
  const rows =
    await sql`SELECT COUNT(*)::int AS n FROM follows WHERE following_id::text = ${userId}`;
  return (rows[0]?.n as number) ?? 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  await ensureSchema();
  const rows =
    await sql`SELECT COUNT(*)::int AS n FROM follows WHERE follower_id::text = ${userId}`;
  return (rows[0]?.n as number) ?? 0;
}

/** Takip edilen sanatçıların son şarkıları (en yeni önce). */
export async function getFollowFeed(
  userId: string,
  limit: number = 20,
): Promise<Song[]> {
  await ensureSchema();
  const rows = await sql`
    SELECT
      s.*,
      u.id           AS creator_id,
      u.display_name AS creator_name,
      u.username     AS creator_username,
      u.avatar_url   AS creator_image
    FROM songs s
    JOIN follows f ON f.following_id::text = s.created_by
    LEFT JOIN users u ON u.id::text = s.created_by
    WHERE f.follower_id::text = ${userId}
      AND s.status = 'complete'
      AND s.audio_key IS NOT NULL
      AND s.takedown_at IS NULL
      AND s.is_public = TRUE
      AND s.created_by NOT IN (
        SELECT blocked_id FROM user_blocks WHERE blocker_id = ${userId}
        UNION ALL
        SELECT hidden_id  FROM user_hidden WHERE user_id    = ${userId}
      )
    ORDER BY s.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(rowToSong);
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
           AND s.audio_key IS NOT NULL
           AND s.takedown_at IS NULL) AS song_count
    FROM users u
    WHERE u.id::text = ${userId}
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
    WHERE s.status = 'complete' AND s.audio_key IS NOT NULL AND s.takedown_at IS NULL
      AND s.is_public = TRUE
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
    WHERE s.status = 'complete' AND s.audio_key IS NOT NULL AND s.takedown_at IS NULL
      AND s.is_public = TRUE
    ORDER BY s.play_count DESC, s.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(rowToSong);
}

/** Kullanıcının son dinlediklerini (unique şarkılar, en son önce) getirir. */
export async function getRecentPlays(
  userId: string,
  limit: number = 20,
): Promise<Song[]> {
  await ensureSchema();
  const rows = await sql`
    WITH last_plays AS (
      SELECT DISTINCT ON (sp.song_id)
        sp.song_id,
        sp.played_at
      FROM song_plays sp
      WHERE sp.user_id = ${userId}
        AND sp.counted_as_stream = TRUE
      ORDER BY sp.song_id, sp.played_at DESC
    )
    SELECT
      s.*,
      u.id           AS creator_id,
      u.display_name AS creator_name,
      u.username     AS creator_username,
      u.avatar_url   AS creator_image
    FROM last_plays lp
    JOIN songs s ON s.id = lp.song_id
    LEFT JOIN users u ON u.id::text = s.created_by
    WHERE s.status = 'complete' AND s.audio_key IS NOT NULL AND s.takedown_at IS NULL
    ORDER BY lp.played_at DESC
    LIMIT ${limit}
  `;
  return rows.map(rowToSong);
}

/** Anonim session_id'ye göre son dinlenenler. */
export async function getRecentAnonPlays(
  sessionId: string,
  limit: number = 20,
): Promise<Song[]> {
  await ensureSchema();
  const rows = await sql`
    WITH last_plays AS (
      SELECT DISTINCT ON (sp.song_id)
        sp.song_id,
        sp.played_at
      FROM song_plays sp
      WHERE sp.session_id = ${sessionId}
        AND sp.user_id IS NULL
        AND sp.counted_as_stream = TRUE
      ORDER BY sp.song_id, sp.played_at DESC
    )
    SELECT
      s.*,
      u.id           AS creator_id,
      u.display_name AS creator_name,
      u.username     AS creator_username,
      u.avatar_url   AS creator_image
    FROM last_plays lp
    JOIN songs s ON s.id = lp.song_id
    LEFT JOIN users u ON u.id::text = s.created_by
    WHERE s.status = 'complete' AND s.audio_key IS NOT NULL AND s.takedown_at IS NULL
      AND s.is_public = TRUE
    ORDER BY lp.played_at DESC
    LIMIT ${limit}
  `;
  return rows.map(rowToSong);
}

/**
 * Spotify "Sizin için öneriler" — kullanıcının son dinlediği şarkılardan
 * style token'larını çıkarır, en sık geçen 5 token ile benzer şarkılar döndürür.
 * userId null ise popüler şarkılara düşer.
 */
export async function getRecommendations(
  userId: string | null,
  limit: number = 20,
): Promise<Song[]> {
  await ensureSchema();
  if (!userId) return getTopSongs(limit);

  const rows = await sql`
    WITH recent AS (
      SELECT sp.song_id
      FROM song_plays sp
      WHERE sp.user_id = ${userId}
        AND sp.counted_as_stream = TRUE
      ORDER BY sp.played_at DESC
      LIMIT 50
    ),
    tokens AS (
      SELECT LOWER(TRIM(t)) AS token, COUNT(*)::int AS freq
      FROM recent r
      JOIN songs s ON s.id = r.song_id
      CROSS JOIN LATERAL unnest(string_to_array(COALESCE(s.style, ''), ',')) AS t
      WHERE LENGTH(TRIM(t)) > 1
      GROUP BY LOWER(TRIM(t))
      ORDER BY freq DESC
      LIMIT 5
    ),
    heard AS (
      SELECT DISTINCT song_id FROM song_plays WHERE user_id = ${userId}
    )
    SELECT
      s.*,
      u.id           AS creator_id,
      u.display_name AS creator_name,
      u.username     AS creator_username,
      u.avatar_url   AS creator_image
    FROM songs s
    LEFT JOIN users u ON u.id::text = s.created_by
    WHERE s.status = 'complete'
      AND s.audio_key IS NOT NULL
      AND s.takedown_at IS NULL
      AND s.is_public = TRUE
      AND s.id NOT IN (SELECT song_id FROM heard)
      AND (s.created_by IS NULL OR s.created_by != ${userId})
      AND (s.created_by IS NULL OR s.created_by NOT IN (
        SELECT blocked_id FROM user_blocks WHERE blocker_id = ${userId}
        UNION ALL
        SELECT hidden_id  FROM user_hidden WHERE user_id    = ${userId}
      ))
      AND EXISTS (
        SELECT 1 FROM tokens t
        WHERE LOWER(COALESCE(s.style, '')) LIKE '%' || t.token || '%'
      )
    ORDER BY s.play_count DESC, s.created_at DESC
    LIMIT ${limit}
  `;

  // Hiç token bulunamadıysa (kullanıcı yeni) popüler listeye düş
  if (rows.length === 0) return getTopSongs(limit);
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
    SET monthly_listeners = COALESCE((SELECT n FROM user_listeners WHERE user_id = u.id::text)::int, 0),
        total_streams     = COALESCE((SELECT total FROM user_totals WHERE user_id = u.id::text), 0)
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

/* ── Like sistemi (Spotify-style) ── */

/** Toggle like for (userId, songId); songs.like_count denormalize edilir. */
export async function toggleLike(
  userId: string,
  songId: string,
): Promise<{ liked: boolean; likeCount: number }> {
  await ensureSchema();
  const existing = await sql`
    SELECT 1 FROM song_likes
    WHERE user_id = ${userId} AND song_id = ${songId}
    LIMIT 1
  `;
  if (existing.length > 0) {
    await sql`
      DELETE FROM song_likes
      WHERE user_id = ${userId} AND song_id = ${songId}
    `;
    const rows = await sql`
      UPDATE songs SET like_count = GREATEST(like_count - 1, 0)
      WHERE id = ${songId}
      RETURNING like_count
    `;
    const lc = (rows[0]?.like_count as number) ?? 0;
    return { liked: false, likeCount: lc };
  }
  await sql`
    INSERT INTO song_likes (user_id, song_id)
    VALUES (${userId}, ${songId})
    ON CONFLICT DO NOTHING
  `;
  const rows = await sql`
    UPDATE songs SET like_count = like_count + 1
    WHERE id = ${songId}
    RETURNING like_count
  `;
  const lc = (rows[0]?.like_count as number) ?? 0;
  return { liked: true, likeCount: lc };
}

export async function isLiked(
  userId: string,
  songId: string,
): Promise<boolean> {
  await ensureSchema();
  const rows = await sql`
    SELECT 1 FROM song_likes
    WHERE user_id = ${userId} AND song_id = ${songId}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function getLikedSongs(
  userId: string,
  limit: number = 200,
): Promise<Song[]> {
  await ensureSchema();
  const rows = await sql`
    SELECT
      s.*,
      u.id           AS creator_id,
      u.display_name AS creator_name,
      u.username     AS creator_username,
      u.avatar_url   AS creator_image
    FROM song_likes sl
    JOIN songs s ON s.id = sl.song_id
    LEFT JOIN users u ON u.id::text = s.created_by
    WHERE sl.user_id = ${userId}
      AND s.status = 'complete'
      AND s.audio_key IS NOT NULL
      AND s.takedown_at IS NULL
    ORDER BY sl.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ ...rowToSong(r), liked: true }));
}

export async function getLikedSongIds(userId: string): Promise<Set<string>> {
  await ensureSchema();
  const rows = await sql`
    SELECT song_id FROM song_likes WHERE user_id = ${userId}
  `;
  return new Set(rows.map((r) => r.song_id as string));
}

/* ── Comments ── */

export interface CommentRow {
  id: string;
  songId: string;
  userId: string;
  body: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    username: string;
    image?: string;
  };
}

export async function addComment(
  songId: string,
  userId: string,
  body: string,
): Promise<CommentRow | null> {
  await ensureSchema();
  const trimmed = body.trim().slice(0, 1000);
  if (!trimmed) return null;
  const rows = await sql`
    INSERT INTO song_comments (song_id, user_id, body)
    VALUES (${songId}, ${userId}, ${trimmed})
    RETURNING id, song_id, user_id, body, created_at
  `;
  await sql`UPDATE songs SET comment_count = comment_count + 1 WHERE id = ${songId}`;
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id as string,
    songId: r.song_id as string,
    userId: r.user_id as string,
    body: r.body as string,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

export async function getComments(
  songId: string,
  limit: number = 100,
): Promise<CommentRow[]> {
  await ensureSchema();
  const rows = await sql`
    SELECT
      c.id, c.song_id, c.user_id, c.body, c.created_at,
      u.id AS u_id, u.display_name, u.username, u.avatar_url
    FROM song_comments c
    LEFT JOIN users u ON u.id::text = c.user_id
    WHERE c.song_id = ${songId}
    ORDER BY c.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: r.id as string,
    songId: r.song_id as string,
    userId: r.user_id as string,
    body: r.body as string,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
    user:
      r.u_id && r.username
        ? {
            id: r.u_id as string,
            name: (r.display_name as string) ?? (r.username as string),
            username: r.username as string,
            image: (r.avatar_url as string) ?? undefined,
          }
        : undefined,
  }));
}

/** Comment sahibi veya şarkı sahibi silebilir. */
export async function deleteComment(
  commentId: string,
  userId: string,
): Promise<boolean> {
  await ensureSchema();
  const rows = await sql`
    SELECT c.song_id, c.user_id, s.created_by
    FROM song_comments c
    LEFT JOIN songs s ON s.id = c.song_id
    WHERE c.id = ${commentId}
    LIMIT 1
  `;
  if (rows.length === 0) return false;
  const r = rows[0];
  const isAuthor = r.user_id === userId;
  const isSongOwner = r.created_by === userId;
  if (!isAuthor && !isSongOwner) return false;
  await sql`DELETE FROM song_comments WHERE id = ${commentId}`;
  await sql`
    UPDATE songs
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = ${r.song_id}
  `;
  return true;
}

/* ── Similar songs (aynı sanatçı) ── */

export async function getSimilarSongs(
  songId: string,
  limit: number = 8,
): Promise<Song[]> {
  await ensureSchema();
  // Aynı sanatçının diğer şarkıları, en popüler önce
  const rows = await sql`
    SELECT
      s2.*,
      u.id           AS creator_id,
      u.display_name AS creator_name,
      u.username     AS creator_username,
      u.avatar_url   AS creator_image
    FROM songs s1
    JOIN songs s2
      ON s2.created_by = s1.created_by
     AND s2.id <> s1.id
    LEFT JOIN users u ON u.id::text = s2.created_by
    WHERE s1.id = ${songId}
      AND s2.status = 'complete'
      AND s2.audio_key IS NOT NULL
      AND s2.takedown_at IS NULL
    ORDER BY s2.play_count DESC, s2.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(rowToSong);
}

/* ── personas ── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPersona(r: any): Persona {
  return {
    id: r.id,
    userId: r.user_id,
    sunoPersonaId: r.suno_persona_id,
    name: r.name,
    description: r.description ?? undefined,
    sourceSong: r.source_title
      ? {
          id: r.source_song_id,
          title: r.source_title,
          imageUrl: r.source_image_key
            ? keyToCdnUrl(r.source_image_key)
            : (r.source_image_url ?? undefined),
        }
      : undefined,
    vocalStart: Number(r.vocal_start) || 0,
    vocalEnd: Number(r.vocal_end) || 30,
    personaType: r.persona_type ?? "voice_persona",
    createdAt: r.created_at?.toISOString?.() ?? r.created_at,
  };
}

export async function savePersona(
  userId: string,
  sunoPersonaId: string,
  name: string,
  description: string | undefined,
  sourceSongId: string | undefined,
  vocalStart: number,
  vocalEnd: number,
  personaType: "style_persona" | "voice_persona",
  style?: string,
): Promise<Persona> {
  await ensureSchema();
  const [row] = await sql`
    INSERT INTO personas (user_id, suno_persona_id, name, description, source_song_id, vocal_start, vocal_end, persona_type, style)
    VALUES (${userId}, ${sunoPersonaId}, ${name}, ${description ?? null}, ${sourceSongId ?? null}, ${vocalStart}, ${vocalEnd}, ${personaType}, ${style ?? null})
    RETURNING *
  `;
  return { ...rowToPersona(row), sourceSong: undefined };
}

export async function getUserPersonas(userId: string): Promise<Persona[]> {
  await ensureSchema();
  const rows = await sql`
    SELECT p.*,
           s.title      AS source_title,
           s.image_url  AS source_image_url,
           s.image_key  AS source_image_key
    FROM personas p
    LEFT JOIN songs s ON s.id = p.source_song_id
    WHERE p.user_id = ${userId}
    ORDER BY p.created_at DESC
  `;
  return rows.map(rowToPersona);
}

export async function getPersonaById(id: string): Promise<Persona | null> {
  await ensureSchema();
  const [row] = await sql`
    SELECT p.*,
           s.title      AS source_title,
           s.image_url  AS source_image_url,
           s.image_key  AS source_image_key
    FROM personas p
    LEFT JOIN songs s ON s.id = p.source_song_id
    WHERE p.id = ${id}
  `;
  return row ? rowToPersona(row) : null;
}

export async function deletePersona(
  id: string,
  userId: string,
): Promise<boolean> {
  await ensureSchema();
  await sql`
    DELETE FROM personas WHERE id = ${id} AND user_id = ${userId}
  `;
  return true;
}

/* ══════════════════════════════════════════════
   Suno-style profile — followers/following listeleri,
   remix takibi, block/hide/report, profil güncelleme
══════════════════════════════════════════════ */

export interface ProfileListItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isFollowing: boolean;
}

type FollowRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_following: boolean;
};

function mapFollowRow(r: FollowRow): ProfileListItem {
  return {
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    isFollowing: r.is_following,
  };
}

/** Bir kullanıcının takipçilerini listele. viewerId verilirse `isFollowing` alanı dolar. */
export async function getFollowers(
  userId: string,
  viewerId?: string,
  limit = 50,
): Promise<ProfileListItem[]> {
  await ensureSchema();
  const rows = (
    viewerId
      ? await sql`
        SELECT
          u.id::text     AS id,
          u.username     AS username,
          u.display_name AS display_name,
          u.avatar_url   AS avatar_url,
          EXISTS (
            SELECT 1 FROM follows vf
            WHERE vf.follower_id = ${viewerId}
              AND vf.following_id = u.id::text
          ) AS is_following
        FROM follows f
        JOIN users u ON u.id::text = f.follower_id
        WHERE f.following_id = ${userId}
        ORDER BY f.created_at DESC
        LIMIT ${limit}
      `
      : await sql`
        SELECT
          u.id::text     AS id,
          u.username     AS username,
          u.display_name AS display_name,
          u.avatar_url   AS avatar_url,
          false          AS is_following
        FROM follows f
        JOIN users u ON u.id::text = f.follower_id
        WHERE f.following_id = ${userId}
        ORDER BY f.created_at DESC
        LIMIT ${limit}
      `
  ) as FollowRow[];
  return rows.map(mapFollowRow);
}

/** Bir kullanıcının takip ettiklerini listele. */
export async function getFollowing(
  userId: string,
  viewerId?: string,
  limit = 50,
): Promise<ProfileListItem[]> {
  await ensureSchema();
  const rows = (
    viewerId
      ? await sql`
        SELECT
          u.id::text     AS id,
          u.username     AS username,
          u.display_name AS display_name,
          u.avatar_url   AS avatar_url,
          EXISTS (
            SELECT 1 FROM follows vf
            WHERE vf.follower_id = ${viewerId}
              AND vf.following_id = u.id::text
          ) AS is_following
        FROM follows f
        JOIN users u ON u.id::text = f.following_id
        WHERE f.follower_id = ${userId}
        ORDER BY f.created_at DESC
        LIMIT ${limit}
      `
      : await sql`
        SELECT
          u.id::text     AS id,
          u.username     AS username,
          u.display_name AS display_name,
          u.avatar_url   AS avatar_url,
          false          AS is_following
        FROM follows f
        JOIN users u ON u.id::text = f.following_id
        WHERE f.follower_id = ${userId}
        ORDER BY f.created_at DESC
        LIMIT ${limit}
      `
  ) as FollowRow[];
  return rows.map(mapFollowRow);
}

/** Kullanıcının şarkılarından esinlenilmiş remix'ler (başkalarının remix'leri). */
export interface RemixInspiredItem {
  remix: Song;
  source: { id: string; title: string } | null;
}

export async function getRemixesInspiredByUser(
  userId: string,
  limit = 50,
): Promise<RemixInspiredItem[]> {
  await ensureSchema();
  const rows = (await sql`
    SELECT
      r.id, r.title, r.style, r.audio_url, r.stream_url, r.image_url,
      r.audio_key, r.image_key, r.duration, r.status, r.task_id,
      r.play_count, r.play_count_7d, r.like_count, r.comment_count,
      r.pronunciation_score, r.is_primary, r.created_at, r.remix_source_id,
      u.id           AS creator_id,
      u.display_name AS creator_name,
      u.username     AS creator_username,
      u.avatar_url   AS creator_image,
      src.id         AS source_id,
      src.title      AS source_title
    FROM songs r
    JOIN songs src ON src.id = r.remix_source_id
    LEFT JOIN users u ON u.id::text = r.created_by
    WHERE src.created_by = ${userId}
      AND r.created_by IS DISTINCT FROM ${userId}
      AND (r.audio_key IS NOT NULL OR r.stream_url IS NOT NULL OR r.audio_url IS NOT NULL)
    ORDER BY r.created_at DESC
    LIMIT ${limit}
  `) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    remix: rowToSong(row),
    source: row.source_id
      ? {
          id: row.source_id as string,
          title: (row.source_title as string) ?? "",
        }
      : null,
  }));
}

export async function getRemixesInspiredCount(userId: string): Promise<number> {
  await ensureSchema();
  const rows = (await sql`
    SELECT COUNT(*)::int AS c
    FROM songs r
    JOIN songs src ON src.id = r.remix_source_id
    WHERE src.created_by = ${userId}
      AND r.created_by IS DISTINCT FROM ${userId}
  `) as { c: number }[];
  return rows[0]?.c ?? 0;
}

/** Top (play_count DESC) sıralı kullanıcı şarkıları. */
export async function getUserTopSongs(
  userId: string,
  limit = 50,
  viewerId?: string | null,
): Promise<Song[]> {
  await ensureSchema();
  const isOwner = viewerId && viewerId === userId;
  const rows = isOwner
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
          AND (s.audio_key IS NOT NULL OR s.stream_url IS NOT NULL OR s.audio_url IS NOT NULL)
        ORDER BY s.play_count DESC NULLS LAST, s.created_at DESC
        LIMIT ${limit}
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
        WHERE s.created_by = ${userId}
          AND (s.audio_key IS NOT NULL OR s.stream_url IS NOT NULL OR s.audio_url IS NOT NULL)
          AND s.is_public = TRUE
        ORDER BY s.play_count DESC NULLS LAST, s.created_at DESC
        LIMIT ${limit}
      `;
  return rows.map(rowToSong);
}

/* ── Block / Hide ── */

export async function blockUser(
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  await ensureSchema();
  if (blockerId === blockedId) return false;
  await sql`
    INSERT INTO user_blocks (blocker_id, blocked_id)
    VALUES (${blockerId}, ${blockedId})
    ON CONFLICT (blocker_id, blocked_id) DO NOTHING
  `;
  // Block uygulandığında karşılıklı follow ilişkilerini de kes
  await sql`
    DELETE FROM follows
    WHERE (follower_id = ${blockerId} AND following_id = ${blockedId})
       OR (follower_id = ${blockedId} AND following_id = ${blockerId})
  `;
  return true;
}

export async function unblockUser(
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  await ensureSchema();
  await sql`
    DELETE FROM user_blocks
    WHERE blocker_id = ${blockerId} AND blocked_id = ${blockedId}
  `;
  return true;
}

export async function isBlocked(
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  await ensureSchema();
  const rows = (await sql`
    SELECT 1 FROM user_blocks
    WHERE blocker_id = ${blockerId} AND blocked_id = ${blockedId}
    LIMIT 1
  `) as unknown[];
  return rows.length > 0;
}

export async function getBlockedIds(userId: string): Promise<string[]> {
  await ensureSchema();
  const rows = (await sql`
    SELECT blocked_id FROM user_blocks WHERE blocker_id = ${userId}
  `) as { blocked_id: string }[];
  return rows.map((r) => r.blocked_id);
}

export async function hideUser(
  userId: string,
  hiddenId: string,
): Promise<boolean> {
  await ensureSchema();
  if (userId === hiddenId) return false;
  await sql`
    INSERT INTO user_hidden (user_id, hidden_id)
    VALUES (${userId}, ${hiddenId})
    ON CONFLICT (user_id, hidden_id) DO NOTHING
  `;
  return true;
}

export async function unhideUser(
  userId: string,
  hiddenId: string,
): Promise<boolean> {
  await ensureSchema();
  await sql`
    DELETE FROM user_hidden
    WHERE user_id = ${userId} AND hidden_id = ${hiddenId}
  `;
  return true;
}

export async function getHiddenIds(userId: string): Promise<string[]> {
  await ensureSchema();
  const rows = (await sql`
    SELECT hidden_id FROM user_hidden WHERE user_id = ${userId}
  `) as { hidden_id: string }[];
  return rows.map((r) => r.hidden_id);
}

/**
 * Feed endpoint'lerinde blocked + hidden kullanıcıları hariç tutmak için
 * kullanılacak ID listesi. İki liste birleşimi (set).
 */
export async function getFeedExcludedUserIds(
  userId: string,
): Promise<string[]> {
  const [blocked, hidden] = await Promise.all([
    getBlockedIds(userId),
    getHiddenIds(userId),
  ]);
  return Array.from(new Set([...blocked, ...hidden]));
}

/* ── Reports ── */

export async function createReport(opts: {
  reporterId: string;
  targetType: "song" | "user";
  targetId: string;
  reason: string;
  note?: string;
}): Promise<string> {
  await ensureSchema();
  const rows = (await sql`
    INSERT INTO reports (reporter_id, target_type, target_id, reason, note)
    VALUES (${opts.reporterId}, ${opts.targetType}, ${opts.targetId}, ${opts.reason}, ${opts.note ?? null})
    RETURNING id
  `) as { id: string }[];
  return rows[0].id;
}

/* ── Profile update (bio / banner / genre tags) ── */

export async function updateProfileFields(
  userId: string,
  fields: {
    bio?: string | null;
    bannerUrl?: string | null;
    genreTags?: string[];
  },
): Promise<void> {
  await ensureSchema();
  if (fields.bio !== undefined) {
    await sql`UPDATE users SET bio = ${fields.bio} WHERE id::text = ${userId}`;
  }
  if (fields.bannerUrl !== undefined) {
    await sql`UPDATE users SET banner_url = ${fields.bannerUrl} WHERE id::text = ${userId}`;
  }
  if (fields.genreTags !== undefined) {
    // PostgreSQL text array literal'i: '{a,b,c}'
    const arr = fields.genreTags.slice(0, 10);
    await sql`UPDATE users SET genre_tags = ${arr} WHERE id::text = ${userId}`;
  }
}

/**
 * Kullanıcının son 20 şarkısının style alanından en sık geçen genre'ları çıkar.
 * genre_tags boşsa profil UI'da fallback olarak kullanılır.
 */
export async function getSuggestedGenreTags(
  userId: string,
  limit = 5,
): Promise<string[]> {
  await ensureSchema();
  const rows = (await sql`
    SELECT style
    FROM songs
    WHERE created_by = ${userId}
      AND style IS NOT NULL AND style <> ''
    ORDER BY created_at DESC
    LIMIT 20
  `) as { style: string }[];
  const counts = new Map<string, number>();
  for (const r of rows) {
    const parts = r.style
      .split(/[,|;]/)
      .map((p) => p.trim().toLowerCase())
      .filter((p) => p.length > 1 && p.length < 30 && !/^\d+$/.test(p));
    for (const p of parts) {
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([g]) => g);
}

/** Profil sayfası için kullanıcı extended bilgileri. */
export interface UserProfileExtras {
  bio: string | null;
  bannerUrl: string | null;
  genreTags: string[];
}

export async function getUserProfileExtras(
  userId: string,
): Promise<UserProfileExtras> {
  await ensureSchema();
  const rows = (await sql`
    SELECT bio, banner_url, genre_tags
    FROM users
    WHERE id::text = ${userId}
    LIMIT 1
  `) as {
    bio: string | null;
    banner_url: string | null;
    genre_tags: string[] | null;
  }[];
  const r = rows[0];
  return {
    bio: r?.bio ?? null,
    bannerUrl: r?.banner_url ?? null,
    genreTags: r?.genre_tags ?? [],
  };
}
