import { NextRequest, NextResponse } from "next/server";
import { GenerateRequest, SunoApiResponse } from "@/types";
import { saveProcessingTask } from "@/lib/taskStore";

const SUNO_API_KEY = "7049ff127b2d972a33fef22566de8512";
const SUNO_BASE_URL = "https://api.sunoapi.org";

function getCallbackUrl(request: NextRequest): string {
  // Use APP_URL env if set (production), otherwise derive from request origin
  if (process.env.APP_URL) {
    return `${process.env.APP_URL}/api/callback`;
  }
  const { origin } = new URL(request.url);
  return `${origin}/api/callback`;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const {
      prompt,
      style,
      title,
      instrumental = false,
      customMode = false,
    } = body;

    if (!prompt && !customMode) {
      return NextResponse.json({ error: "Prompt gereklidir" }, { status: 400 });
    }

    const callBackUrl = getCallbackUrl(request);

    // Doğal Türk sesi için kalite işaretçileri ekle
    const qualitySuffix = instrumental
      ? ""
      : ", natural authentic Turkish vocals, real organic instruments, genuine emotional voice, warm tone, not autotuned, not synthetic";

    const finalPrompt = customMode
      ? prompt || ""
      : (prompt || "") + qualitySuffix;

    const payload = {
      customMode,
      instrumental,
      model: "V4_5ALL",
      prompt: finalPrompt,
      callBackUrl,
      ...(customMode && style ? { style } : {}),
      ...(customMode && title ? { title } : {}),
    };

    console.log("Calling Suno API with callBackUrl:", callBackUrl);

    const response = await fetch(`${SUNO_BASE_URL}/api/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data: SunoApiResponse = await response.json();

    console.log("Suno API response:", JSON.stringify(data, null, 2));

    if (!response.ok || data.code !== 200) {
      return NextResponse.json(
        { error: data.msg || "Müzik oluşturulamadı" },
        { status: 400 },
      );
    }

    // taskId'yi DB'ye kaydet — sayfa yenilenince de durum korunur
    const taskId = data.data?.taskId;
    if (taskId) {
      saveProcessingTask(taskId, finalPrompt).catch((e) =>
        console.error("[db] saveProcessingTask hatası:", e),
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
