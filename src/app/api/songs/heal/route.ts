import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/auth";
import {
  uploadAudioFromUrl,
  uploadImageFromUrl,
  isBunnyConfigured,
} from "@/lib/bunnyStorage";
import { updateSongAudioKey, updateSongImageKey } from "@/lib/taskStore";

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

export const maxDuration = 60;

/**
 * Kullanıcının audio_key'i NULL olan TÜM şarkılarını Bunny'ye yükler.
 * Profile sayfası yüklenince otomatik çağrılır (arka planda). Idempotent.
 */
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }
  if (!isBunnyConfigured()) {
    return NextResponse.json({ ok: true, skipped: "bunny-not-configured" });
  }

  const userId = session.user.id;
  const rows = await sql`
    SELECT id, audio_url, image_url, image_key, task_id, duration
    FROM songs
    WHERE created_by = ${userId}
      AND audio_key IS NULL
      AND created_at > NOW() - INTERVAL '15 days'
    ORDER BY created_at DESC
    LIMIT 20
  `;

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, queued: 0 });
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

        if (!audioSource) {
          const s = sunoSongs.find((x) => x.id === id);
          if (s) {
            audioSource =
              s.source_audio_url || s.audio_url || s.audioUrl || null;
            imageSource =
              s.source_image_url || s.image_url || s.imageUrl || imageSource;
            if (typeof s.duration === "number") duration = s.duration;
          }
        }

        if (typeof audioSource === "string" && audioSource.startsWith("http")) {
          try {
            const key = await uploadAudioFromUrl(audioSource, `${id}.mp3`);
            if (key) {
              await updateSongAudioKey(id, key);
              await sql`
                UPDATE songs
                SET audio_url = COALESCE(NULLIF(audio_url, ''), ${audioSource}),
                    duration  = COALESCE(duration, ${duration})
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
    console.log(`[songs/heal] user=${userId} ✓ ${ok} / ✗ ${fail}`);
  });

  return NextResponse.json({ ok: true, queued: rows.length });
}
