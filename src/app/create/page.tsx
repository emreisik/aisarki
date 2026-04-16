"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Song } from "@/types";
import MusicGenerator from "@/components/MusicGenerator";
import { ProcessingTask } from "@/components/ProcessingBanner";
import { usePlayer } from "@/contexts/PlayerContext";
import { Music2, ListPlus, Play, Pause, Clock3 } from "lucide-react";

// ── Completed song row ────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return "";
  }
}

function fmtTime(sec: number) {
  if (!sec || isNaN(sec) || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Üst kısımda küçük şarkı kartı — cover + play + title + style + tarih */
function SongResultCard({
  song,
  selected,
  playing,
  onSelect,
  onPlay,
}: {
  song: Song;
  selected: boolean;
  playing: boolean;
  onSelect: () => void;
  onPlay: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 rounded-2xl p-3 transition-all text-left pressable"
      style={{
        background: selected ? "rgba(124,58,237,0.08)" : "#141414",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: selected ? "#7c3aed" : "#2a2a2a",
      }}
    >
      {/* Cover + play */}
      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#7c3aed]/30 to-[#2a2a2a]">
        {song.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.imageUrl}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={18} className="text-white/50" />
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
        >
          <Play size={18} fill="white" className="text-white" />
        </button>
      </div>
      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-bold truncate">{song.title}</p>
        {song.style && (
          <p className="text-[#a78bfa] text-xs truncate mt-0.5">{song.style}</p>
        )}
        <p className="text-[#6a6a6a] text-[11px] mt-1 flex items-center gap-1">
          <Clock3 size={10} />
          {formatDate(song.createdAt)}
        </p>
      </div>
      {playing && (
        <span className="flex items-end gap-[2px] h-4 flex-shrink-0">
          {[0, 0.15, 0.3].map((d, i) => (
            <span
              key={i}
              className="wave-bar rounded-sm"
              style={{
                width: 2,
                height: "100%",
                background: "#7c3aed",
                animationDelay: `${d}s`,
              }}
            />
          ))}
        </span>
      )}
    </button>
  );
}

/** Seçili şarkı için detay panel — büyük player + lyrics */
function SelectedSongPanel({
  song,
  isCurrent,
  currentTime,
  duration,
  onTogglePlay,
  onAddToPlaylist,
}: {
  song: Song;
  isCurrent: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onAddToPlaylist: () => void;
}) {
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayDuration = duration || song.duration || 0;
  return (
    <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5 flex flex-col gap-4">
      {/* Title + actions */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-white text-lg font-black truncate flex-1">
          {song.title}
        </h3>
        <button
          type="button"
          onClick={onAddToPlaylist}
          className="w-9 h-9 rounded-lg bg-[#1e1e1e] border border-[#3a3a3a] flex items-center justify-center text-[#a7a7a7] hover:text-[#a78bfa] hover:border-[#a78bfa] transition-colors pressable"
          title="Listeye ekle"
        >
          <ListPlus size={15} />
        </button>
      </div>

      {/* Player: play button + progress + time */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center pressable shadow-lg"
        >
          {isCurrent ? (
            <Pause size={16} fill="white" className="text-white" />
          ) : (
            <Play size={16} fill="white" className="text-white ml-0.5" />
          )}
        </button>
        <div className="flex-1 relative h-2 rounded-full bg-[#2a2a2a] overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[#a7a7a7] text-xs tabular-nums flex-shrink-0">
          {fmtTime(currentTime)} / {fmtTime(displayDuration)}
        </span>
      </div>

      {/* Lyrics */}
      {song.prompt && (
        <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-[#2a2a2a]">
          <p className="text-[#7a7a7a] text-[11px] uppercase tracking-widest font-bold">
            Sözler
          </p>
          <pre className="text-[#d4d4d4] text-sm leading-relaxed whitespace-pre-wrap font-sans max-h-96 overflow-y-auto scroll-area">
            {song.prompt}
          </pre>
        </div>
      )}
    </div>
  );
}

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
  const { playing, currentTime, duration, togglePlay } = usePlayer();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // İlk gelen şarkıyı otomatik seç
  useEffect(() => {
    if (!selectedId && songs.length > 0) setSelectedId(songs[0].id);
  }, [songs, selectedId]);

  if (songs.length === 0) return null;

  const selected = songs.find((s) => s.id === selectedId) ?? songs[0];
  const isCurrent = currentSongId === selected.id;

  return (
    <div className="flex flex-col gap-3">
      {/* Üstte şarkı kartları (Suno 2 versiyon üretir) */}
      <div className="flex flex-col gap-2">
        {songs.map((song) => (
          <SongResultCard
            key={song.id}
            song={song}
            selected={selectedId === song.id}
            playing={currentSongId === song.id && playing}
            onSelect={() => setSelectedId(song.id)}
            onPlay={() => onPlay(song)}
          />
        ))}
      </div>

      {/* Seçili şarkı detay paneli */}
      <SelectedSongPanel
        song={selected}
        isCurrent={isCurrent && playing}
        currentTime={isCurrent ? currentTime : 0}
        duration={isCurrent ? duration : (selected.duration ?? 0)}
        onTogglePlay={() => {
          if (isCurrent) togglePlay();
          else onPlay(selected);
        }}
        onAddToPlaylist={() => onAddToPlaylist(selected)}
      />
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

        // Geçici cover image varsa banner'a yansıt (blur olarak gösterilsin)
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

        // SADECE audioUrl (Bunny CDN) gelen şarkıları tamamlandı say
        // Stream URL ile tamamlanma yetersiz — duration ve seek çalışmıyor
        const playableSongs = (data.songs ?? []).filter((s) => s.audioUrl);

        if (
          data.status === "complete" &&
          playableSongs.length > 0 &&
          // Suno 2 versiyon üretir; ikisi de Bunny'de mi diye bekle (yoksa tek tek ekle)
          playableSongs.length >= (data.songs?.length ?? 1)
        ) {
          pollingRef.current.delete(taskId);
          setProcessingTasks((prev) => prev.filter((t) => t.taskId !== taskId));

          setCompletedSongs((prev) => {
            const ids = new Set(prev.map((s) => s.id));
            const fresh = playableSongs.filter((s) => !ids.has(s.id));
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
          imageUrl?: string;
          title?: string;
        }> = d.processing ?? [];
        if (tasks.length > 0) {
          setProcessingTasks(
            tasks.map((t) => ({
              taskId: t.taskId,
              title: t.title || t.prompt?.slice(0, 50) || "Şarkı",
              startedAt: t.startedAt,
              imageUrl: t.imageUrl,
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
      _streamUrl?: string,
      _songId?: string,
    ) => {
      // Stream URL parametreleri artık göz ardı ediliyor — sadece audio_key (Bunny CDN)
      // gelene kadar polling devam eder. Tamamlandığında completedSongs'a ekleyelir.

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

        {/* Right column: completed only (processing yukarıya taşındı) */}
        {completedSongs.length > 0 && (
          <div className="w-full md:flex-1 md:min-w-0">
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
