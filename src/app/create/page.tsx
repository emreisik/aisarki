"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Song } from "@/types";
import MusicGenerator from "@/components/MusicGenerator";
import SongCard from "@/components/SongCard";
import { usePlayer } from "@/contexts/PlayerContext";
import { Loader2, Music2, Play, ListPlus } from "lucide-react";

interface ProcessingTask {
  taskId: string;
  title: string;
  startedAt: string;
  attempts?: number;
  failed?: boolean;
}

// ── Processing banner card ────────────────────────────────────────────────────

function ProcessingBanner({
  tasks,
  onDismissFailed,
}: {
  tasks: ProcessingTask[];
  onDismissFailed: (taskId: string) => void;
}) {
  if (tasks.length === 0) return null;

  const activeTasks = tasks.filter((t) => !t.failed);
  const failedTasks = tasks.filter((t) => t.failed);

  return (
    <div className="mb-6 flex flex-col gap-3">
      {activeTasks.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-[#1db954]/20 bg-[#0d1f14]">
          {/* Glowing top bar */}
          <div
            className="h-1 w-full"
            style={{
              background:
                "linear-gradient(90deg, #1db954 0%, #17a349 50%, #1db954 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2s linear infinite",
            }}
          />

          <div className="px-4 py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#1db954]/10 flex items-center justify-center">
                <Loader2 size={16} className="text-[#1db954] animate-spin" />
              </div>
              <div>
                <p className="text-white text-sm font-bold">
                  {activeTasks.length === 1
                    ? "Şarkın oluşturuluyor"
                    : `${activeTasks.length} şarkı oluşturuluyor`}
                </p>
                <p className="text-[#1db954]/70 text-xs">
                  Sayfa yenilenirse devam eder · ~1–3 dk
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {activeTasks.map((t) => (
                <div
                  key={t.taskId}
                  className="flex items-center gap-3 bg-[#1db954]/5 rounded-xl px-3 py-2.5"
                >
                  {/* Waveform animation */}
                  <span className="flex items-end gap-[3px] h-4 flex-shrink-0">
                    {[0, 0.2, 0.1, 0.3, 0.05].map((d, i) => (
                      <span
                        key={i}
                        className="wave-bar rounded-sm"
                        style={{
                          width: "2px",
                          height: "100%",
                          background: "#1db954",
                          animationDelay: `${d}s`,
                        }}
                      />
                    ))}
                  </span>
                  <p className="text-white text-sm font-medium flex-1 truncate">
                    {t.title}
                  </p>
                  <span className="text-[#1db954]/60 text-xs flex-shrink-0">
                    {t.attempts != null
                      ? `${t.attempts}. deneme`
                      : "×2 versiyon"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {failedTasks.length > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 flex flex-col gap-2">
          <p className="text-red-400 text-sm font-semibold">
            Oluşturma zaman aşımına uğradı
          </p>
          {failedTasks.map((t) => (
            <div
              key={t.taskId}
              className="flex items-center justify-between gap-2"
            >
              <p className="text-[#a7a7a7] text-xs truncate flex-1">
                {t.title}
              </p>
              <div className="flex items-center gap-3 flex-shrink-0">
                <a
                  href={`/api/debug-task?taskId=${t.taskId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#a7a7a7] hover:text-white text-xs underline"
                >
                  Detay
                </a>
                <button
                  onClick={() => onDismissFailed(t.taskId)}
                  className="text-[#535353] hover:text-red-400 text-xs transition-colors"
                >
                  Kapat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Completed song row ────────────────────────────────────────────────────────

function CompletedSection({
  songs,
  onPlay,
  currentSongId,
  onAddToPlaylist,
}: {
  songs: Song[];
  onPlay: (song: Song) => void;
  currentSongId?: string;
  onAddToPlaylist: (song: Song) => void;
}) {
  if (songs.length === 0) return null;

  return (
    <div>
      <p className="text-[#a7a7a7] text-xs font-bold uppercase tracking-widest mb-3">
        Bu Oturumda Tamamlananlar
      </p>
      <div className="flex flex-col gap-1">
        {songs.map((song) => (
          <div key={song.id} className="flex items-center gap-2 group">
            <div className="flex-1 min-w-0">
              <SongCard
                song={song}
                onPlay={(s) => onPlay(s)}
                isPlaying={currentSongId === song.id}
                variant="row"
              />
            </div>
            <button
              onClick={() => onAddToPlaylist(song)}
              className="flex-shrink-0 w-9 h-9 rounded-full bg-[#1a1a1a] hover:bg-[#2a2a2a] flex items-center justify-center text-[#a7a7a7] hover:text-[#1db954] transition-colors pressable opacity-0 group-hover:opacity-100"
              title="Listeye ekle"
            >
              <ListPlus size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CreatePage() {
  const { playSong, currentSong } = usePlayer();
  const router = useRouter();
  const [processingTasks, setProcessingTasks] = useState<ProcessingTask[]>([]);
  const [completedSongs, setCompletedSongs] = useState<Song[]>([]);
  const pollingRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollingRef.current.forEach((t) => clearTimeout(t));
      pollingRef.current.clear();
    };
  }, []);

  // Poll a single taskId until complete or timeout
  const startPolling = useCallback((taskId: string) => {
    if (pollingRef.current.has(taskId)) return;

    let attempts = 0;
    let errorCount = 0;
    const MAX_ATTEMPTS = 300; // 300 × 2s = 10 dakika
    const MAX_ERRORS = 10; // 10 hata sonra dur
    const POLL_INTERVAL = 2000; // 2 saniye — daha hızlı feedback
    const ERROR_RETRY_INTERVAL = 3000; // Hata durumunda 3 saniye

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

      // Her 10 denemede bir attempts sayısını güncelle
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

        if (data.status === "complete" && data.songs?.length > 0) {
          pollingRef.current.delete(taskId);
          setProcessingTasks((prev) => prev.filter((t) => t.taskId !== taskId));

          setCompletedSongs((prev) => {
            const ids = new Set(prev.map((s) => s.id));
            const fresh = data.songs.filter((s) => !ids.has(s.id));
            // Tüm şarkılar zaten ekli ise (streaming URL'den hemen gelmişse), polling stop et
            if (fresh.length === 0) {
              pollingRef.current.delete(taskId);
            }
            return [...fresh, ...prev];
          });
          return;
        }

        // Hata sayacını sıfırla (başarılı request)
        errorCount = 0;
        const timer = setTimeout(poll, POLL_INTERVAL);
        pollingRef.current.set(taskId, timer);
      } catch (e) {
        errorCount++;
        console.log(
          `[polling] Hata ${errorCount}/${MAX_ERRORS} için taskId=${taskId}`,
        );

        // Çok fazla hata — dur
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

  // On mount: load processing tasks from DB
  useEffect(() => {
    fetch("/api/all-songs")
      .then((r) => r.json())
      .then((d) => {
        if (!mountedRef.current) return;
        const tasks: Array<{
          taskId: string;
          prompt: string;
          startedAt: string;
        }> = d.processing ?? [];
        if (tasks.length > 0) {
          setProcessingTasks(
            tasks.map((t) => ({
              taskId: t.taskId,
              title: t.prompt?.slice(0, 50) || "Şarkı",
              startedAt: t.startedAt,
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  // Start polling for each task
  useEffect(() => {
    processingTasks.forEach((t) => startPolling(t.taskId));
  }, [processingTasks, startPolling]);

  // Called by MusicGenerator when API responds with a taskId
  const handleTaskStarted = useCallback(
    (
      taskId: string,
      prompt: string,
      title: string,
      streamUrl?: string,
      songId?: string,
    ) => {
      // Streaming URL hemen geldi ise, hemen completed songs'a ekle
      // Bu durumda polling başlamayacak (processingTasks'e eklenmeyecek)
      if (streamUrl && songId) {
        const instantSong: Song = {
          id: songId,
          title: title || prompt.slice(0, 50),
          prompt,
          streamUrl,
          status: "complete",
          createdAt: new Date().toISOString(),
        };
        setCompletedSongs((prev) => {
          const exists = prev.some((s) => s.id === songId);
          return exists ? prev : [instantSong, ...prev];
        });
        // Streaming URL varsa, processingTasks'e ekleme — kullanıcı zaten dinleyebilir
        return;
      }

      // Streaming URL yok → polling başlatmak için processingTasks'e ekle
      const newTask: ProcessingTask = {
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
      playSong(song, completedSongs);
    },
    [playSong, completedSongs],
  );

  const handleAddToPlaylist = useCallback(
    (song: Song) => {
      router.push(`/playlists?addSong=${song.id}`);
    },
    [router],
  );

  const handleDismissFailed = useCallback((taskId: string) => {
    setProcessingTasks((prev) => prev.filter((t) => t.taskId !== taskId));
  }, []);

  const hasActivity = processingTasks.length > 0 || completedSongs.length > 0;

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
        {/* Generator form */}
        <div className="w-full md:max-w-lg md:flex-shrink-0">
          <MusicGenerator onTaskStarted={handleTaskStarted} />
        </div>

        {/* Right column: processing + completed */}
        {hasActivity && (
          <div className="w-full md:flex-1 md:min-w-0">
            <ProcessingBanner
              tasks={processingTasks}
              onDismissFailed={handleDismissFailed}
            />
            <CompletedSection
              songs={completedSongs}
              onPlay={handlePlay}
              currentSongId={currentSong?.id}
              onAddToPlaylist={handleAddToPlaylist}
            />
          </div>
        )}

        {/* Empty state — no activity */}
        {!hasActivity && (
          <div className="hidden md:flex flex-col items-center justify-center flex-1 py-16 text-center">
            <Music2 size={40} className="text-[#535353] mb-3" />
            <p className="text-[#535353] text-sm">
              Oluşturduğun şarkılar burada görünür
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
