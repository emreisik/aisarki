import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import sql from "@/lib/db";
import {
  uploadAudioFromUrl,
  uploadImageFromUrl,
  isBunnyConfigured,
} from "@/lib/bunnyStorage";
import { updateSongAudioKey, updateSongImageKey } from "@/lib/taskStore";

/**
 * Güvenlik ağı — audio_key'i null olup audio_url'i dolu olan şarkıları Bunny'e
 * yükler. Callback/polling bir sebeple kaçırırsa bu endpoint periyodik
 * çağrılabilir (Vercel Cron veya manuel).
 *
 * Ayrıca task_id'si olan ama audio_url'i de boş olan şarkılar için
 * scripts/refresh-from-suno.mjs tavsiye edilir (Suno record-info çağırır).
 *
 * Auth: ADMIN_HEAL_TOKEN env (header: x-admin-token)
 */

export const maxDuration = 60;

const ADMIN_TOKEN = process.env.ADMIN_HEAL_TOKEN ?? "";

export async function POST(request: NextRequest) {
  if (!ADMIN_TOKEN) {
    return NextResponse.json(
      { error: "ADMIN_HEAL_TOKEN env eksik" },
      { status: 500 },
    );
  }
  if (request.headers.get("x-admin-token") !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isBunnyConfigured()) {
    return NextResponse.json({ error: "Bunny config eksik" }, { status: 500 });
  }

  // Audio_key'i null ama audio_url'i dolu şarkıları bul (max 30 per call)
  const rows = await sql`
    SELECT id, audio_url, image_url, image_key
    FROM songs
    WHERE audio_key IS NULL
      AND audio_url IS NOT NULL
      AND audio_url != ''
    ORDER BY created_at DESC
    LIMIT 30
  `;

  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      healed: 0,
      message: "Kurtarılacak şarkı yok",
    });
  }

  // Response'u hemen dön, işi after()'a bırak
  after(async () => {
    let ok = 0;
    let fail = 0;
    for (const r of rows) {
      const id = r.id as string;
      const audioUrl = r.audio_url as string;
      const imageUrl = r.image_url as string | null;
      if (typeof audioUrl === "string" && audioUrl.startsWith("http")) {
        try {
          const key = await uploadAudioFromUrl(audioUrl, `${id}.mp3`);
          if (key) {
            await updateSongAudioKey(id, key);
            ok++;
          } else fail++;
        } catch {
          fail++;
        }
      }
      if (
        !r.image_key &&
        typeof imageUrl === "string" &&
        imageUrl.startsWith("http")
      ) {
        try {
          const key = await uploadImageFromUrl(imageUrl, `${id}.jpg`);
          if (key) await updateSongImageKey(id, key);
        } catch {
          /* image opsiyonel */
        }
      }
    }
    console.log(`[heal-songs] ✓ ${ok} kurtarıldı / ✗ ${fail} hata`);
  });

  return NextResponse.json({
    ok: true,
    queued: rows.length,
    message: "İşlem arka planda başlatıldı",
  });
}
