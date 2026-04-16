"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

// Suno her task için 2 varyant üretir — placeholder slot sayısı
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

  // Tek bir task için polling — Suno callback sonrası şarkı DB'ye düşene kadar
  const startPolling = useCallback((taskId: string) => {
    if (pollingRef.current.has(taskId)) return;

    let attempts = 0;
    let errorCount = 0;
    const MAX_ATTEMPTS = 300; // 10 dk
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

        // Geçici cover — skeleton'da blur olarak göster
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

        // Çalınabilir = audioUrl VEYA streamUrl
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

  // Mount + 5sn'de bir — processing task'ları + kullanıcı şarkılarını tazele
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

        // Kullanıcının son 20 şarkısı (kalıcı — sayfa yenilense de kalır)
        if (Array.isArray(d.songs)) {
          setSongs((prev) => {
            // Mevcut state'te henüz DB'ye düşmemiş polling sonucu olabilir — koru
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

  // Her aktif task için polling başlat
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
    <div className="min-h-full bg-[#121212]">
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#1a3a2a] to-[#121212] pt-16 md:pt-20 px-6 pb-6">
        <h1 className="text-white text-3xl font-black tracking-tight">
          Oluştur
        </h1>
        <p className="text-[#a7a7a7] text-sm mt-1">AI ile özgün şarkılar yap</p>
      </div>

      <div className="px-6 py-6 flex flex-col md:flex-row gap-8 items-start">
        {/* Sol: üretim formu */}
        <div className="w-full md:max-w-lg md:flex-shrink-0">
          <MusicGenerator onTaskStarted={handleTaskStarted} />
        </div>

        {/* Sağ: birleşik timeline (Suno tarzı) */}
        <div className="w-full md:flex-1 md:min-w-0 flex flex-col gap-1">
          {hasActivity && (
            <p className="text-[#a7a7a7] text-xs font-bold uppercase tracking-widest mb-2 px-3">
              Son Üretimler
            </p>
          )}

          {/* Aktif üretim — her task için 2 skeleton satır */}
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
                    i === 0 ? () => handleDismissFailed(task.taskId) : undefined
                  }
                />
              ))
            ),
          )}

          {/* Tamamlanmış şarkılar */}
          {songs.map((song) => (
            <GenerationRow
              key={song.id}
              song={song}
              isPlaying={currentSong?.id === song.id}
              onPlay={() => handlePlay(song)}
              onOpenDetail={() => handleOpenDetail(song)}
            />
          ))}

          {/* Empty state */}
          {!hasActivity && (
            <div className="hidden md:flex flex-col items-center justify-center py-20 text-center">
              <Music2 size={40} className="text-[#535353] mb-3" />
              <p className="text-[#535353] text-sm">
                Oluşturduğun şarkılar burada görünür
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
