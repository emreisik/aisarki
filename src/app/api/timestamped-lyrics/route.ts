import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/lib/db";

const SUNO_API_KEY = process.env.SUNO_API_KEY ?? "";
const SUNO_BASE_URL = "https://api.sunoapi.org";

/**
 * Timestamped Lyrics — Suno'nun word-level lyrics alignment
 * POST /api/timestamped-lyrics
 *
 * Body: { songId: string }
 * Sync endpoint — direkt response döner.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { songId } = body as { songId: string };

    if (!songId) {
      return NextResponse.json({ error: "songId zorunlu" }, { status: 400 });
    }

    const rows = (await sql`
      SELECT id, task_id, created_by, timestamped_lyrics
      FROM songs WHERE id = ${songId} LIMIT 1
    `) as {
      id: string;
      task_id: string | null;
      created_by: string | null;
      timestamped_lyrics: Record<string, unknown> | null;
    }[];

    const song = rows[0];
    if (!song) {
      return NextResponse.json({ error: "Şarkı bulunamadı" }, { status: 404 });
    }
    if (song.created_by !== session.user.id) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }
    if (song.timestamped_lyrics) {
      return NextResponse.json({
        lyrics: song.timestamped_lyrics,
        cached: true,
      });
    }
    if (!song.task_id) {
      return NextResponse.json(
        { error: "Şarkının orijinal taskId'si yok" },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${SUNO_BASE_URL}/api/v1/generate/get-timestamped-lyrics`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUNO_API_KEY}`,
        },
        body: JSON.stringify({ taskId: song.task_id, audioId: song.id }),
      },
    );

    const data = await response.json();
    if (!response.ok || data.code !== 200) {
      return NextResponse.json(
        {
          error: data.message || data.msg || "Senkronize sözler getirilemedi",
        },
        { status: 400 },
      );
    }

    const lyrics = data.data;
    if (lyrics && (lyrics.alignedWords || lyrics.aligned_words)) {
      await sql`
        UPDATE songs
        SET timestamped_lyrics = ${JSON.stringify(lyrics)}::jsonb
        WHERE id = ${songId}
      `;
    }

    return NextResponse.json({ lyrics });
  } catch (error) {
    console.error("Timestamped lyrics error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  const songId = request.nextUrl.searchParams.get("songId");
  if (!songId) {
    return NextResponse.json({ error: "songId zorunlu" }, { status: 400 });
  }

  const rows = (await sql`
    SELECT timestamped_lyrics, created_by
    FROM songs WHERE id = ${songId} LIMIT 1
  `) as {
    timestamped_lyrics: Record<string, unknown> | null;
    created_by: string | null;
  }[];

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "Şarkı bulunamadı" }, { status: 404 });
  }
  if (row.created_by !== session.user.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  return NextResponse.json({ lyrics: row.timestamped_lyrics });
}
