import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveProcessingTask, markTaskFailed } from "@/lib/taskStore";
import { translateSunoError } from "@/lib/sunoErrors";
import sql from "@/lib/db";
import { keyToCdnUrl } from "@/lib/bunnyStorage";

const SUNO_API_KEY = process.env.SUNO_API_KEY ?? "";
const SUNO_BASE_URL = "https://api.sunoapi.org";

function getCallbackUrl(request: NextRequest): string {
  const raw = process.env.APP_URL?.trim();
  if (raw) return `${raw.replace(/\/+$/, "")}/api/callback`;
  return `${new URL(request.url).origin}/api/callback`;
}

/**
 * Extend — Mevcut şarkıyı belirli bir noktadan uzat
 * POST /api/extend
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      songId,
      continueAt,
      prompt,
      style,
      title,
      instrumental = false,
      model = "V5_5",
    } = body as {
      songId: string;
      continueAt: number;
      prompt?: string;
      style?: string;
      title?: string;
      instrumental?: boolean;
      model?: string;
    };

    if (!songId) {
      return NextResponse.json(
        { error: "Şarkı ID gereklidir" },
        { status: 400 },
      );
    }

    if (continueAt == null || continueAt <= 0) {
      return NextResponse.json(
        { error: "Uzatma başlangıç noktası (saniye) gereklidir" },
        { status: 400 },
      );
    }

    // Şarkının audio URL'ini bul
    const [song] = await sql`
      SELECT audio_url, audio_key, stream_url, title, created_by
      FROM songs WHERE id = ${songId}
    `;

    if (!song) {
      return NextResponse.json({ error: "Şarkı bulunamadı" }, { status: 404 });
    }

    const uploadUrl =
      (song.audio_key && keyToCdnUrl(song.audio_key as string)) ||
      (song.audio_url as string) ||
      (song.stream_url as string);

    if (!uploadUrl) {
      return NextResponse.json(
        { error: "Şarkının audio dosyası bulunamadı" },
        { status: 400 },
      );
    }

    const callBackUrl = getCallbackUrl(request);

    const payload: Record<string, unknown> = {
      uploadUrl,
      defaultParamFlag: !style && !prompt,
      callBackUrl,
      model,
      instrumental,
      continueAt,
      ...(prompt ? { prompt } : {}),
      ...(style ? { style } : {}),
      ...(title ? { title } : {}),
    };

    const response = await fetch(
      `${SUNO_BASE_URL}/api/v1/generate/upload-extend`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUNO_API_KEY}`,
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();
    const taskId = data.data?.taskId;

    if (!response.ok || data.code !== 200) {
      const translated = translateSunoError(
        data.code,
        data.message || data.msg || "Uzatma başarısız",
      );
      if (taskId) {
        saveProcessingTask(
          taskId,
          prompt || `extend:${songId}`,
          session.user.id,
          body,
          "extend",
        ).catch(() => {});
        markTaskFailed(taskId, translated.title, translated.message).catch(
          () => {},
        );
      }
      return NextResponse.json(
        { error: `${translated.title}: ${translated.message}` },
        { status: 400 },
      );
    }

    if (taskId) {
      saveProcessingTask(
        taskId,
        prompt || `${song.title} uzatması`,
        session.user.id,
        { ...body, originalSongId: songId },
        "extend",
      ).catch(() => {});
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Extend error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
