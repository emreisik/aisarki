import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveProcessingTask, markTaskFailed } from "@/lib/taskStore";
import { translateSunoError } from "@/lib/sunoErrors";
import { checkCanGenerate, deductCredits } from "@/lib/credits";
import sql from "@/lib/db";

const SUNO_API_KEY = process.env.SUNO_API_KEY ?? "";
const SUNO_BASE_URL = "https://api.sunoapi.org";

function getCallbackUrl(request: NextRequest): string {
  const raw = process.env.APP_URL?.trim();
  if (raw) return `${raw.replace(/\/+$/, "")}/api/callback`;
  return `${new URL(request.url).origin}/api/callback`;
}

/**
 * Stems Ayırma — vocal/enstrümantal (separate_vocal, 10 kredi) veya 12 stem (split_stem, 50 kredi)
 * POST /api/stems
 *
 * Body: { songId: string, type: "separate_vocal" | "split_stem" }
 *
 * Şarkının orijinal Suno taskId'sini ve audioId'sini DB'den çıkarır,
 * Suno'nun /vocal-removal/generate endpoint'ine yeni bir job açar.
 * Sonuç callback ile gelir, songs.stems_data JSON'ına yazılır.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { songId, type } = body as {
      songId: string;
      type: "separate_vocal" | "split_stem";
    };

    if (!songId || !type) {
      return NextResponse.json(
        { error: "songId ve type zorunludur" },
        { status: 400 },
      );
    }
    if (type !== "separate_vocal" && type !== "split_stem") {
      return NextResponse.json({ error: "Geçersiz type" }, { status: 400 });
    }

    // Şarkıyı bul + sahiplik kontrolü
    const rows = (await sql`
      SELECT id, task_id, created_by, stems_data
      FROM songs
      WHERE id = ${songId}
      LIMIT 1
    `) as {
      id: string;
      task_id: string | null;
      created_by: string | null;
      stems_data: Record<string, unknown> | null;
    }[];

    const song = rows[0];
    if (!song) {
      return NextResponse.json({ error: "Şarkı bulunamadı" }, { status: 404 });
    }
    if (song.created_by !== session.user.id) {
      return NextResponse.json(
        { error: "Bu şarkıya erişim yetkiniz yok" },
        { status: 403 },
      );
    }
    if (!song.task_id) {
      return NextResponse.json(
        { error: "Şarkının orijinal taskId'si yok — stems ayrılamaz" },
        { status: 400 },
      );
    }

    // Aynı tip için zaten stems varsa idempotent dön
    const existing = song.stems_data as Record<string, unknown> | null;
    if (existing && existing[type]) {
      return NextResponse.json({
        ok: true,
        stems: existing[type],
        cached: true,
      });
    }

    // Plan + kredi kontrolü
    const action = type === "separate_vocal" ? "stems_separate" : "stems_split";
    const check = await checkCanGenerate(session.user.id, { action });
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
    // Stems flag'i kontrol et — Free planda kapalı
    if (!check.plan.features.stems) {
      return NextResponse.json(
        {
          error: `Stems ayırma ${check.plan.name} planında kilitli — yükselt`,
          code: "plan_not_allowed",
        },
        { status: 403 },
      );
    }

    const callBackUrl = getCallbackUrl(request);
    const payload = {
      taskId: song.task_id,
      audioId: song.id,
      type,
      callBackUrl,
    };

    const response = await fetch(
      `${SUNO_BASE_URL}/api/v1/vocal-removal/generate`,
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
    const newTaskId = data.data?.taskId;

    const endpointTag =
      type === "separate_vocal" ? "stems-separate" : "stems-split";

    if (!response.ok || data.code !== 200) {
      const translated = translateSunoError(
        data.code,
        data.message || data.msg || "Stems ayırma başarısız",
      );
      if (newTaskId) {
        saveProcessingTask(
          newTaskId,
          `stems:${songId}`,
          session.user.id,
          { ...payload, songId, type },
          endpointTag,
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
        `stems:${songId}`,
        session.user.id,
        { ...payload, songId, type },
        endpointTag,
      ).catch(() => {});

      await deductCredits(session.user.id, check.cost, action, newTaskId).catch(
        (e) => console.error("[credits] deduct hatası:", e),
      );
    }

    return NextResponse.json({ ok: true, taskId: newTaskId, type });
  } catch (error) {
    console.error("Stems error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

/**
 * Stems verilerini getir
 * GET /api/stems?songId=xxx
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
    SELECT stems_data, created_by
    FROM songs
    WHERE id = ${songId}
    LIMIT 1
  `) as {
    stems_data: Record<string, unknown> | null;
    created_by: string | null;
  }[];

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "Şarkı bulunamadı" }, { status: 404 });
  }
  if (row.created_by !== session.user.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  return NextResponse.json({ stems: row.stems_data ?? {} });
}
