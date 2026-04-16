import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveProcessingTask, markTaskFailed } from "@/lib/taskStore";
import { translateSunoError } from "@/lib/sunoErrors";

const SUNO_API_KEY = process.env.SUNO_API_KEY ?? "";
const SUNO_BASE_URL = "https://api.sunoapi.org";

// Suno Sound Key valid values
const VALID_SOUND_KEYS = new Set([
  "Any",
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
  "Cm",
  "C#m",
  "Dm",
  "D#m",
  "Em",
  "Fm",
  "F#m",
  "Gm",
  "G#m",
  "Am",
  "A#m",
  "Bm",
]);

interface GenerateSoundsRequest {
  prompt: string;
  soundKey?: string;
  soundLoop?: boolean;
  soundTempo?: number;
  grabLyrics?: boolean;
}

function getCallbackUrl(request: NextRequest): string {
  if (process.env.APP_URL) return `${process.env.APP_URL}/api/callback`;
  const { origin } = new URL(request.url);
  return `${origin}/api/callback`;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Ses üretmek için giriş yapman gerekiyor" },
      { status: 401 },
    );
  }

  try {
    const body: GenerateSoundsRequest = await request.json();
    const { prompt, soundKey, soundLoop, soundTempo, grabLyrics } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt gereklidir" }, { status: 400 });
    }
    if (prompt.length > 500) {
      return NextResponse.json(
        { error: "Prompt maksimum 500 karakter" },
        { status: 400 },
      );
    }

    const validatedSoundKey =
      soundKey && VALID_SOUND_KEYS.has(soundKey) ? soundKey : undefined;
    const validatedTempo =
      typeof soundTempo === "number" && soundTempo >= 1 && soundTempo <= 300
        ? Math.round(soundTempo)
        : undefined;

    const callBackUrl = getCallbackUrl(request);

    const payload: Record<string, unknown> = {
      prompt: prompt.trim(),
      model: "V5", // Suno sadece V5 destekliyor bu endpoint için
      callBackUrl,
      ...(validatedSoundKey && validatedSoundKey !== "Any"
        ? { soundKey: validatedSoundKey }
        : {}),
      ...(typeof soundLoop === "boolean" ? { soundLoop } : {}),
      ...(validatedTempo !== undefined ? { soundTempo: validatedTempo } : {}),
      ...(typeof grabLyrics === "boolean" ? { grabLyrics } : {}),
    };

    console.log(
      "[generate-sounds] Suno payload:",
      JSON.stringify(payload).slice(0, 300),
    );

    const response = await fetch(`${SUNO_BASE_URL}/api/v1/generate/sounds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    const taskId: string | undefined = data?.data?.taskId;

    if (!response.ok || data.code !== 200) {
      const rawMsg: string =
        data.message || data.error || data.msg || "Ses üretimi başlatılamadı";
      const translated = translateSunoError(data.code, rawMsg);
      if (taskId) {
        saveProcessingTask(taskId, prompt.trim(), session.user.id).catch((e) =>
          console.error("[db] saveProcessingTask hatası:", e),
        );
        markTaskFailed(taskId, translated.title, translated.message).catch(
          () => {},
        );
      }
      return NextResponse.json(
        {
          error: `${translated.title}: ${translated.message}`,
          errorTitle: translated.title,
          errorCode: data.code,
        },
        { status: 400 },
      );
    }

    if (taskId) {
      saveProcessingTask(taskId, prompt.trim(), session.user.id).catch((e) =>
        console.error("[db] saveProcessingTask hatası:", e),
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[generate-sounds] error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
