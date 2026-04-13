"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Song } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import { Play, Pause, Music2, Loader2 } from "lucide-react";

const GENRES = [
  { label: "Türk Pop", color: "#E61E32", emoji: "🎵" },
  { label: "Hip-Hop", color: "#BA5D07", emoji: "🎤" },
  { label: "R&B", color: "#477D95", emoji: "🎸" },
  { label: "Electronic", color: "#7D4193", emoji: "🎛️" },
  { label: "Rock", color: "#537AA1", emoji: "🎸" },
  { label: "Jazz", color: "#1E3264", emoji: "🎺" },
  { label: "Classical", color: "#8D67AB", emoji: "🎻" },
  { label: "Lo-fi", color: "#148A08", emoji: "📻" },
  { label: "Acoustic", color: "#A56752", emoji: "🎵" },
  { label: "Synthwave", color: "#6A3A8B", emoji: "🌆" },
  { label: "Türk Halk", color: "#C87D3E", emoji: "🪘" },
  { label: "Arabesk", color: "#855D3C", emoji: "🌙" },
];

interface ProcessingTask {
  taskId: string;
  prompt: string;
  startedAt: string;
}

function ProcessingCard() {
  return (
    <div className="bg-[#181818] rounded-lg p-4 text-left">
      <div className="relative w-full aspect-square rounded-md overflow-hidden bg-[#282828] mb-4">
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 size={32} className="text-[#1db954] animate-spin" />
        </div>
      </div>
      <p className="text-sm font-semibold truncate mb-1 text-[#a7a7a7]">
        Oluşturuluyor...
      </p>
      <div className="h-2 w-2/3 rounded-full bg-[#282828] shimmer" />
    </div>
  );
}

function SongCard({
  song,
  onPlay,
  onDetail,
  isPlaying,
}: {
  song: Song;
  onPlay: () => void;
  onDetail: () => void;
  isPlaying: boolean;
}) {
  return (
    <button
      onClick={onDetail}
      className="bg-[#181818] hover:bg-[#282828] rounded-lg p-4 transition-colors text-left group pressable"
    >
      <div className="relative w-full aspect-square rounded-md overflow-hidden bg-[#282828] mb-4 shadow-lg">
        {song.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.imageUrl}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={40} className="text-[#535353]" />
          </div>
        )}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1db954] flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200"
        >
          {isPlaying ? (
            <Pause size={18} fill="black" className="text-black" />
          ) : (
            <Play size={18} fill="black" className="text-black ml-0.5" />
          )}
        </div>
        {isPlaying && (
          <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1db954] flex items-center justify-center shadow-xl group-hover:hidden">
            <span className="flex items-end gap-[2px] h-3">
              {[0, 0.15, 0.3].map((d, i) => (
                <span
                  key={i}
                  className="wave-bar rounded-sm bg-black"
                  style={{
                    width: "2px",
                    height: "100%",
                    animationDelay: `${d}s`,
                  }}
                />
              ))}
            </span>
          </div>
        )}
      </div>
      <p
        className={`text-sm font-semibold truncate mb-1 ${isPlaying ? "text-[#1db954]" : "text-white"}`}
      >
        {song.title}
      </p>
      <p className="text-[#a7a7a7] text-xs truncate">
        {song.style?.split(",")[0] || "AI Müzik"}
      </p>
    </button>
  );
}

