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
 * Add Vocals — bir enstrümantal şarkıya AI ile vokal ekler
 * POST /api/add-vocals
 *
 * Body: { uploadUrl, title, prompt?, style?, vocalGender?, model? }
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
      title,
      prompt,
      style,
      negativeTags,
      vocalGender,
      styleWeight,
      weirdnessConstraint,
      audioWeight,
      model = "V4_5PLUS",
    } = body as {
      uploadUrl: string;
      title: string;
      prompt?: string;
      style?: string;
      negativeTags?: string;
      vocalGender?: "m" | "f";
      styleWeight?: number;
      weirdnessConstraint?: number;
      audioWeight?: number;
      model?: string;
    };

    if (!uploadUrl || !title) {
      return NextResponse.json(
        { error: "uploadUrl ve title zorunlu" },
        { status: 400 },
      );
    }

    const check = await checkCanGenerate(session.user.id, {
      action: "generate",
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
    const payload: Record<string, unknown> = {
      uploadUrl,
      title: title.slice(0, 100),
      tags: style || prompt || "pop vocals",
      negativeTags: negativeTags || "",
      callBackUrl,
      model,
      ...(vocalGender ? { vocalGender } : {}),
      ...(styleWeight !== undefined ? { styleWeight } : {}),
      ...(weirdnessConstraint !== undefined ? { weirdnessConstraint } : {}),
      ...(audioWeight !== undefined ? { audioWeight } : {}),
    };

    const response = await fetch(
      `${SUNO_BASE_URL}/api/v1/generate/add-vocals`,
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
        data.message || data.msg || "Vokal ekleme başarısız",
      );
      if (taskId) {
        saveProcessingTask(
          taskId,
          prompt || title,
          session.user.id,
          body,
          "music",
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
        prompt || title,
        session.user.id,
        body,
        "music",
      ).catch(() => {});
      await deductCredits(
        session.user.id,
        check.cost,
        "generate",
        taskId,
      ).catch((e) => console.error("[credits] deduct hatası:", e));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Add vocals error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
