"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Song } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import Link from "next/link";
import { ArrowLeft, Play, Pause, Music2, Shuffle } from "lucide-react";

/* ── Kategori tanımları ── */
interface Category {
  id: string;
  label: string;
  gradient: [string, string];
  keywords: string[];
}

const CATEGORIES: Category[] = [
  {
    id: "pop",
    label: "Pop",
    gradient: ["#e91429", "#ff6a3d"],
    keywords: ["pop"],
  },
  {
    id: "turk",
    label: "Türk Müziği",
    gradient: ["#148a08", "#45c928"],
    keywords: ["türk", "türkçe", "anatolian", "arabesk"],
  },
  {
    id: "rock",
    label: "Rock",
    gradient: ["#4a2c70", "#e8115b"],
    keywords: ["rock", "metal", "alternative"],
  },
  {
    id: "hiphop",
    label: "Hip-Hop",
    gradient: ["#1e3264", "#5b8def"],
    keywords: ["hip", "rap", "trap"],
  },
  {
    id: "romantik",
    label: "Romantik",
    gradient: ["#c62a2a", "#ff7eb3"],
    keywords: ["romantic", "romantik", "love", "aşk"],
  },
  {
    id: "dans",
    label: "Dance",
    gradient: ["#5c2d82", "#c471ed"],
    keywords: ["dance", "dans", "edm", "electronic"],
  },
  {
    id: "cocuk",
    label: "Çocuk",
    gradient: ["#e8a400", "#ffe066"],
    keywords: ["child", "çocuk", "kid", "nursery"],
  },
  {
    id: "akustik",
    label: "Akustik",
    gradient: ["#2d6a4f", "#74c69d"],
    keywords: ["acoustic", "akustik", "folk"],
  },
  {
    id: "nostalji",
    label: "Nostaljik",
    gradient: ["#3a506b", "#8bbae8"],
    keywords: ["nostalji", "klasik", "retro", "vintage"],
  },
  {
    id: "motivasyon",
    label: "Motivasyon",
    gradient: ["#f05e22", "#ffa751"],
    keywords: ["motivation", "motivasyon", "uplifting", "energetic"],
  },
  {
    id: "sakin",
    label: "Chill",
    gradient: ["#27856a", "#6ee7b7"],
    keywords: ["calm", "chill", "sakin", "relaxing", "ambient"],
  },
  {
    id: "duygusal",
    label: "Duygusal",
    gradient: ["#9b1d8a", "#e879f9"],
    keywords: ["sad", "duygusal", "emotional", "üzgün", "melanko"],
  },
];

