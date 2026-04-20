import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserPersonas, savePersona } from "@/lib/taskStore";
import sql from "@/lib/db";
import { translateSunoError } from "@/lib/sunoErrors";

const SUNO_API_KEY = process.env.SUNO_API_KEY ?? "";
const SUNO_BASE_URL = "https://api.sunoapi.org";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  const personas = await getUserPersonas(session.user.id);
  return NextResponse.json({ personas });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  const body = await request.json();
  const {
    songId,
    name,
    description,
    vocalStart = 0,
    vocalEnd = 30,
    style,
  } = body as {
    songId: string;
    name: string;
    description?: string;
    vocalStart?: number;
    vocalEnd?: number;
    style?: string;
  };

  if (!songId || !name?.trim()) {
    return NextResponse.json(
      { error: "Şarkı ve persona adı zorunludur" },
      { status: 400 },
    );
  }

  const duration = vocalEnd - vocalStart;
  if (duration < 10 || duration > 30) {
    return NextResponse.json(
      { error: "Vokal aralığı 10-30 saniye arasında olmalıdır" },
      { status: 400 },
    );
  }

  // Şarkının kullanıcıya ait olduğunu doğrula
  const [song] = await sql`
    SELECT id, task_id FROM songs
    WHERE id = ${songId} AND created_by = ${session.user.id}
  `;
  if (!song) {
    return NextResponse.json(
      { error: "Şarkı bulunamadı veya size ait değil" },
      { status: 404 },
    );
  }

  if (!song.task_id) {
    return NextResponse.json(
      { error: "Bu şarkının task ID'si bulunamadı" },
      { status: 400 },
    );
  }

  // Suno API'ye persona oluştur
  try {
    const res = await fetch(
      `${SUNO_BASE_URL}/api/v1/generate/generate-persona`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUNO_API_KEY}`,
        },
        body: JSON.stringify({
          taskId: song.task_id,
          audioId: songId,
          name: name.trim(),
          description: description?.trim() || undefined,
          vocalStart,
          vocalEnd,
          style: style?.trim() || undefined,
        }),
      },
    );

    const data = await res.json();

    if (!res.ok || data.code !== 200) {
      console.log("Suno persona error:", JSON.stringify(data));

      // 409 = bu audio'dan zaten persona oluşturulmuş
      if (data.code === 409) {
        return NextResponse.json(
          { error: "Bu şarkı için zaten bir persona oluşturulmuş" },
          { status: 409 },
        );
      }

      const translated = translateSunoError(
        data.code,
        data.message || data.msg || "Persona oluşturulamadı",
      );
      return NextResponse.json(
        { error: `${translated.title}: ${translated.message}` },
        { status: 400 },
      );
    }

    const sunoPersonaId = data.data?.personaId;
    if (!sunoPersonaId) {
      return NextResponse.json(
        { error: "Suno personaId döndürmedi" },
        { status: 500 },
      );
    }

    // DB'ye kaydet
    const persona = await savePersona(
      session.user.id,
      sunoPersonaId,
      name.trim(),
      description?.trim(),
      songId,
      vocalStart,
      vocalEnd,
      "voice_persona",
      style?.trim(),
    );

    return NextResponse.json({ persona });
  } catch (error) {
    console.error("Persona create error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
