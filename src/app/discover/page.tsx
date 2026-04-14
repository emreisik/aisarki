"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Song } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import Link from "next/link";
import {
  Play,
  Pause,
  Music2,
  Clock3,
  Shuffle,
  Loader2,
  MoreHorizontal,
  ListPlus,
  Trash2,
} from "lucide-react";

interface ProcessingTask {
  taskId: string;
  prompt: string;
  startedAt: string;
}

function fmt(s?: number) {
  if (!s || isNaN(s)) return "--:--";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function totalDuration(songs: Song[]) {
  const secs = songs.reduce((a, s) => a + (s.duration ?? 0), 0);
  if (secs === 0) return "";
  const m = Math.floor(secs / 60);
  if (m < 60) return `yaklaşık ${m} dakika`;
  return `yaklaşık ${Math.floor(m / 60)} saat ${m % 60} dakika`;
}

export default function DiscoverPage() {
  const { playSong, currentSong, playing, togglePlay } = usePlayer();
  const { data: session } = useSession();
  const router = useRouter();

  const [songs, setSongs] = useState<Song[]>([]);
  const [processing, setProcessing] = useState<ProcessingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuSong, setMenuSong] = useState<string | null>(null);
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

  const startPolling = useCallback((taskId: string) => {
    if (pollingRef.current.has(taskId)) return;
    let attempts = 0;
    const poll = async () => {
      if (attempts++ >= 60) {
        pollingRef.current.delete(taskId);
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
            return [
              ...(data.songs as Song[]).filter((s) => !ids.has(s.id)),
              ...prev,
            ];
          });
        } else {
          pollingRef.current.set(taskId, setTimeout(poll, 5000));
        }
      } catch {
        pollingRef.current.set(taskId, setTimeout(poll, 8000));
      }
    };
    pollingRef.current.set(taskId, setTimeout(poll, 5000));
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  useEffect(() => {
    processing.forEach((t) => startPolling(t.taskId));
  }, [processing, startPolling]);

  useEffect(() => {
    const ref = pollingRef.current;
    return () => {
      ref.forEach((t) => clearTimeout(t));
      ref.clear();
    };
  }, []);

  const deleteSong = async (songId: string) => {
    await fetch(`/api/song/${songId}`, { method: "DELETE" });
    setSongs((prev) => prev.filter((s) => s.id !== songId));
    setMenuSong(null);
  };

  const isLibraryPlaying =
    currentSong && songs.some((s) => s.id === currentSong.id);

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    if (isLibraryPlaying) {
      togglePlay();
    } else {
      playSong(songs[0], songs);
    }
  };

  // Hero gradient — şu an çalınan şarkının rengine göre
  const heroGradient = "linear-gradient(180deg, #1a1a2e 0%, #121212 60%)";

  return (
    <div className="min-h-full pb-8">
      {/* ── Hero ── */}
      <div style={{ background: heroGradient }} className="pt-16 md:pt-20">
        <div className="px-6 pb-6 flex flex-col md:flex-row md:items-end gap-6">
          {/* Cover mosaic */}
          <div className="w-48 h-48 md:w-56 md:h-56 flex-shrink-0 rounded-md overflow-hidden shadow-2xl mx-auto md:mx-0">
            {songs.length >= 4 ? (
              <div className="w-full h-full grid grid-cols-2">
                {songs.slice(0, 4).map((s) =>
                  s.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={s.id}
                      src={s.imageUrl}
                      alt={s.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      key={s.id}
                      className="w-full h-full bg-[#282828] flex items-center justify-center"
                    >
                      <Music2 size={18} className="text-[#535353]" />
                    </div>
                  ),
                )}
              </div>
            ) : songs.length === 1 && songs[0].imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={songs[0].imageUrl}
                alt={songs[0].title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #450af5 0%, #c4efd9 100%)",
                }}
              >
                <Music2 size={64} className="text-white/80" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-2 text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#a7a7a7]">
              Çalma Listesi
            </p>
            <h1 className="text-white text-4xl md:text-6xl font-black leading-none">
              Tüm Şarkılar
            </h1>
            <p className="text-[#a7a7a7] text-sm mt-1">
              {loading
                ? "Yükleniyor..."
                : `${songs.length} şarkı${songs.length > 0 ? ` · ${totalDuration(songs)}` : ""}`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="px-6 py-6 bg-[#121212] flex items-center gap-6">
        {songs.length > 0 && (
          <button
            onClick={handlePlayAll}
            className="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center pressable hover:scale-105 transition-transform shadow-xl"
          >
            {isLibraryPlaying && playing ? (
              <Pause size={26} fill="black" className="text-black" />
            ) : (
              <Play size={26} fill="black" className="text-black ml-1" />
            )}
          </button>
        )}
        <button className="text-[#a7a7a7] hover:text-white transition-colors pressable">
          <Shuffle size={24} />
        </button>
      </div>

      {/* ── Processing banner ── */}
      {processing.length > 0 && (
        <div className="mx-6 mb-4 rounded-2xl overflow-hidden border border-[#1db954]/20 bg-[#0d1f14]">
          <div
            className="h-1 w-full"
            style={{
              background:
                "linear-gradient(90deg,#1db954 0%,#17a349 50%,#1db954 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2s linear infinite",
            }}
          />
          <div className="px-4 py-3 flex items-center gap-3">
            <Loader2
              size={16}
              className="text-[#1db954] animate-spin flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-white text-sm font-bold">
                {processing.length === 1
                  ? "Şarkı oluşturuluyor"
                  : `${processing.length} şarkı oluşturuluyor`}
              </p>
              <p className="text-[#1db954]/60 text-xs truncate">
                {processing.map((t) => t.prompt?.slice(0, 40)).join(" · ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Track list ── */}
      <div className="px-6 bg-[#121212]">
        {loading ? (
          <div className="flex flex-col gap-2 py-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-2">
                <div className="w-8 h-4 rounded shimmer flex-shrink-0" />
                <div className="w-10 h-10 rounded shimmer flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-3 w-1/3 rounded-full shimmer" />
                  <div className="h-2.5 w-1/4 rounded-full shimmer" />
                </div>
                <div className="w-10 h-3 rounded-full shimmer" />
              </div>
            ))}
          </div>
        ) : songs.length === 0 ? (
          <div className="py-20 text-center">
            <Music2 size={48} className="text-[#535353] mx-auto mb-4" />
            <p className="text-white font-bold text-xl mb-2">Henüz şarkı yok</p>
            <p className="text-[#535353] text-sm">
              Oluştur sayfasından ilk şarkını üret
            </p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="flex items-center gap-4 px-4 pb-2 border-b border-[#282828] mb-1 text-[#a7a7a7] text-xs uppercase tracking-widest">
              <span className="w-8 text-center">#</span>
              <span className="w-10 flex-shrink-0" />
              <span className="flex-1">Başlık</span>
              <span className="hidden md:block w-36 truncate">Oluşturan</span>
              <span className="hidden lg:block w-32 truncate">Stil</span>
              <Clock3 size={14} className="flex-shrink-0" />
              <span className="w-8" />
            </div>

            {songs.map((song, i) => {
              const isActive = currentSong?.id === song.id;
              return (
                <div
                  key={song.id}
                  className={`flex items-center gap-4 px-4 py-2 rounded-md transition-colors group ${
                    isActive ? "bg-[#ffffff12]" : "hover:bg-[#ffffff0d]"
                  }`}
                >
                  {/* Index / wave */}
                  <div className="w-8 text-center flex-shrink-0">
                    {isActive ? (
                      <span className="flex items-end justify-center gap-[2px] h-4">
                        {[0, 0.15, 0.3].map((d, k) => (
                          <span
                            key={k}
                            className="wave-bar rounded-sm"
                            style={{
                              width: "2px",
                              height: "100%",
                              animationDelay: `${d}s`,
                            }}
                          />
                        ))}
                      </span>
                    ) : (
                      <>
                        <span className="text-[#a7a7a7] text-sm group-hover:hidden">
                          {i + 1}
                        </span>
                        <button
                          onClick={() => playSong(song, songs)}
                          className="hidden group-hover:flex items-center justify-center w-full pressable"
                        >
                          <Play size={14} fill="white" className="text-white" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Cover */}
                  <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-[#282828]">
                    {song.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={song.imageUrl}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 size={14} className="text-[#535353]" />
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => playSong(song, songs)}
                      className="w-full text-left pressable"
                    >
                      <p
                        className={`text-sm font-medium truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
                      >
                        {song.title}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 min-w-0">
                      {song.creator ? (
                        <Link
                          href={`/profile/${song.creator.username}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#a7a7a7] text-xs truncate hover:text-white hover:underline transition-colors"
                        >
                          {song.creator.name}
                        </Link>
                      ) : (
                        <span className="text-[#a7a7a7] text-xs truncate md:hidden">
                          {song.style?.split(",")[0] || "AI Müzik"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Creator — sadece md+ */}
                  <div className="hidden md:block w-36 flex-shrink-0">
                    {song.creator ? (
                      <Link
                        href={`/profile/${song.creator.username}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#a7a7a7] text-sm truncate hover:text-white hover:underline transition-colors block"
                      >
                        {song.creator.name}
                      </Link>
                    ) : (
                      <span className="text-[#a7a7a7] text-sm truncate">—</span>
                    )}
                  </div>

                  {/* Style — sadece lg+ */}
                  <p className="hidden lg:block text-[#a7a7a7] text-sm truncate w-32 flex-shrink-0">
                    {song.style?.split(",")[0] || "AI Müzik"}
                  </p>

                  {/* Duration */}
                  <span className="text-[#a7a7a7] text-sm tabular-nums flex-shrink-0">
                    {fmt(song.duration)}
                  </span>

                  {/* Menu */}
                  <div className="relative w-8 flex-shrink-0">
                    <button
                      onClick={() =>
                        setMenuSong(menuSong === song.id ? null : song.id)
                      }
                      className="w-8 h-8 flex items-center justify-center text-[#a7a7a7] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity pressable"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {menuSong === song.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-[#282828] rounded-md shadow-2xl z-10 overflow-hidden">
                        <button
                          onClick={() => {
                            router.push(`/song/${song.id}`);
                            setMenuSong(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-[#3e3e3e] transition-colors text-left"
                        >
                          <Music2 size={15} />
                          Şarkı detayı
                        </button>
                        <button
                          onClick={() => {
                            router.push(`/playlists?addSong=${song.id}`);
                            setMenuSong(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-[#3e3e3e] transition-colors text-left"
                        >
                          <ListPlus size={15} />
                          Listeye ekle
                        </button>
                        {session?.user?.id &&
                          song.creator?.id === session.user.id && (
                            <button
                              onClick={() => deleteSong(song.id)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-[#3e3e3e] transition-colors text-left"
                            >
                              <Trash2 size={15} />
                              Sil
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
