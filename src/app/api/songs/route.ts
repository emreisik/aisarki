import { NextRequest, NextResponse } from "next/server";
import { getTaskSongs, setTaskSongs, markTaskComplete } from "@/lib/taskStore";
import { Song } from "@/types";

const SUNO_API_KEY =
  process.env.SUNO_API_KEY ?? "7049ff127b2d972a33fef22566de8512";
const SUNO_BASE_URL = "https://api.sunoapi.org";

interface RawSunoSong {
  id: string;
  title?: string;
  tags?: string;
  prompt?: string;
  audio_url?: string;
  source_audio_url?: string;
  stream_audio_url?: string;
  source_stream_audio_url?: string;
  image_url?: string;
  source_image_url?: string;
  duration?: number;
  created_at?: string;
  createTime?: number;
  status?: string;
}

function rawToSong(s: RawSunoSong): Song {
  const audioUrl = s.source_audio_url || s.audio_url;
  return {
    id: s.id,
    title: s.title || "İsimsiz Şarkı",
    style: s.tags,
    prompt: s.prompt,
    audioUrl,
    streamUrl: s.source_stream_audio_url || s.stream_audio_url,
    imageUrl: s.source_image_url || s.image_url,
    duration: s.duration,
    status: audioUrl ? "complete" : "processing",
    createdAt:
      s.created_at ||
      (s.createTime
        ? new Date(s.createTime).toISOString()
        : new Date().toISOString()),
  };
}

async function fetchFromSunoApi(taskId: string): Promise<Song[] | null> {
  try {
    const res = await fetch(
      `${SUNO_BASE_URL}/api/v1/generate/record-info?taskId=${taskId}`,
      {
        headers: { Authorization: `Bearer ${SUNO_API_KEY}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;

    const data = await res.json();
    // sunoData doğrudan array olabilir veya data içinde olabilir
    const rawArr: RawSunoSong[] = Array.isArray(data?.data?.sunoData)
      ? data.data.sunoData
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.sunoData)
          ? data.sunoData
          : null;

    if (!rawArr) return null;
    return rawArr.map(rawToSong);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId gereklidir" }, { status: 400 });
  }

  // 1) In-memory cache'de tamamlanmış şarkı var mı?
  const cached = getTaskSongs(taskId);
  const cachedComplete = cached?.filter((s) => s.status === "complete") ?? [];
  if (cachedComplete.length > 0) {
    return NextResponse.json({ status: "complete", songs: cachedComplete });
  }

  // 2) Yoksa Suno API'sini doğrudan sorgula
  const songs = await fetchFromSunoApi(taskId);

  if (!songs || songs.length === 0) {
    return NextResponse.json({ status: "pending", songs: [] });
  }

  const complete = songs.filter((s) => s.status === "complete");

  if (complete.length > 0) {
    setTaskSongs(taskId, songs);
    markTaskComplete(taskId).catch(() => {});
    return NextResponse.json({ status: "complete", songs: complete });
  }

  return NextResponse.json({ status: "pending", songs: [] });
}
