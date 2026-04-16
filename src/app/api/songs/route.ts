import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import {
  getTaskSongs,
  setTaskSongs,
  markTaskComplete,
  getSongsByTaskId,
  updateSongAudioKey,
  updateSongImageKey,
} from "@/lib/taskStore";
import {
  uploadAudioFromUrl,
  uploadImageFromUrl,
  isBunnyConfigured,
} from "@/lib/bunnyStorage";
import { Song } from "@/types";

// Vercel timeout koruması — Suno fetch + Bunny upload için
export const maxDuration = 60;

const SUNO_API_KEY = process.env.SUNO_API_KEY ?? "";
const SUNO_BASE_URL = "https://api.sunoapi.org";

interface RawSunoSong {
  id: string;
  title?: string;
  tags?: string;
  prompt?: string;
  // snake_case (callback formatı)
  audio_url?: string;
  source_audio_url?: string;
  stream_audio_url?: string;
  source_stream_audio_url?: string;
  image_url?: string;
  source_image_url?: string;
  created_at?: string;
  // camelCase (record-info polling formatı)
  audioUrl?: string;
  streamAudioUrl?: string;
  imageUrl?: string;
  duration?: number;
  createTime?: number;
  status?: string;
}

function rawToSong(s: RawSunoSong): Song {
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
    status: isPlayable ? "complete" : "processing",
    createdAt:
      s.created_at ||
      (s.createTime
        ? new Date(s.createTime).toISOString()
        : new Date().toISOString()),
  };
}

async function fetchFromSunoApi(taskId: string): Promise<Song[] | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const res = await fetch(
      `${SUNO_BASE_URL}/api/v1/generate/record-info?taskId=${taskId}`,
      {
        headers: { Authorization: `Bearer ${SUNO_API_KEY}` },
        cache: "no-store",
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`[songs] Suno API ${res.status} for taskId=${taskId}`);
      return null;
    }

    const data = await res.json();
    console.log(
      `[songs] Suno response taskId=${taskId}:`,
      JSON.stringify(data).slice(0, 500),
    );

    // Suno seviyesinde hata
    if (data?.code && data.code !== 200) {
      console.log(`[songs] Suno error code=${data.code} msg=${data.msg}`);
      return null;
    }

    // Tüm olası response formatlarını dene
    // Gerçek format: data.data.response.sunoData (record-info endpoint)
    let rawArr: RawSunoSong[] | null = null;
    if (
      Array.isArray(data?.data?.response?.sunoData) &&
      data.data.response.sunoData.length > 0
    )
      rawArr = data.data.response.sunoData;
    else if (
      Array.isArray(data?.data?.sunoData) &&
      data.data.sunoData.length > 0
    )
      rawArr = data.data.sunoData;
    else if (Array.isArray(data?.data) && data.data.length > 0)
      rawArr = data.data;
    else if (Array.isArray(data?.sunoData) && data.sunoData.length > 0)
      rawArr = data.sunoData;
    else if (Array.isArray(data?.songs) && data.songs.length > 0)
      rawArr = data.songs;
    else if (data?.data && typeof data.data === "object") {
      // data.data içindeki her nested object'e de bak (response.sunoData gibi)
      const deepSearch = (
        obj: Record<string, unknown>,
      ): RawSunoSong[] | null => {
        for (const v of Object.values(obj)) {
          if (Array.isArray(v) && v.length > 0) return v as RawSunoSong[];
          if (v && typeof v === "object") {
            const found = deepSearch(v as Record<string, unknown>);
            if (found) return found;
          }
        }
        return null;
      };
      rawArr = deepSearch(data.data as Record<string, unknown>);
    }

    if (!rawArr) {
      console.log(
        `[songs] No song array found in response for taskId=${taskId}`,
      );
      return null;
    }

    const mapped = rawArr.map(rawToSong);
    console.log(
      `[songs] Parsed ${mapped.length} songs, complete=${mapped.filter((s) => s.status === "complete").length}`,
    );
    // Local dev fallback: callback gelmese bile Bunny upload'ı tetikle
    const playableComplete = mapped.filter((s) => s.status === "complete");
    if (playableComplete.length > 0) {
      maybeTriggerBunnyUpload(playableComplete, rawArr);
    }
    return mapped;
  } catch (e) {
    console.log(`[songs] fetchFromSunoApi error for taskId=${taskId}:`, e);
    return null;
  }
}

