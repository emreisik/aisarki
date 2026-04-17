import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveProcessingTask, markTaskFailed } from "@/lib/taskStore";
import { translateSunoError } from "@/lib/sunoErrors";

const SUNO_API_KEY = process.env.SUNO_API_KEY ?? "";
const SUNO_BASE_URL = "https://api.sunoapi.org";

function getCallbackUrl(request: NextRequest): string {
  const raw = process.env.APP_URL?.trim();
  if (raw) return `${raw.replace(/\/+$/, "")}/api/callback`;
  return `${new URL(request.url).origin}/api/callback`;
}

/**
 * Upload & Cover — Şarkıyı farklı tarzda yeniden üret
 * POST /api/upload-cover
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      uploadUrl,
      prompt,
      style,
      title,
      instrumental = false,
      model = "V5_5",
      personaId,
      personaModel,
    } = body as {
      uploadUrl: string;
      prompt?: string;
      style?: string;
      title?: string;
      instrumental?: boolean;
      model?: string;
      personaId?: string;
      personaModel?: string;
    };

    if (!uploadUrl) {
      return NextResponse.json(
        { error: "Audio URL gereklidir" },
        { status: 400 },
      );
    }

    const callBackUrl = getCallbackUrl(request);
    const customMode = !!(style || title);

    const payload: Record<string, unknown> = {
      uploadUrl,
      customMode,
      instrumental,
      callBackUrl,
      model,
      ...(prompt ? { prompt } : {}),
      ...(customMode && style ? { style } : {}),
      ...(customMode && title ? { title } : {}),
      ...(personaId
        ? { personaId, personaModel: personaModel || "voice_persona" }
        : {}),
    };

    const response = await fetch(
      `${SUNO_BASE_URL}/api/v1/generate/upload-cover`,
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
        data.message || data.msg || "Cover başarısız",
      );
      if (taskId) {
        saveProcessingTask(
          taskId,
          prompt || "cover",
          session.user.id,
          body,
          "upload-cover",
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
        prompt || "cover",
        session.user.id,
        body,
        "upload-cover",
      ).catch(() => {});
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Upload-cover error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
