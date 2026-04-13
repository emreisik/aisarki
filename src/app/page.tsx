"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Song, Playlist } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import { useSession } from "next-auth/react";
import { Play, Pause, Music2, Clock3, ListMusic } from "lucide-react";
import Link from "next/link";

const QUICK_PROMPTS = [
  "Yaz akşamı sahilde neşeli pop",
  "Hüzünlü bir ayrılık şarkısı",
  "Enerjik sabah motivasyon",
  "Lo-fi çalışma müziği",
  "Epik orkestra film müziği",
  "Retro 80s synthwave",
];

function fmt(s?: number) {
  if (!s || isNaN(s)) return "--:--";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi öğleden sonralar";
  return "İyi akşamlar";
}

/* ── Section rail ── */
function Rail({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4 px-6">
        <h2 className="text-white text-2xl font-black">{title}</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto scroll-area px-6 pb-2">
        {children}
      </div>
    </section>
  );
}

/* ── Song card (vertical) ── */
function SongTile({
  song,
  onPlay,
  isPlaying,
}: {
  song: Song;
  onPlay: () => void;
  isPlaying: boolean;
}) {
  return (
    <button
      onClick={onPlay}
      className="flex-shrink-0 w-[180px] bg-[#181818] hover:bg-[#282828] rounded-lg p-4 transition-colors text-left group pressable"
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
        <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1db954] flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200">
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

/* ── Playlist card ── */
function PlaylistTile({ playlist }: { playlist: Playlist }) {
  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className="flex-shrink-0 w-[180px] bg-[#181818] hover:bg-[#282828] rounded-lg p-4 transition-colors group pressable"
    >
      <div className="relative w-full aspect-square rounded-md overflow-hidden bg-[#282828] mb-4 shadow-lg">
        {playlist.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.coverUrl}
            alt={playlist.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#450af5] to-[#c4efd9]">
            <ListMusic size={40} className="text-white" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1db954] flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200">
          <Play size={18} fill="black" className="text-black ml-0.5" />
        </div>
      </div>
      <p className="text-white text-sm font-semibold truncate mb-1">
        {playlist.title}
      </p>
      <p className="text-[#a7a7a7] text-xs">{playlist.songCount ?? 0} şarkı</p>
    </Link>
  );
}

/* ── Quick resume tile (6 items grid) ── */
function ResumeTile({
  song,
  onPlay,
  isPlaying,
}: {
  song: Song;
  onPlay: () => void;
  isPlaying: boolean;
}) {
  return (
    <button
      onClick={onPlay}
      className={`flex items-center gap-3 rounded-md overflow-hidden transition-colors text-left group pressable ${
        isPlaying ? "bg-[#3e3e3e]" : "bg-[#ffffff14] hover:bg-[#ffffff1f]"
      }`}
    >
      <div className="w-12 h-12 flex-shrink-0 relative">
        {song.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.imageUrl}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#282828] flex items-center justify-center">
            <Music2 size={16} className="text-[#535353]" />
          </div>
        )}
      </div>
      <span
        className={`text-sm font-semibold pr-4 truncate ${isPlaying ? "text-[#1db954]" : "text-white"}`}
      >
        {song.title}
      </span>
    </button>
  );
}