/**
 * Local dev fallback: callback gelmese bile polling sırasında Bunny upload
 * tetikle. Çift çalışması sorun değil — Bunny PUT idempotent (aynı path'e
 * overwrite), aynı audio_key iki kez set edilse de sorun yok.
 *
 * after() kullanarak response dönse bile serverless function kesilmez.
 */
function maybeTriggerBunnyUpload(songs: Song[], rawArr: RawSunoSong[]) {
  if (!isBunnyConfigured()) return;
  const jobs = songs
    .map((song) => {
      const raw = rawArr.find((r) => r.id === song.id);
      if (!raw) return null;
      const audioUrl =
        raw.source_audio_url || raw.audio_url || raw.audioUrl || "";
      const imageUrl =
        raw.source_image_url || raw.image_url || raw.imageUrl || "";
      if (!audioUrl.startsWith("http") && !imageUrl.startsWith("http"))
        return null;
      return { id: song.id, audioUrl, imageUrl };
    })
    .filter(
      (j): j is { id: string; audioUrl: string; imageUrl: string } => !!j,
    );
  if (jobs.length === 0) return;

  after(async () => {
    for (const job of jobs) {
      if (job.audioUrl.startsWith("http")) {
        try {
          const key = await uploadAudioFromUrl(job.audioUrl, `${job.id}.mp3`);
          if (key) await updateSongAudioKey(job.id, key);
        } catch (e) {
          console.warn(`[after][songs][bunny] audio fail ${job.id}:`, e);
        }
      }
      if (job.imageUrl.startsWith("http")) {
        try {
          const key = await uploadImageFromUrl(job.imageUrl, `${job.id}.jpg`);
          if (key) await updateSongImageKey(job.id, key);
        } catch (e) {
          console.warn(`[after][songs][bunny] image fail ${job.id}:`, e);
        }
      }
    }
    console.log(`[after][songs][bunny] ${jobs.length} şarkı upload tamam`);
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId gereklidir" }, { status: 400 });
  }

  // 1) In-memory cache — tüm şarkılar tamamsa kullan
  const cached = getTaskSongs(taskId);
  if (
    cached &&
    cached.length > 0 &&
    cached.every((s) => s.status === "complete")
  ) {
    console.log(`[songs] Returning ${cached.length} songs from memory cache`);
    return NextResponse.json({ status: "complete", songs: cached });
  }

  // 2) Suno API'yi doğrudan sorgula
  const songs = await fetchFromSunoApi(taskId);

  if (songs && songs.length > 0) {
    const complete = songs.filter((s) => s.status === "complete");

    // En az bir varyant çalınabilir hale geldiyse complete dön — kullanıcı
    // ikinci varyantı beklemeden ilkini dinlesin. Tümü tamamsa task'ı
    // DB'de de complete markala; yoksa polling bir sonraki varyant için
    // arka planda devam etsin (frontend bu noktada polling'i durduruyor,
    // yeni varyant bir sonraki all-songs pull'da kendiliğinden gelir).
    if (complete.length > 0) {
      setTaskSongs(taskId, songs);
      if (complete.length === songs.length) {
        markTaskComplete(taskId).catch(() => {});
        console.log(
          `[songs] All ${complete.length} songs complete for taskId=${taskId}`,
        );
      } else {
        console.log(
          `[songs] Partial complete ${complete.length}/${songs.length} — returning available, task kept as processing`,
        );
      }
      return NextResponse.json({ status: "complete", songs: complete });
    }
  }

  // 3) DB fallback — callback geldi ama farklı instance'a gitti olabilir
  try {
    const dbSongs = await getSongsByTaskId(taskId);
    if (dbSongs.length > 0) {
      console.log(
        `[songs] DB fallback: found ${dbSongs.length} songs for taskId=${taskId}`,
      );
      setTaskSongs(taskId, dbSongs); // in-memory cache'e al
      markTaskComplete(taskId).catch(() => {});
      return NextResponse.json({ status: "complete", songs: dbSongs });
    }
  } catch {
    // DB fallback başarısız — normal polling devam etsin
  }

  return NextResponse.json({ status: "pending", songs: [] });
}
