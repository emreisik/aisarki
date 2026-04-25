import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveProcessingTask, markTaskFailed } from "@/lib/taskStore";
import { translateSunoError } from "@/lib/sunoErrors";
import sql from "@/lib/db";

const SUNO_API_KEY = process.env.SUNO_API_KEY ?? "";
const SUNO_BASE_URL = "https://api.sunoapi.org";

function getCallbackUrl(request: NextRequest): string {
  const raw = process.env.APP_URL?.trim();
  if (raw) return `${raw.replace(/\/+$/, "")}/api/callback`;
  return `${new URL(request.url).origin}/api/callback`;
}

/**
 * Music Video — şarkıdan MP4 video üret (görsel efektler senkron)
 * POST /api/music-video
 *
 * Body: { songId: string, author?: string, domainName?: string }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { songId, author, domainName } = body as {
      songId: string;
      author?: string;
      domainName?: string;
    };

    if (!songId) {
      return NextResponse.json({ error: "songId zorunlu" }, { status: 400 });
    }

    const rows = (await sql`
      SELECT id, task_id, created_by, mp4_url
      FROM songs WHERE id = ${songId} LIMIT 1
    `) as {
      id: string;
      task_id: string | null;
      created_by: string | null;
      mp4_url: string | null;
    }[];

    const song = rows[0];
    if (!song) {
      return NextResponse.json({ error: "Şarkı bulunamadı" }, { status: 404 });
    }
    if (song.created_by !== session.user.id) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }
    if (song.mp4_url) {
      return NextResponse.json({
        ok: true,
        mp4Url: song.mp4_url,
        cached: true,
      });
    }
    if (!song.task_id) {
      return NextResponse.json(
        { error: "Şarkının orijinal taskId'si yok — video üretilemez" },
        { status: 400 },
      );
    }

    const callBackUrl = getCallbackUrl(request);
    const payload: Record<string, unknown> = {
      taskId: song.task_id,
      audioId: song.id,
      callBackUrl,
      ...(author ? { author: author.slice(0, 50) } : {}),
      ...(domainName ? { domainName: domainName.slice(0, 50) } : {}),
    };

    const response = await fetch(`${SUNO_BASE_URL}/api/v1/mp4/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const newTaskId = data.data?.taskId;

    if (!response.ok || data.code !== 200) {
      const translated = translateSunoError(
        data.code,
        data.message || data.msg || "Video üretimi başarısız",
      );
      if (newTaskId) {
        saveProcessingTask(
          newTaskId,
          `mp4:${songId}`,
          session.user.id,
          { ...payload, songId },
          "mp4",
        ).catch(() => {});
        markTaskFailed(newTaskId, translated.title, translated.message).catch(
          () => {},
        );
      }
      return NextResponse.json(
        { error: `${translated.title}: ${translated.message}` },
        { status: 400 },
      );
    }

    if (newTaskId) {
      saveProcessingTask(
        newTaskId,
        `mp4:${songId}`,
        session.user.id,
        { ...payload, songId },
        "mp4",
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true, taskId: newTaskId });
  } catch (error) {
    console.error("Music video error:", error);
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
    SELECT mp4_url, created_by FROM songs WHERE id = ${songId} LIMIT 1
  `) as { mp4_url: string | null; created_by: string | null }[];

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "Şarkı bulunamadı" }, { status: 404 });
  }
  if (row.created_by !== session.user.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  return NextResponse.json({ mp4Url: row.mp4_url });
}
