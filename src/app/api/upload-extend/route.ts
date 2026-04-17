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
 * Upload & Extend — Ses yükle, Suno tam şarkıya dönüştürsün
 * POST /api/upload-extend
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
      continueAt,
      model = "V5_5",
    } = body as {
      uploadUrl: string;
      prompt?: string;
      style?: string;
      title?: string;
      instrumental?: boolean;
      continueAt?: number;
      model?: string;
    };

    if (!uploadUrl) {
      return NextResponse.json(
        { error: "Audio URL gereklidir" },
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
      ...(prompt ? { prompt } : {}),
      ...(style ? { style } : {}),
      ...(title ? { title } : {}),
      ...(continueAt != null ? { continueAt } : {}),
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
          prompt || "",
          session.user.id,
          body,
          "upload-extend",
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
        prompt || uploadUrl,
        session.user.id,
        body,
        "upload-extend",
      ).catch(() => {});
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Upload-extend error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