export default function DiscoverPage() {
  const { playSong, currentSong } = usePlayer();
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [processing, setProcessing] = useState<ProcessingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const pollingRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/all-songs");
      const data: { songs: Song[]; processing: ProcessingTask[] } =
        await res.json();
      setSongs(data.songs ?? []);
      setProcessing(data.processing ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  // Processing task için polling başlat
  const startPolling = useCallback((taskId: string) => {
    if (pollingRef.current.has(taskId)) return;

    let attempts = 0;
    const poll = async () => {
      if (attempts++ >= 40) {
        pollingRef.current.delete(taskId);
        // Timeout — task'ı listeden kaldır
        setProcessing((prev) => prev.filter((t) => t.taskId !== taskId));
        return;
      }
      try {
        const res = await fetch(`/api/songs?taskId=${taskId}`);
        const data = await res.json();
        if (data.status === "complete" && data.songs?.length > 0) {
          pollingRef.current.delete(taskId);
          setProcessing((prev) => prev.filter((t) => t.taskId !== taskId));
          setSongs((prev) => {
            const ids = new Set(prev.map((s: Song) => s.id));
            const newSongs = (data.songs as Song[]).filter(
              (s) => !ids.has(s.id),
            );
            return [...newSongs, ...prev];
          });
        } else {
          const timer = setTimeout(poll, 5000);
          pollingRef.current.set(taskId, timer);
        }
      } catch {
        const timer = setTimeout(poll, 8000);
        pollingRef.current.set(taskId, timer);
      }
    };

    const timer = setTimeout(poll, 5000);
    pollingRef.current.set(taskId, timer);
  }, []);

  useEffect(() => {
    fetchAll();
    // 15 saniyede bir yeni şarkıları çek
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Yeni processing task geldiğinde polling başlat
  useEffect(() => {
    processing.forEach((t) => startPolling(t.taskId));
  }, [processing, startPolling]);

  // Cleanup
  useEffect(() => {
    const ref = pollingRef.current;
    return () => {
      ref.forEach((timer) => clearTimeout(timer));
      ref.clear();
    };
  }, []);

  const filtered = filter
    ? songs.filter((s) => s.style?.toLowerCase().includes(filter.toLowerCase()))
    : songs;

  const mobilePad = currentSong
    ? "pb-[calc(144px+env(safe-area-inset-bottom,0px))]"
    : "pb-[calc(72px+env(safe-area-inset-bottom,0px))]";

  return (
    <div className={`min-h-full bg-[#121212] ${mobilePad} md:pb-0`}>
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#2d2d2d] to-[#121212] pt-16 md:pt-20 px-6 pb-6">
        <h1 className="text-white text-3xl font-black mb-1">Keşfet</h1>
        <p className="text-[#a7a7a7] text-sm">
          {loading
            ? "Yükleniyor..."
            : `${songs.length} şarkı${processing.length > 0 ? ` · ${processing.length} oluşturuluyor` : ""}`}
        </p>
      </div>

      <div className="px-6">
        {/* Genre pills */}
        <section className="mb-8">
          <h2 className="text-white text-2xl font-black mb-4">Türe göre ara</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {GENRES.map((g) => (
              <button
                key={g.label}
                onClick={() => setFilter(filter === g.label ? null : g.label)}
                className={`relative h-20 rounded-lg overflow-hidden text-left px-4 py-3 pressable transition-transform hover:scale-[1.02] ${
                  filter === g.label ? "ring-2 ring-white" : ""
                }`}
                style={{ background: g.color }}
              >
                <span className="text-white text-sm font-black leading-tight block">
                  {g.label}
                </span>
                <span className="absolute -bottom-1 -right-2 text-4xl rotate-12 opacity-80">
                  {g.emoji}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Songs grid */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-2xl font-black">
              {filter ? `"${filter}" şarkıları` : "Tüm Şarkılar"}
            </h2>
            {filter && (
              <button
                onClick={() => setFilter(null)}
                className="text-[#a7a7a7] hover:text-white text-sm pressable"
              >
                Temizle ✕
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden bg-[#181818]"
                >
                  <div className="aspect-square shimmer" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 rounded-full shimmer w-3/4" />
                    <div className="h-2.5 rounded-full shimmer w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 && processing.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Music2 size={48} className="text-[#535353] mb-4" />
              <p className="text-white font-bold text-xl mb-2">
                {filter
                  ? `"${filter}" türünde şarkı bulunamadı`
                  : "Henüz şarkı yok"}
              </p>
              <p className="text-[#535353] text-sm">
                {filter
                  ? "Başka bir tür dene"
                  : "Oluştur sayfasından şarkı üret"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {/* Processing spinner kartlar — en üstte */}
              {!filter &&
                processing.map((t) => <ProcessingCard key={t.taskId} />)}
              {filtered.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  onPlay={() => playSong(song, filtered)}
                  onDetail={() => router.push(`/song/${song.id}`)}
                  isPlaying={currentSong?.id === song.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