function fmt(s?: number) {
  if (!s || isNaN(s)) return "--:--";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.category as string;
  const { playSong, currentSong, playing, togglePlay } = usePlayer();

  const cat = CATEGORIES.find((c) => c.id === categoryId);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSongs = useCallback(async () => {
    try {
      const res = await fetch("/api/discover-songs");
      if (!res.ok) return;
      const data: { songs: Song[] } = await res.json();
      setAllSongs(data.songs ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const songs = cat
    ? allSongs.filter((s) => {
        const haystack = `${s.title} ${s.style ?? ""}`.toLowerCase();
        return cat.keywords.some((kw) => haystack.includes(kw));
      })
    : allSongs;

  /* Sanatçıları grupla */
  const artists = (() => {
    const map = new Map<
      string,
      { name: string; username: string; image?: string; count: number }
    >();
    songs.forEach((s) => {
      if (!s.creator) return;
      const key = s.creator.id;
      if (!map.has(key))
        map.set(key, {
          name: s.creator.name,
          username: s.creator.username,
          image: s.creator.image,
          count: 0,
        });
      map.get(key)!.count++;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  })();

  const featured = songs.slice(0, 8);
  const color0 = cat?.gradient[0] ?? "#1db954";
  const color1 = cat?.gradient[1] ?? "#1db954";

  if (!cat && !loading) {
    return (
      <div className="min-h-full bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-white">Kategori bulunamadı</p>
      </div>
    );
  }

  const isCollectionPlaying =
    currentSong && songs.some((s) => s.id === currentSong.id) && playing;

  const shufflePlay = () => {
    if (songs.length === 0) return;
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled);
  };

  return (
    <div className="min-h-full bg-[#0a0a0a]">
      {/* ── Hero — Suno tarzı gradient ── */}
      <div
        className="relative pb-8 overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${color0} 0%, ${color1}66 40%, #0a0a0a 100%)`,
          minHeight: 260,
        }}
      >
        {/* Bulanık blob'lar */}
        <div
          className="absolute w-[60%] h-[60%] rounded-full blur-3xl opacity-30"
          style={{ background: color1, top: "-10%", right: "-10%" }}
        />
        <div
          className="absolute w-[40%] h-[40%] rounded-full blur-3xl opacity-20"
          style={{ background: color0, bottom: "10%", left: "5%" }}
        />

        {/* Geri butonu */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm pressable z-10"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>

        <div className="px-5 pt-14 pb-2 relative z-10">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">
            Koleksiyon
          </p>
          <h1 className="text-white text-4xl md:text-5xl font-black leading-tight">
            {cat?.label}
          </h1>
          <p className="text-white/50 text-sm mt-2">{songs.length} şarkı</p>
        </div>
      </div>

      {/* ── Play + Shuffle butonları ── */}
      {songs.length > 0 && (
        <div className="px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => {
              if (isCollectionPlaying) togglePlay();
              else playSong(songs[0], songs);
            }}
            className="w-12 h-12 rounded-full flex items-center justify-center pressable active:scale-95 transition-transform shadow-xl"
            style={{ background: color0 }}
          >
            {isCollectionPlaying ? (
              <Pause size={22} fill="black" className="text-black" />
            ) : (
              <Play size={22} fill="black" className="text-black ml-0.5" />
            )}
          </button>
          <button
            onClick={shufflePlay}
            className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#222] flex items-center justify-center pressable active:scale-95 transition-transform"
          >
            <Shuffle size={18} className="text-white" />
          </button>
        </div>
      )}

      {/* ── Öne çıkan — yatay scroll ── */}
      {featured.length > 0 && (
        <section className="mb-8">
          <h2 className="text-white font-bold text-lg px-5 mb-3">
            Öne çıkanlar
          </h2>
          <div className="flex gap-3 overflow-x-auto scroll-area px-5 pb-1">
            {featured.map((song) => {
              const isActive = currentSong?.id === song.id;
              return (
                <button
                  key={song.id}
                  onClick={() =>
                    isActive ? togglePlay() : playSong(song, songs)
                  }
                  className="flex-shrink-0 w-[130px] md:w-[154px] pressable group text-left"
                >
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-[#1a1a1a] relative mb-2">
                    {song.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={song.imageUrl}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 size={32} className="text-[#333]" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-end p-2.5">
                      <div className="w-10 h-10 rounded-full bg-[#1db954] flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                        {isActive && playing ? (
                          <Pause
                            size={18}
                            fill="black"
                            className="text-black"
                          />
                        ) : (
                          <Play
                            size={18}
                            fill="black"
                            className="text-black ml-0.5"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <p
                    className={`text-[13px] font-semibold truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
                  >
                    {song.title}
                  </p>
                  <p className="text-[#666] text-[11px] truncate mt-0.5">
                    {song.creator?.name || "Hubeya"}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Sanatçılar ── */}
      {artists.length > 0 && (
        <section className="mb-8">
          <h2 className="text-white font-bold text-lg px-5 mb-3">Sanatçılar</h2>
          <div className="flex gap-4 overflow-x-auto scroll-area px-5 pb-1">
            {artists.map((artist) => (
              <Link
                key={artist.username}
                href={`/profile/${artist.username}`}
                className="flex-shrink-0 w-[100px] pressable text-center"
              >
                <div className="w-[100px] h-[100px] rounded-full overflow-hidden bg-[#1a1a1a] mx-auto mb-2 flex items-center justify-center">
                  {artist.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-2xl font-black">
                      {artist.name[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-white text-xs font-semibold truncate">
                  {artist.name}
                </p>
                <p className="text-[#666] text-[11px] mt-0.5">
                  {artist.count} şarkı
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Tüm şarkılar — liste ── */}
      {songs.length > 0 && (
        <section className="px-5 pb-10">
          <h2 className="text-white font-bold text-lg mb-3">Tüm şarkılar</h2>
          <div className="flex flex-col gap-0.5">
            {songs.map((song, i) => {
              const isActive = currentSong?.id === song.id;
              return (
                <button
                  key={song.id}
                  onClick={() =>
                    isActive ? togglePlay() : playSong(song, songs)
                  }
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group text-left pressable ${
                    isActive ? "bg-[#ffffff10]" : "hover:bg-[#ffffff06]"
                  }`}
                >
                  <span className="w-6 text-center text-[#555] text-xs font-semibold flex-shrink-0 group-hover:hidden">
                    {i + 1}
                  </span>
                  <span className="w-6 text-center flex-shrink-0 hidden group-hover:flex items-center justify-center">
                    {isActive && playing ? (
                      <Pause size={12} fill="white" className="text-white" />
                    ) : (
                      <Play
                        size={12}
                        fill="white"
                        className="text-white ml-0.5"
                      />
                    )}
                  </span>

                  <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-[#1a1a1a]">
                    {song.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={song.imageUrl}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 size={14} className="text-[#333]" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
                    >
                      {song.title}
                    </p>
                    <p className="text-[#666] text-xs truncate mt-0.5">
                      {song.creator?.name || "Hubeya"}
                    </p>
                  </div>

                  <span className="text-[#555] text-xs tabular-nums flex-shrink-0">
                    {fmt(song.duration)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Boş durum */}
      {!loading && songs.length === 0 && (
        <div className="py-20 text-center px-5">
          <Music2 size={48} className="text-[#333] mx-auto mb-4" />
          <p className="text-white font-bold text-xl mb-2">Henüz şarkı yok</p>
          <p className="text-[#555] text-sm">
            Bu kategoride henüz şarkı oluşturulmamış
          </p>
        </div>
      )}
    </div>
  );
}
