import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveProcessingTask, markTaskFailed } from "@/lib/taskStore";
import { translateSunoError } from "@/lib/sunoErrors";
import { checkCanGenerate, deductCredits } from "@/lib/credits";

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
      model = "V5_5",
    } = body as {
      uploadUrl: string;
      prompt?: string;
      style?: string;
      title?: string;
      instrumental?: boolean;
      model?: string;
    };

    if (!uploadUrl) {
      return NextResponse.json(
        { error: "Audio URL gereklidir" },
        { status: 400 },
      );
    }

    // ── Kredi + model kilidi kontrolü ──
    const check = await checkCanGenerate(session.user.id, {
      action: "upload_extend",
      model,
    });
    if (!check.ok) {
      return NextResponse.json(
        {
          error: check.message || "Kredi yetersiz",
          code: check.error,
          credits: check.credits,
        },
        { status: check.error === "insufficient_credits" ? 402 : 403 },
      );
    }

    const callBackUrl = getCallbackUrl(request);
    if (
      /^https?:\/\/(localhost|127\.|0\.0\.0\.0|192\.168\.|10\.)/.test(
        callBackUrl,
      )
    ) {
      console.warn(
        "[upload-extend] callBackUrl is not publicly reachable:",
        callBackUrl,
        "— set APP_URL env or use a tunnel (ngrok/cloudflared)",
      );
      return NextResponse.json(
        {
          error:
            "Callback URL localhost — Suno bu adrese ulaşamaz. APP_URL env değişkenini public bir domain'e (ngrok/cloudflared) ayarla.",
        },
        { status: 400 },
      );
    }

    // upload-cover: yüklenen sesi referans alıp yeni şarkı üret.
    // Non-custom mode'da sadece prompt yeterli; boşsa generic prompt fallback.
    const customMode = Boolean(style || title);
    const effectivePrompt =
      prompt?.trim() ||
      "Create a song inspired by this audio, keeping its mood and feel, adding full production with natural vocals";

    const payload: Record<string, unknown> = {
      uploadUrl,
      customMode,
      instrumental,
      callBackUrl,
      model,
      prompt: effectivePrompt,
      ...(customMode && style ? { style } : {}),
      ...(customMode && title ? { title } : {}),
    };
    console.log(
      "[upload-extend] request payload:",
      JSON.stringify({ ...payload, callBackUrl: "[...]" }).slice(0, 500),
    );

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

    console.log(
      "[upload-extend] Suno response:",
      response.status,
      JSON.stringify(data).slice(0, 300),
    );

    if (!response.ok || data.code !== 200) {
      const rawMsg = data.message || data.msg || "Uzatma başarısız";
      const translated = translateSunoError(data.code, rawMsg);
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
        {
          error: `${translated.title}: ${translated.message}`,
          sunoCode: data.code,
          sunoMessage: rawMsg,
        },
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

      await deductCredits(
        session.user.id,
        check.cost,
        "upload_extend",
        taskId,
      ).catch((e) => console.error("[credits] deduct hatası:", e));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Upload-extend error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
