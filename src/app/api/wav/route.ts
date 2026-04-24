import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveProcessingTask, markTaskFailed } from "@/lib/taskStore";
import { translateSunoError } from "@/lib/sunoErrors";
import { getUserPlan } from "@/lib/credits";
import sql from "@/lib/db";

const SUNO_API_KEY = process.env.SUNO_API_KEY ?? "";
const SUNO_BASE_URL = "https://api.sunoapi.org";

function getCallbackUrl(request: NextRequest): string {
  const raw = process.env.APP_URL?.trim();
  if (raw) return `${raw.replace(/\/+$/, "")}/api/callback`;
  return `${new URL(request.url).origin}/api/callback`;
}

/**
 * WAV (HD) Conversion — şarkıyı yüksek kaliteli WAV formatına dönüştürür
 * POST /api/wav
 *
 * Body: { songId: string }
 *
 * Suno'nun /wav/generate endpoint'ine task açar. Sonuç callback ile gelir,
 * songs.wav_url kolonuna yazılır. Free planda kapalı.
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

    // Şarkıyı bul
    const rows = (await sql`
      SELECT id, task_id, created_by, wav_url
      FROM songs
      WHERE id = ${songId}
      LIMIT 1
    `) as {
      id: string;
      task_id: string | null;
      created_by: string | null;
      wav_url: string | null;
    }[];

    const song = rows[0];
    if (!song) {
      return NextResponse.json({ error: "Şarkı bulunamadı" }, { status: 404 });
    }
    if (song.created_by !== session.user.id) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }
    if (!song.task_id) {
      return NextResponse.json(
        { error: "Şarkının orijinal taskId'si yok — WAV dönüşümü yapılamaz" },
        { status: 400 },
      );
    }

    // Cached
    if (song.wav_url) {
      return NextResponse.json({
        ok: true,
        wavUrl: song.wav_url,
        cached: true,
      });
    }

    // Plan kontrolü — Free'de kapalı
    const plan = await getUserPlan(session.user.id);
    if (!plan.features.wavDownload) {
      return NextResponse.json(
        {
          error: `WAV indirme ${plan.name} planında kilitli — yükselt`,
          code: "plan_not_allowed",
        },
        { status: 403 },
      );
    }

    const callBackUrl = getCallbackUrl(request);
    const payload = {
      taskId: song.task_id,
      audioId: song.id,
      callBackUrl,
    };

    const response = await fetch(`${SUNO_BASE_URL}/api/v1/wav/generate`, {
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
        data.message || data.msg || "WAV dönüşümü başarısız",
      );
      if (newTaskId) {
        saveProcessingTask(
          newTaskId,
          `wav:${songId}`,
          session.user.id,
          { ...payload, songId },
          "wav",
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
        `wav:${songId}`,
        session.user.id,
        { ...payload, songId },
        "wav",
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true, taskId: newTaskId });
  } catch (error) {
    console.error("WAV error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

/**
 * WAV URL'sini getir
 * GET /api/wav?songId=xxx
 */
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
    SELECT wav_url, created_by
    FROM songs
    WHERE id = ${songId}
    LIMIT 1
  `) as { wav_url: string | null; created_by: string | null }[];

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "Şarkı bulunamadı" }, { status: 404 });
  }
  if (row.created_by !== session.user.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  return NextResponse.json({ wavUrl: row.wav_url });
}
