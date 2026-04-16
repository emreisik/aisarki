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
 * Kullanıcı-tetiklemeli self-heal: şarkının sahibiyse ve audio_key NULL ise
 * Suno'dan kalıcı URL'i çekip Bunny'ye yükler. Callback'in kaçırdığı şarkıları
 * kurtarmak için PlayerContext şarkıyı çaldığında sessizce çağrılır.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  if (!isBunnyConfigured()) {
    return NextResponse.json({ error: "Bunny config eksik" }, { status: 503 });
  }

  const { id } = await params;

  const rows = await sql`
    SELECT id, audio_url, image_url, image_key, audio_key, task_id, duration, created_by
    FROM songs WHERE id = ${id} LIMIT 1
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: "Şarkı yok" }, { status: 404 });
  }
  const row = rows[0];
  if (row.created_by !== session.user.id) {
    return NextResponse.json({ error: "Yetkin yok" }, { status: 403 });
  }
  if (row.audio_key) {
    return NextResponse.json({ ok: true, alreadyHealed: true });
  }

  after(async () => {
    let audioSource = row.audio_url as string | null;
    let imageSource = row.image_url as string | null;
    let duration = row.duration as number | null;

    // audio_url NULL ise Suno record-info'dan çek
    if (!audioSource && row.task_id) {
      const sunoSongs = await fetchTaskSongs(row.task_id as string);
      const s = sunoSongs.find((x) => x.id === id);
      if (s) {
        audioSource = s.source_audio_url || s.audio_url || s.audioUrl || null;
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
          console.log(`[heal] ✓ song=${id}`);
        } else {
          console.warn(`[heal] ✗ bunny upload fail song=${id}`);
        }
      } catch (e) {
        console.warn(`[heal] error song=${id}:`, e);
      }
    } else {
      console.warn(`[heal] ✗ audio kaynağı yok song=${id} task=${row.task_id}`);
    }

    if (
      !row.image_key &&
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
  });

  return NextResponse.json({ ok: true, queued: true });
}
