import sql from "@/lib/db";

export interface SongRow {
  id: string;
  title: string;
  style: string | null;
  prompt: string | null;
  imageKey: string | null;
  audioKey: string | null;
  duration: number | null;
  status: string;
  playCount: number;
  likeCount: number;
  takedownAt: string | null;
  takedownReason: string | null;
  createdAt: string;
  creatorId: string | null;
  creatorEmail: string | null;
  creatorDisplayName: string | null;
}

export interface SongSearchParams {
  q?: string;
  status?: string; // all | complete | processing | failed
  takedownOnly?: boolean;
  userId?: string;
  limit: number;
  offset: number;
}

export async function searchSongs(params: SongSearchParams): Promise<{
  rows: SongRow[];
  total: number;
}> {
  const q = params.q?.trim();
  const likeQ = q ? `%${q}%` : null;
  const status =
    params.status && params.status !== "all" ? params.status : null;
  const takedownOnly = params.takedownOnly ?? false;
  const userId = params.userId?.trim() || null;

  const rows = (await sql`
    SELECT s.id, s.title, s.style, s.prompt, s.image_key, s.audio_key,
           s.duration, s.status, COALESCE(s.play_count, 0) AS play_count,
           s.takedown_at, s.takedown_reason, s.created_at,
           s.created_by AS creator_id,
           u.email AS creator_email, u.display_name AS creator_display_name,
           (SELECT COUNT(*)::int FROM song_likes l WHERE l.song_id = s.id) AS like_count
    FROM songs s
    LEFT JOIN users u ON u.id::text = s.created_by
    WHERE
      (${likeQ}::text IS NULL OR s.title ILIKE ${likeQ} OR s.prompt ILIKE ${likeQ})
      AND (${status}::text IS NULL OR s.status = ${status})
      AND (${takedownOnly} = FALSE OR s.takedown_at IS NOT NULL)
      AND (${userId}::text IS NULL OR s.created_by = ${userId})
    ORDER BY s.created_at DESC
    LIMIT ${params.limit} OFFSET ${params.offset}
  `) as {
    id: string;
    title: string;
    style: string | null;
    prompt: string | null;
    image_key: string | null;
    audio_key: string | null;
    duration: number | null;
    status: string;
    play_count: number;
    like_count: number;
    takedown_at: string | null;
    takedown_reason: string | null;
    created_at: string;
    creator_id: string | null;
    creator_email: string | null;
    creator_display_name: string | null;
  }[];

  const countRows = (await sql`
    SELECT COUNT(*)::int AS total
    FROM songs s
    WHERE
      (${likeQ}::text IS NULL OR s.title ILIKE ${likeQ} OR s.prompt ILIKE ${likeQ})
      AND (${status}::text IS NULL OR s.status = ${status})
      AND (${takedownOnly} = FALSE OR s.takedown_at IS NOT NULL)
      AND (${userId}::text IS NULL OR s.created_by = ${userId})
  `) as { total: number }[];

  return {
    rows: rows.map((r) => ({
      id: r.id,
      title: r.title,
      style: r.style,
      prompt: r.prompt,
      imageKey: r.image_key,
      audioKey: r.audio_key,
      duration: r.duration,
      status: r.status,
      playCount: r.play_count,
      likeCount: r.like_count,
      takedownAt: r.takedown_at,
      takedownReason: r.takedown_reason,
      createdAt: r.created_at,
      creatorId: r.creator_id,
      creatorEmail: r.creator_email,
      creatorDisplayName: r.creator_display_name,
    })),
    total: countRows[0]?.total ?? 0,
  };
}

const BUNNY_CDN = process.env.BUNNY_CDN_URL ?? "";

export function cdnUrl(key: string | null): string | null {
  if (!key || !BUNNY_CDN) return null;
  return `${BUNNY_CDN.replace(/\/$/, "")}/aisarki/${key}`;
}
