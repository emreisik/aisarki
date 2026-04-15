import { NextRequest, NextResponse } from "next/server";
import {
  setTaskSongs,
  markTaskComplete,
  getTaskCreatedBy,
  updateSongAudioKey,
  updateSongImageKey,
} from "@/lib/taskStore";
import { sendPushToUser } from "@/lib/pushNotification";
import {
  uploadAudioInBackground,
  uploadImageInBackground,
  isBunnyConfigured,
} from "@/lib/bunnyStorage";
import { Song } from "@/types";

interface RawSong {
  id: string;
  title?: string;
  tags?: string;
  prompt?: string;
  // snake_case
  audio_url?: string;
  source_audio_url?: string;
  stream_audio_url?: string;
  source_stream_audio_url?: string;
  image_url?: string;
  source_image_url?: string;
  created_at?: string;
  // camelCase (yeni API formatı)
  audioUrl?: string;
  streamAudioUrl?: string;
  imageUrl?: string;
  duration?: number;
  createTime?: number;
  status?: string;
}

// body içindeki şarkı array'ini bul — nested path dahil
function findSongsArray(body: Record<string, unknown>): RawSong[] {
  // 1) Gerçek format: body.data.response.sunoData
  const response = (body.data as Record<string, unknown> | undefined)
    ?.response as Record<string, unknown> | undefined;
  if (
    Array.isArray(response?.sunoData) &&
    (response.sunoData as unknown[]).length > 0
  ) {
    console.log("songs found in data.response.sunoData");
    return response.sunoData as RawSong[];
  }

  // 2) body.data doğrudan array mı?
  if (Array.isArray(body.data)) return body.data as RawSong[];

  // 3) body.data bir object ise, içindeki her field'a bak
  if (body.data && typeof body.data === "object") {
    const dataObj = body.data as Record<string, unknown>;
    console.log("data object keys:", Object.keys(dataObj));
    for (const key of Object.keys(dataObj)) {
      if (
        Array.isArray(dataObj[key]) &&
        (dataObj[key] as unknown[]).length > 0
      ) {
        console.log(`songs found in data.${key}`);
        return dataObj[key] as RawSong[];
      }
    }
  }

  // 4) body'deki diğer array field'lar
  for (const key of ["sunoData", "songs", "items", "results"]) {
    if (Array.isArray(body[key])) return body[key] as RawSong[];
  }

  return [];
}

export async function POST(request: NextRequest) {
  try {
    const rawText = await request.text();

    // Tam body'yi logla (hata ayıklama için)
    console.log("=== SUNO CALLBACK ===");
    console.log(rawText.slice(0, 500));
    console.log("====================");

    const body = JSON.parse(rawText) as Record<string, unknown>;

    // taskId: top-level veya data içinde olabilir
    const dataObj = body.data as Record<string, unknown> | undefined;
    const taskId: string =
      (body.task_id as string) ||
      (body.taskId as string) ||
      (dataObj?.task_id as string) ||
      (dataObj?.taskId as string) ||
      "";

    const rawSongs = findSongsArray(body);

    console.log(`taskId="${taskId}" | songs=${rawSongs.length}`);

    if (!taskId) {
      console.warn("taskId yok, atlanıyor");
      return NextResponse.json({ ok: true });
    }

    if (rawSongs.length === 0) {
      console.log("Şarkı yok — sonraki callback bekleniyor");
      return NextResponse.json({ ok: true });
    }

    const songs: Song[] = rawSongs.map((s: RawSong) => {
      const audioUrl = s.source_audio_url || s.audio_url || s.audioUrl;
      const streamUrl =
        s.source_stream_audio_url || s.stream_audio_url || s.streamAudioUrl;
      const imageUrl = s.source_image_url || s.image_url || s.imageUrl;
      // streamUrl varsa dinlenmeye hazır, audioUrl varsa tam yüklü
      const isPlayable = audioUrl || streamUrl;
      return {
        id: s.id,
        title: s.title || "İsimsiz Şarkı",
        style: s.tags,
        prompt: s.prompt,
        audioUrl,
        streamUrl,
        imageUrl,
        duration: s.duration,
        status: isPlayable ? ("complete" as const) : ("processing" as const),
        createdAt:
          s.created_at ||
          (s.createTime
            ? new Date(s.createTime).toISOString()
            : new Date().toISOString()),
      };
    });

    setTaskSongs(taskId, songs);

    // ── Bunny Storage'a kalıcı indirme ──
    // Suno dosyaları 15 gün sonra silinir + stream URL'leri dakikalar içinde expire eder.
    // Callback'te source_audio_url geldiğinde arka planda Bunny'e yükle, DB'ye key yaz.
    if (isBunnyConfigured()) {
      for (const s of songs) {
        const src = rawSongs.find((r) => r.id === s.id);
        if (!src) continue;
        const longLivedAudio =
          src.source_audio_url || src.audio_url || src.audioUrl;
        if (longLivedAudio) {
          uploadAudioInBackground(
            longLivedAudio,
            `${s.id}.mp3`,
            async (key) => {
              await updateSongAudioKey(s.id, key);
            },
          );
        }
        const longLivedImage =
          src.source_image_url || src.image_url || src.imageUrl;
        if (longLivedImage) {
          uploadImageInBackground(
            longLivedImage,
            `${s.id}.jpg`,
            async (key) => {
              await updateSongImageKey(s.id, key);
            },
          );
        }
      }
    }

    // Tüm şarkılar tamamlandıysa DB'de task'ı complete olarak işaretle
    const allComplete =
      songs.length > 0 && songs.every((s) => s.status === "complete");
    if (allComplete) {
      markTaskComplete(taskId).catch(() => {});

      // Oluşturan kullanıcıya push bildirimi gönder
      getTaskCreatedBy(taskId)
        .then((userId) => {
          if (!userId) return;
          const first = songs[0];
          return sendPushToUser(userId, {
            title: "Şarkın hazır!",
            body: `"${first.title}" dinlemeye hazır`,
            icon: first.imageUrl || "/icon-192.png",
            url: `/song/${first.id}`,
            tag: `song-ready-${taskId}`,
          });
        })
        .catch(() => {});
    }

    console.log(
      `OK: ${songs.length} şarkı kaydedildi (allComplete=${allComplete}) — ${songs.map((s) => s.title).join(", ")}`,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
