"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Song } from "@/types";
import MusicGenerator from "@/components/MusicGenerator";
import {
  GenerationRow,
  GenerationRowSkeleton,
} from "@/components/GenerationRow";
import { usePlayer } from "@/contexts/PlayerContext";
import { Music2 } from "lucide-react";

interface ProcessingTaskState {
  taskId: string;
  title: string;
  startedAt: string;
  imageUrl?: string;
  failed?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  attempts?: number;
}

const VARIANT_COUNT = 2;

export default function CreatePage() {
  const { playSong, currentSong } = usePlayer();
  const router = useRouter();
  const [processingTasks, setProcessingTasks] = useState<ProcessingTaskState[]>(
    [],
  );
  const [songs, setSongs] = useState<Song[]>([]);
  const pollingRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollingRef.current.forEach((t) => clearTimeout(t));
      pollingRef.current.clear();
    };
  }, []);

  const startPolling = useCallback((taskId: string) => {
    if (pollingRef.current.has(taskId)) return;

    let attempts = 0;
    let errorCount = 0;
    const MAX_ATTEMPTS = 300;
    const MAX_ERRORS = 10;
    const POLL_INTERVAL = 2000;
    const ERROR_RETRY_INTERVAL = 3000;

    const poll = async () => {
      if (!mountedRef.current) return;
      const currentAttempt = ++attempts;

      if (currentAttempt > MAX_ATTEMPTS) {
        pollingRef.current.delete(taskId);
        setProcessingTasks((prev) =>
          prev.map((t) => (t.taskId === taskId ? { ...t, failed: true } : t)),
        );
        return;
      }

      if (currentAttempt % 10 === 0) {
        setProcessingTasks((prev) =>
          prev.map((t) =>
            t.taskId === taskId ? { ...t, attempts: currentAttempt } : t,
          ),
        );
      }

      try {
        const res = await fetch(`/api/songs?taskId=${taskId}`);
        const data: { status: string; songs: Song[] } = await res.json();

        const previewImage = data.songs?.find((s) => s.imageUrl)?.imageUrl;
        if (previewImage) {
          setProcessingTasks((prev) =>
            prev.map((t) =>
              t.taskId === taskId && !t.imageUrl
                ? { ...t, imageUrl: previewImage }
                : t,
            ),
          );
        }

        // Suno hata döndüyse (400, copyright vb.) polling'i durdur ve failed göster
        if (data.status === "failed" || data.status === "error") {
          pollingRef.current.delete(taskId);
          setProcessingTasks((prev) =>
            prev.map((t) =>
              t.taskId === taskId
                ? {
                    ...t,
                    failed: true,
                    errorTitle:
                      ((data as Record<string, unknown>)
                        .errorTitle as string) || "Üretim başarısız",
                    errorMessage:
                      ((data as Record<string, unknown>)
                        .errorMessage as string) || "Tekrar deneyebilirsin",
                  }
                : t,
            ),
          );
          return;
        }

        const playableSongs = (data.songs ?? []).filter(
          (s) => s.audioUrl || s.streamUrl,
        );

        if (data.status === "complete" && playableSongs.length > 0) {
          pollingRef.current.delete(taskId);
          setProcessingTasks((prev) => prev.filter((t) => t.taskId !== taskId));
          setSongs((prev) => {
            const ids = new Set(prev.map((s) => s.id));
            const fresh = playableSongs.filter((s) => !ids.has(s.id));
            return [...fresh, ...prev].slice(0, 40);
          });
          return;
        }

        errorCount = 0;
        const timer = setTimeout(poll, POLL_INTERVAL);
        pollingRef.current.set(taskId, timer);
      } catch {
        errorCount++;
        if (errorCount > MAX_ERRORS) {
          pollingRef.current.delete(taskId);
          setProcessingTasks((prev) =>
            prev.map((t) => (t.taskId === taskId ? { ...t, failed: true } : t)),
          );
          return;
        }
        const timer = setTimeout(poll, ERROR_RETRY_INTERVAL);
        pollingRef.current.set(taskId, timer);
      }
    };

    const timer = setTimeout(poll, POLL_INTERVAL);
    pollingRef.current.set(taskId, timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchFeed = async () => {
      try {
        const res = await fetch("/api/all-songs?limit=20", {
          cache: "no-store",
        });
        const d = await res.json();
        if (cancelled || !mountedRef.current) return;

        const tasks: Array<{
          taskId: string;
          prompt: string;
          startedAt: string;
          status?: "processing" | "failed";
          imageUrl?: string;
          title?: string;
          errorTitle?: string;
          errorMessage?: string;
        }> = d.processing ?? [];

        setProcessingTasks((prev) => {
          return tasks.map((t) => ({
            taskId: t.taskId,
            title: t.title || t.prompt?.slice(0, 50) || "Şarkı",
            startedAt: t.startedAt,
            imageUrl: t.imageUrl,
            failed: t.status === "failed",
            errorTitle: t.errorTitle,
            errorMessage: t.errorMessage,
            attempts: prev.find((p) => p.taskId === t.taskId)?.attempts,
          }));
        });

        if (Array.isArray(d.songs)) {
          setSongs((prev) => {
            const byId = new Map<string, Song>();
            for (const s of prev) byId.set(s.id, s);
            for (const s of d.songs as Song[]) byId.set(s.id, s);
            const merged = Array.from(byId.values()).sort((a, b) =>
              (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
            );
            return merged.slice(0, 40);
          });
        }
      } catch {
        /* sessizce */
      }
    };
    fetchFeed();
    const id = setInterval(fetchFeed, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    processingTasks.forEach((t) => {
      if (!t.failed) startPolling(t.taskId);
    });
  }, [processingTasks, startPolling]);

  const handleTaskStarted = useCallback(
    (taskId: string, prompt: string, title: string) => {
      const newTask: ProcessingTaskState = {
        taskId,
        title: title || prompt.slice(0, 50),
        startedAt: new Date().toISOString(),
      };
      setProcessingTasks((prev) => {
        if (prev.some((t) => t.taskId === taskId)) return prev;
        return [newTask, ...prev];
      });
    },
    [],
  );

  const handlePlay = useCallback(
    (song: Song) => {
      playSong(song, songs);
    },
    [playSong, songs],
  );

  const handleOpenDetail = useCallback(
    (song: Song) => {
      router.push(`/song/${song.id}`);
    },
    [router],
  );

  const handleDismissFailed = useCallback(async (taskId: string) => {
    setProcessingTasks((prev) => prev.filter((t) => t.taskId !== taskId));
    try {
      await fetch(`/api/processing-tasks/${taskId}`, { method: "DELETE" });
    } catch {
      /* sessizce */
    }
  }, []);

  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);
  const handleRetry = useCallback(
    async (taskId: string) => {
      if (retryingTaskId) return;
      setRetryingTaskId(taskId);
      try {
        const res = await fetch(`/api/tasks/${taskId}/retry`, {
          method: "POST",
        });
        const data = await res.json();
        if (res.ok) {
          setProcessingTasks((prev) => prev.filter((t) => t.taskId !== taskId));
        } else {
          alert(data.error || "Yeniden başlatılamadı");
        }
      } catch {
        alert("Bağlantı hatası");
      } finally {
        setRetryingTaskId(null);
      }
    },
    [retryingTaskId],
  );

  const hasActivity = processingTasks.length > 0 || songs.length > 0;

  return (
    <div className="min-h-full bg-[#0a0a0a]">
      <div className="mx-auto max-w-[640px] lg:max-w-none px-5 lg:px-8 pt-6 pb-28 flex flex-col lg:flex-row lg:gap-8">
        {/* SOL PANEL — Form (desktop'ta sticky) */}
        <div className="w-full lg:w-[420px] lg:flex-shrink-0 lg:sticky lg:top-0 lg:self-start lg:max-h-[calc(100vh-90px)] lg:overflow-y-auto scrollbar-hide">
          {/* Başlık */}
          <h1 className="text-white text-2xl font-black">Oluştur</h1>
          <p className="text-[#666] text-[13px] mt-1 mb-6">
            AI ile özgün şarkılar yap
          </p>

          {/* Form */}
          <Suspense fallback={null}>
            <MusicGenerator onTaskStarted={handleTaskStarted} />
          </Suspense>
        </div>

        {/* SAĞ PANEL — Sonuçlar (desktop'ta scroll) */}
        <div className="flex-1 min-w-0 mt-10 lg:mt-0">
          {hasActivity && (
            <div>
              <p className="text-[#666] text-[11px] font-semibold uppercase tracking-wider mb-3 lg:sticky lg:top-0 lg:bg-[#0a0a0a] lg:py-2 lg:z-10">
                Son Üretimler
              </p>
              <div className="flex flex-col gap-0.5">
                {processingTasks.map((task) =>
                  task.failed ? (
                    <GenerationRowSkeleton
                      key={task.taskId}
                      failed
                      errorTitle={task.errorTitle}
                      errorMessage={task.errorMessage}
                      onCancel={() => handleDismissFailed(task.taskId)}
                      onRetry={() => handleRetry(task.taskId)}
                      retrying={retryingTaskId === task.taskId}
                    />
                  ) : (
                    Array.from({ length: VARIANT_COUNT }).map((_, i) => (
                      <GenerationRowSkeleton
                        key={`${task.taskId}:${i}`}
                        imageHint={task.imageUrl}
                        onCancel={
                          i === 0
                            ? () => handleDismissFailed(task.taskId)
                            : undefined
                        }
                      />
                    ))
                  ),
                )}
                {(() => {
                  // taskId'ye göre grupla — aynı task'tan gelen varyantları birlikte göster
                  const grouped: Array<{
                    taskId: string | null;
                    songs: Song[];
                  }> = [];
                  const seen = new Set<string>();
                  for (const song of songs) {
                    const key = song.taskId || song.id;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    const siblings = song.taskId
                      ? songs.filter((s) => s.taskId === song.taskId)
                      : [song];
                    grouped.push({
                      taskId: song.taskId || null,
                      songs: siblings,
                    });
                  }
                  return grouped.map((group) =>
                    group.songs.length > 1 ? (
                      <div
                        key={group.taskId || group.songs[0].id}
                        className="space-y-0.5"
                      >
                        <div className="flex items-center gap-1.5 px-3 pt-1">
                          <span className="text-[10px] text-[#444] uppercase tracking-wider font-medium">
                            Varyantlar
                          </span>
                          {group.songs.every(
                            (s) => s.pronunciationScore != null,
                          ) && (
                            <span className="text-[10px] text-[#333]">
                              — skorla karşılaştır
                            </span>
                          )}
                        </div>
                        {group.songs.map((song, i) => (
                          <div
                            key={song.id}
                            className="flex items-center gap-0"
                          >
                            <span
                              className={`w-5 text-center text-[10px] font-bold flex-shrink-0 ${
                                song.isPrimary
                                  ? "text-emerald-400"
                                  : "text-[#444]"
                              }`}
                            >
                              {String.fromCharCode(65 + i)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <GenerationRow
                                song={song}
                                isPlaying={currentSong?.id === song.id}
                                onPlay={() => handlePlay(song)}
                                onOpenDetail={() => handleOpenDetail(song)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <GenerationRow
                        key={group.songs[0].id}
                        song={group.songs[0]}
                        isPlaying={currentSong?.id === group.songs[0].id}
                        onPlay={() => handlePlay(group.songs[0])}
                        onOpenDetail={() => handleOpenDetail(group.songs[0])}
                      />
                    ),
                  );
                })()}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasActivity && (
            <div className="flex flex-col items-center py-16 text-center">
              <Music2 size={36} className="text-[#333] mb-3" />
              <p className="text-[#444] text-sm">
                Oluşturduğun şarkılar burada görünür
              </p>
            </div>
          )}
        </div>
        {/* sağ panel sonu */}
      </div>
    </div>
  );
}
