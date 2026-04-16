import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import {
  setTaskSongs,
  markTaskComplete,
  markTaskFailed,
  getTaskCreatedBy,
  updateSongAudioKey,
  updateSongImageKey,
} from "@/lib/taskStore";
import { translateSunoError, extractSunoError } from "@/lib/sunoErrors";
import { sendPushToUser } from "@/lib/pushNotification";
import {
  uploadAudioFromUrl,
  uploadImageFromUrl,
  isBunnyConfigured,
} from "@/lib/bunnyStorage";
import { Song } from "@/types";

// Vercel serverless function timeout — Bunny upload + Suno fetch için yeterli
export const maxDuration = 60;

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

    // ── Suno hata kodu yakalama ──
    // Callback'te code != 200 veya data.status = failed gelirse task'ı failed yap
    const sunoError = extractSunoError(body);
    if (sunoError) {
      const translated = translateSunoError(sunoError.code, sunoError.message);
      console.warn(
        `[callback] Suno error code=${sunoError.code} → ${translated.title}: ${translated.message}`,
      );
      markTaskFailed(taskId, translated.title, translated.message).catch(
        () => {},
      );

      // Kullanıcıya push bildirimi gönder (varsa)
      getTaskCreatedBy(taskId)
        .then((userId) => {
          if (!userId) return;
          return sendPushToUser(userId, {
            title: translated.title,
            body: translated.message,
            url: "/create",
            tag: `song-failed-${taskId}`,
          });
        })
        .catch(() => {});

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
    // Next.js 15+ `after()` API: response dönse bile upload işi serverless function
    // kesilmeden tamamlanır (fire-and-forget Promise'ler Vercel'de kesilebiliyor).
    if (isBunnyConfigured()) {
      const uploadJobs = songs
        .map((s) => {
          const src = rawSongs.find((r) => r.id === s.id);
          if (!src) return null;
          return {
            id: s.id,
            audioUrl:
              src.source_audio_url || src.audio_url || src.audioUrl || "",
            imageUrl:
              src.source_image_url || src.image_url || src.imageUrl || "",
          };
        })
        .filter(
          (j): j is { id: string; audioUrl: string; imageUrl: string } => !!j,
        );

      after(async () => {
        for (const job of uploadJobs) {
          if (job.audioUrl) {
            try {
              const key = await uploadAudioFromUrl(
                job.audioUrl,
                `${job.id}.mp3`,
              );
              if (key) await updateSongAudioKey(job.id, key);
            } catch (e) {
              console.warn(`[after][bunny] audio fail ${job.id}:`, e);
            }
          }
          if (job.imageUrl) {
            try {
              const key = await uploadImageFromUrl(
                job.imageUrl,
                `${job.id}.jpg`,
              );
              if (key) await updateSongImageKey(job.id, key);
            } catch (e) {
              console.warn(`[after][bunny] image fail ${job.id}:`, e);
            }
          }
        }
        console.log(
          `[after][bunny] ${uploadJobs.length} şarkı Bunny upload tamamlandı`,
        );
      });
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
