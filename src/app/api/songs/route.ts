import { NextRequest, NextResponse } from "next/server";
import {
  getTaskSongs,
  setTaskSongs,
  markTaskComplete,
  getSongsByTaskId,
} from "@/lib/taskStore";
import { Song } from "@/types";

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
    return mapped;
  } catch (e) {
    console.log(`[songs] fetchFromSunoApi error for taskId=${taskId}:`, e);
    return null;
  }
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

    if (complete.length > 0 && complete.length === songs.length) {
      // Tüm şarkılar hazır
      setTaskSongs(taskId, songs);
      markTaskComplete(taskId).catch(() => {});
      console.log(
        `[songs] All ${complete.length} songs complete for taskId=${taskId}`,
      );
      return NextResponse.json({ status: "complete", songs: complete });
    }
    // Kısmen hazır — devam et
    console.log(`[songs] Partial: ${complete.length}/${songs.length} complete`);
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
