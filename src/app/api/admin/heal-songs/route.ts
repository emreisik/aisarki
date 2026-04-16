import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import sql from "@/lib/db";
import {
  uploadAudioFromUrl,
  uploadImageFromUrl,
  isBunnyConfigured,
} from "@/lib/bunnyStorage";
import { updateSongAudioKey, updateSongImageKey } from "@/lib/taskStore";
import { checkAdminToken } from "@/lib/adminAuth";

const SUNO_API_KEY = process.env.SUNO_API_KEY ?? "";
const SUNO_BASE = "https://api.sunoapi.org";

interface SunoSong {
  id: string;
  audio_url?: string;
  source_audio_url?: string;
  audioUrl?: string;
  image_url?: string;
  source_image_url?: string;
  imageUrl?: string;
  duration?: number;
}

async function fetchTaskSongs(taskId: string): Promise<SunoSong[]> {
  if (!SUNO_API_KEY) return [];
  try {
    const res = await fetch(
      `${SUNO_BASE}/api/v1/generate/record-info?taskId=${taskId}`,
      { headers: { Authorization: `Bearer ${SUNO_API_KEY}` } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data?.response?.sunoData as SunoSong[]) ?? [];
  } catch {
    return [];
  }
}

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

export async function POST(request: NextRequest) {
  const authz = checkAdminToken(request);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  if (!isBunnyConfigured()) {
    return NextResponse.json({ error: "Bunny config eksik" }, { status: 500 });
  }

  // audio_key'i olmayan tüm şarkılar (max 30 per call)
  // İki senaryo:
  //   (a) audio_url var → direkt Bunny'e yükle
  //   (b) audio_url null → Suno record-info'dan çek (task_id varsa)
  const rows = await sql`
    SELECT id, audio_url, image_url, image_key, task_id, duration
    FROM songs
    WHERE audio_key IS NULL
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

  // task_id'ye göre grupla — aynı task için tek Suno çağrısı yeter
  const byTask = new Map<string, typeof rows>();
  for (const r of rows) {
    const tid = (r.task_id as string) || "__no_task__";
    if (!byTask.has(tid)) byTask.set(tid, []);
    byTask.get(tid)!.push(r);
  }

  after(async () => {
    let ok = 0;
    let fail = 0;
    for (const [taskId, taskRows] of byTask) {
      const needsSuno = taskRows.every(
        (r) => !r.audio_url || r.audio_url === "",
      );
      const sunoSongs =
        needsSuno && taskId !== "__no_task__"
          ? await fetchTaskSongs(taskId)
          : [];

      for (const r of taskRows) {
        const id = r.id as string;
        let audioSource = r.audio_url as string | null;
        let imageSource = r.image_url as string | null;
        let duration = r.duration as number | null;

        if (!audioSource || audioSource === "") {
          const s = sunoSongs.find((x) => x.id === id);
          if (s) {
            audioSource =
              s.source_audio_url || s.audio_url || s.audioUrl || null;
            imageSource =
              s.source_image_url || s.image_url || s.imageUrl || imageSource;
            duration = typeof s.duration === "number" ? s.duration : duration;
          }
        }

        if (typeof audioSource === "string" && audioSource.startsWith("http")) {
          try {
            const key = await uploadAudioFromUrl(audioSource, `${id}.mp3`);
            if (key) {
              await updateSongAudioKey(id, key);
              // audio_url ve duration da güncelle (daha sonra başka yer okuduğunda kullanılır)
              await sql`
                UPDATE songs
                SET audio_url = COALESCE(NULLIF(audio_url, ''), ${audioSource}),
                    duration = COALESCE(duration, ${duration})
                WHERE id = ${id}
              `;
              ok++;
            } else fail++;
          } catch {
            fail++;
          }
        } else {
          fail++;
        }

        if (
          !r.image_key &&
          typeof imageSource === "string" &&
          imageSource.startsWith("http")
        ) {
          try {
            const key = await uploadImageFromUrl(imageSource, `${id}.jpg`);
            if (key) await updateSongImageKey(id, key);
          } catch {
            /* image opsiyonel */
          }
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

// Cron'lar GET yollar. Token yine header'dan (Authorization veya x-admin-token) —
// query param kabul edilmez (browser history + access log leak).
export async function GET(request: NextRequest) {
  return POST(request);
}
