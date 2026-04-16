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
      <div className="mx-auto max-w-[640px] px-5 pt-6 pb-28">
        {/* Başlık */}
        <h1 className="text-white text-2xl font-black">Oluştur</h1>
        <p className="text-[#666] text-[13px] mt-1 mb-6">
          AI ile özgün şarkılar yap
        </p>

        {/* Form */}
        <Suspense fallback={null}>
          <MusicGenerator onTaskStarted={handleTaskStarted} />
        </Suspense>

        {/* Son üretimler */}
        {hasActivity && (
          <div className="mt-10">
            <p className="text-[#666] text-[11px] font-semibold uppercase tracking-wider mb-3">
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
              {songs.map((song) => (
                <GenerationRow
                  key={song.id}
                  song={song}
                  isPlaying={currentSong?.id === song.id}
                  onPlay={() => handlePlay(song)}
                  onOpenDetail={() => handleOpenDetail(song)}
                />
              ))}
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
    </div>
  );
}
