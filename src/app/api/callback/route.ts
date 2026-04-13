import { NextRequest, NextResponse } from "next/server";
import { setTaskSongs } from "@/lib/taskStore";
import { Song } from "@/types";

interface RawSong {
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

// body içindeki ilk array'i bul (songs listesi her formatta farklı yerde olabilir)
function findSongsArray(body: Record<string, unknown>): RawSong[] {
  // 1) body.data doğrudan array mı?
  if (Array.isArray(body.data)) return body.data as RawSong[];

  // 2) body.data bir object ise, içindeki her field'a bak
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

  // 3) body'deki diğer array field'lar
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

    const songs: Song[] = rawSongs.map((s: RawSong) => ({
      id: s.id,
      title: s.title || "İsimsiz Şarkı",
      style: s.tags,
      prompt: s.prompt,
      audioUrl: s.source_audio_url || s.audio_url,
      streamUrl: s.source_stream_audio_url || s.stream_audio_url,
      imageUrl: s.source_image_url || s.image_url,
      duration: s.duration,
      status: !!(s.source_audio_url || s.audio_url) ? "complete" : "processing",
      createdAt:
        s.created_at ||
        (s.createTime
          ? new Date(s.createTime).toISOString()
          : new Date().toISOString()),
    }));

    setTaskSongs(taskId, songs);
    console.log(
      `OK: ${songs.length} şarkı kaydedildi — ${songs.map((s) => s.title).join(", ")}`,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
