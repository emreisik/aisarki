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
 * Mashup — 2 şarkıyı birleştir
 * POST /api/mashup
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      uploadUrlList,
      prompt,
      style,
      title,
      instrumental = false,
      model = "V5_5",
    } = body as {
      uploadUrlList: string[];
      prompt?: string;
      style?: string;
      title?: string;
      instrumental?: boolean;
      model?: string;
    };

    if (!uploadUrlList || uploadUrlList.length !== 2) {
      return NextResponse.json(
        { error: "Tam olarak 2 şarkı URL'si gereklidir" },
        { status: 400 },
      );
    }

    const callBackUrl = getCallbackUrl(request);
    const customMode = !!(style || title);

    const payload: Record<string, unknown> = {
      uploadUrlList,
      customMode,
      instrumental,
      callBackUrl,
      model,
      ...(prompt ? { prompt } : {}),
      ...(customMode && style ? { style } : {}),
      ...(customMode && title ? { title } : {}),
    };

    const response = await fetch(`${SUNO_BASE_URL}/api/v1/generate/mashup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const taskId = data.data?.taskId;

    if (!response.ok || data.code !== 200) {
      const translated = translateSunoError(
        data.code,
        data.message || data.msg || "Mashup başarısız",
      );
      if (taskId) {
        saveProcessingTask(
          taskId,
          prompt || "mashup",
          session.user.id,
          body,
          "mashup",
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
        prompt || "mashup",
        session.user.id,
        body,
        "mashup",
      ).catch(() => {});
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Mashup error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