/* ── Track row (for generated songs section) ── */
function TrackRow({
  song,
  index,
  onPlay,
  isPlaying,
}: {
  song: Song;
  index: number;
  onPlay: () => void;
  isPlaying: boolean;
}) {
  return (
    <button
      onClick={onPlay}
      className="w-full flex items-center gap-4 px-4 py-2 rounded-md hover:bg-[#ffffff1a] transition-colors group text-left pressable"
    >
      <div className="w-8 text-center flex-shrink-0">
        {isPlaying ? (
          <span className="flex items-end justify-center gap-[2px] h-4">
            {[0, 0.15, 0.3].map((d, i) => (
              <span
                key={i}
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
              {index + 1}
            </span>
            <Play
              size={14}
              fill="white"
              className="text-white hidden group-hover:block mx-auto"
            />
          </>
        )}
      </div>

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

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${isPlaying ? "text-[#1db954]" : "text-white"}`}
        >
          {song.title}
        </p>
        <p className="text-[#a7a7a7] text-xs truncate">
          {song.style?.split(",")[0] || "AI Müzik"}
        </p>
      </div>

      {song.status === "processing" && (
        <span className="w-4 h-4 border-2 border-[#a7a7a7] border-t-transparent rounded-full animate-spin flex-shrink-0" />
      )}

      <span className="text-[#a7a7a7] text-xs tabular-nums flex-shrink-0 ml-auto">
        {song.status === "complete" ? fmt(song.duration) : "—"}
      </span>
    </button>
  );
}

export default function HomePage() {
  const { playSong, currentSong } = usePlayer();
  const { data: session } = useSession();

  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [generatedSongs, setGeneratedSongs] = useState<Song[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/all-songs")
      .then((r) => r.json())
      .then((d) => setAllSongs(d.songs || []));
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/playlists")
      .then((r) => r.json())
      .then((d) => setPlaylists(d.playlists || []));
  }, [session]);

  const handleSongsAdded = useCallback((newSongs: Song[]) => {
    if (newSongs.length === 0) {
      setGeneratedSongs((prev) =>
        prev.filter((s) => !s.id.startsWith("temp-")),
      );
      return;
    }
    setGeneratedSongs((prev) => {
      const updated = [...prev];
      newSongs.forEach((ns) => {
        const idx = updated.findIndex((s) => s.id === ns.id);
        if (idx >= 0) updated[idx] = ns;
        else updated.unshift(ns);
      });
      return updated;
    });
  }, []);

  const pollForSongs = useCallback(
    (taskId: string, tempIds: string[]) => {
      let attempts = 0;
      const poll = async () => {
        if (attempts++ >= 40) return;
        try {
          const res = await fetch(`/api/songs?taskId=${taskId}`);
          const data = await res.json();
          if (data.status === "complete" && data.songs?.length > 0) {
            handleSongsAdded(
              data.songs.map((s: Song, i: number) => ({
                ...s,
                id: tempIds[i] || s.id,
              })),
            );
            setAllSongs((prev) => {
              const ids = new Set(prev.map((s) => s.id));
              const fresh = data.songs.filter((s: Song) => !ids.has(s.id));
              return [...fresh, ...prev];
            });
          } else {
            setTimeout(poll, 5000);
          }
        } catch {
          setTimeout(poll, 8000);
        }
      };
      setTimeout(poll, 10000);
    },
    [handleSongsAdded],
  );

  const handleGenerate = async (p: string) => {
    if (!p.trim() || loading) return;
    setError("");
    setLoading(true);

    const tempSongs: Song[] = [1, 2].map((i) => ({
      id: `temp-${Date.now()}-${i}`,
      title: p.slice(0, 40),
      status: "processing" as const,
      createdAt: new Date().toISOString(),
    }));
    handleSongsAdded(tempSongs);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: p.trim(),
          customMode: false,
          instrumental: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.data?.taskId) {
        setError(data.error || data.msg || "Hata oluştu");
        handleSongsAdded([]);
        return;
      }
      pollForSongs(
        data.data.taskId,
        tempSongs.map((s) => s.id),
      );
    } catch {
      setError("Bağlantı hatası");
      handleSongsAdded([]);
    } finally {
      setLoading(false);
      setPrompt("");
    }
  };

  // Hero gradient color — current song cover'ından (basit dark gradient)
  const heroBg = "linear-gradient(180deg, #1a3a2a 0%, #121212 40%)";

  const recentSongs = allSongs.slice(0, 6);
  const moreSongs = allSongs.slice(6, 18);

  // Mobile padding
  const mobilePad = currentSong
    ? "pb-[calc(144px+env(safe-area-inset-bottom,0px))]"
    : "pb-[calc(72px+env(safe-area-inset-bottom,0px))]";

  return (
    <div className={`min-h-full ${mobilePad} md:pb-0`} ref={topRef}>
      {/* ── Hero: Şarkı Oluştur ── */}
      <div
        className="pt-16 md:pt-20 pb-8 px-6"
        style={{
          background: "linear-gradient(180deg, #0d2b1a 0%, #121212 100%)",
        }}
      >
        <p className="text-[#1db954] text-xs font-bold uppercase tracking-widest mb-2">
          Yapay Zeka ile Müzik
        </p>
        <h1 className="text-white text-3xl md:text-4xl font-black leading-tight mb-6">
          Kendi şarkını
          <br />
          <span className="text-[#1db954]">saniyeler içinde</span> yap
        </h1>

        {/* Prompt alanı */}
        <div className="max-w-2xl">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate(prompt);
                }
              }}
              placeholder="Nasıl bir şarkı istiyorsun? Örn: Hüzünlü bir yaz akşamı, sahilde pop..."
              rows={3}
              maxLength={500}
              className="w-full bg-[#1a1a1a] border-2 border-[#2a2a2a] focus:border-[#1db954] rounded-2xl px-5 py-4 text-white text-base placeholder-[#535353] resize-none focus:outline-none transition-colors"
            />
            <span className="absolute bottom-3 right-4 text-[#535353] text-xs tabular-nums">
              {prompt.length}/500
            </span>
          </div>

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          <button
            onClick={() => handleGenerate(prompt)}
            disabled={loading || !prompt.trim()}
            className="mt-3 w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all pressable disabled:opacity-40"
            style={{
              background: loading ? "#1a1a1a" : "#1db954",
              color: loading ? "#a7a7a7" : "black",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-[#a7a7a7]/40 border-t-[#a7a7a7] rounded-full animate-spin" />
                Oluşturuluyor... (~30–60 sn)
              </span>
            ) : (
              "Şarkı Oluştur"
            )}
          </button>

          {/* Quick prompts */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => handleGenerate(p)}
                disabled={loading}
                className="px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#a7a7a7] text-xs font-medium pressable hover:border-[#1db954] hover:text-white transition-colors disabled:opacity-40"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#121212] pb-8">
        {/* ── Generated songs ── */}
        {generatedSongs.length > 0 && (
          <section className="mb-8 px-6">
            <h2 className="text-white text-2xl font-black mb-4">
              Oluşturulanlar
            </h2>
            <div className="flex flex-col">
              {/* Column header */}
              <div className="flex items-center gap-4 px-4 pb-2 border-b border-[#282828] mb-1">
                <span className="w-8 text-center text-[#a7a7a7] text-xs">
                  #
                </span>
                <span className="w-10 flex-shrink-0" />
                <span className="flex-1 text-[#a7a7a7] text-xs uppercase tracking-widest">
                  Başlık
                </span>
                <Clock3 size={14} className="text-[#a7a7a7] ml-auto" />
              </div>
              {generatedSongs.map((song, i) => (
                <TrackRow
                  key={song.id}
                  song={song}
                  index={i}
                  onPlay={() => playSong(song, generatedSongs)}
                  isPlaying={currentSong?.id === song.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Playlists (giriş yapmışsa) ── */}
        {playlists.length > 0 && (
          <Rail title="Çalma listelerin">
            {playlists.map((pl) => (
              <PlaylistTile key={pl.id} playlist={pl} />
            ))}
          </Rail>
        )}

        {/* ── Tüm şarkılar ── */}
        {moreSongs.length > 0 && (
          <Rail title="Tüm Şarkılar">
            {moreSongs.map((song) => (
              <SongTile
                key={song.id}
                song={song}
                onPlay={() => playSong(song, allSongs)}
                isPlaying={currentSong?.id === song.id}
              />
            ))}
          </Rail>
        )}

        {/* ── Keşfet yönlendirme ── */}
        {allSongs.length === 0 && generatedSongs.length === 0 && (
          <div className="px-6">
            <div className="rounded-2xl bg-gradient-to-br from-[#1a3a2a] to-[#0a1a10] p-8 text-center">
              <Music2 size={40} className="text-[#1db954] mx-auto mb-4" />
              <p className="text-white text-xl font-bold mb-2">
                İlk şarkını oluştur
              </p>
              <p className="text-[#a7a7a7] text-sm">
                Yukarıya bir fikir yaz, AI senin için şarkı üretsin
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
