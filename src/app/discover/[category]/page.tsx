"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Song } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import Link from "next/link";
import { ArrowLeft, Play, Pause, Music2 } from "lucide-react";

/* ── Kategori tanımları (discover/page.tsx ile aynı) ── */
interface Category {
  id: string;
  label: string;
  color: string;
  keywords: string[];
}

const CATEGORIES: Category[] = [
  { id: "pop", label: "Pop", color: "#e91429", keywords: ["pop"] },
  {
    id: "turk",
    label: "Türk Müziği",
    color: "#148a08",
    keywords: ["türk", "türkçe", "anatolian", "arabesk"],
  },
  {
    id: "rock",
    label: "Rock",
    color: "#e8115b",
    keywords: ["rock", "metal", "alternative"],
  },
  {
    id: "hiphop",
    label: "Hip-Hop / Rap",
    color: "#1e3264",
    keywords: ["hip", "rap", "trap"],
  },
  {
    id: "romantik",
    label: "Romantik",
    color: "#c62a2a",
    keywords: ["romantic", "romantik", "love", "aşk"],
  },
  {
    id: "dans",
    label: "Dans",
    color: "#8d67ab",
    keywords: ["dance", "dans", "edm", "electronic"],
  },
  {
    id: "cocuk",
    label: "Çocuk Şarkıları",
    color: "#e8a400",
    keywords: ["child", "çocuk", "kid", "nursery"],
  },
  {
    id: "akustik",
    label: "Akustik",
    color: "#477d5e",
    keywords: ["acoustic", "akustik", "folk"],
  },
  {
    id: "nostalji",
    label: "Nostaljik",
    color: "#5179a1",
    keywords: ["nostalji", "klasik", "retro", "vintage"],
  },
  {
    id: "motivasyon",
    label: "Motivasyon",
    color: "#f05e22",
    keywords: ["motivation", "motivasyon", "uplifting", "energetic"],
  },
  {
    id: "sakin",
    label: "Dinlendirici",
    color: "#27856a",
    keywords: ["calm", "chill", "sakin", "relaxing", "ambient"],
  },
  {
    id: "duygusal",
    label: "Duygusal",
    color: "#9b1d8a",
    keywords: ["sad", "duygusal", "emotional", "üzgün", "melanko"],
  },
];

function fmt(s?: number) {
  if (!s || isNaN(s)) return "--:--";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/* Albüm kapağından dominant renk */
function useHeroColor(songs: Song[]) {
  const [rgb, setRgb] = useState("30,30,40");
  useEffect(() => {
    const url = songs.find((s) => s.imageUrl)?.imageUrl;
    if (!url) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 60;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const d = ctx.getImageData(0, 0, size, size).data;
        let r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (let i = 0; i < d.length; i += 8) {
          const br = (d[i] + d[i + 1] + d[i + 2]) / 3;
          if (br > 20 && br < 235) {
            r += d[i];
            g += d[i + 1];
            b += d[i + 2];
            n++;
          }
        }
        if (n > 0 && !cancelled) {
          const dk = 0.5;
          setRgb(
            `${Math.floor((r / n) * dk)},${Math.floor((g / n) * dk)},${Math.floor((b / n) * dk)}`,
          );
        }
      } catch {
        /* CORS */
      }
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [songs]);
  return rgb;
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

  /* Kategori filtresi */
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

  const featured = songs.slice(0, 6);
  const heroRgb = useHeroColor(songs);
  const catColor = cat?.color ?? "#1db954";

  if (!cat && !loading) {
    return (
      <div className="min-h-full bg-[#121212] flex items-center justify-center">
        <p className="text-white">Kategori bulunamadı</p>
      </div>
    );
  }

  const isPlaying =
    currentSong && songs.some((s) => s.id === currentSong.id) && playing;

  return (
    <div className="min-h-full bg-[#121212]">
      {/* ── Hero ── */}
      <div
        className="relative pt-14 md:pt-0 pb-6 overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${catColor}cc 0%, rgb(${heroRgb}) 60%, #121212 100%)`,
          minHeight: 220,
        }}
      >
        {/* Geri butonu */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/30 pressable z-10"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>

        <div className="px-5 pt-8 pb-2">
          <h1 className="text-white text-4xl font-black">{cat?.label}</h1>
        </div>
      </div>

      {/* ── Play all butonu ── */}
      {songs.length > 0 && (
        <div className="px-5 py-4 flex items-center gap-4">
          <button
            onClick={() => {
              if (isPlaying) togglePlay();
              else playSong(songs[0], songs);
            }}
            className="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center pressable hover:scale-105 transition-transform shadow-xl"
          >
            {isPlaying ? (
              <Pause size={26} fill="black" className="text-black" />
            ) : (
              <Play size={26} fill="black" className="text-black ml-1" />
            )}
          </button>
          <p className="text-[#a7a7a7] text-sm">{songs.length} şarkı</p>
        </div>
      )}

      {/* ── Öne çıkan şarkılar ── */}
      {featured.length > 0 && (
        <section className="mb-8">
          <h2 className="text-white font-bold text-xl px-5 mb-3">
            Öne çıkan şarkılar
          </h2>
          <div className="flex gap-4 overflow-x-auto scroll-area px-5 pb-2">
            {featured.map((song) => {
              const isActive = currentSong?.id === song.id;
              return (
                <button
                  key={song.id}
                  onClick={() =>
                    isActive ? togglePlay() : playSong(song, songs)
                  }
                  className="flex-shrink-0 w-40 pressable group text-left"
                >
                  <div className="w-40 h-40 rounded-lg overflow-hidden bg-[#282828] mb-3 relative">
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
                    <div className="absolute inset-0 flex items-end justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-[#1db954] flex items-center justify-center shadow-xl translate-y-2 group-hover:translate-y-0 transition-transform">
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
                    className={`text-sm font-semibold truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
                  >
                    {song.title}
                  </p>
                  {song.creator && (
                    <p className="text-[#a7a7a7] text-xs truncate mt-0.5">
                      {song.creator.name}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Sanatçılar ── */}
      {artists.length > 0 && (
        <section className="mb-8">
          <h2 className="text-white font-bold text-xl px-5 mb-3">Sanatçılar</h2>
          <div className="flex gap-4 overflow-x-auto scroll-area px-5 pb-2">
            {artists.map((artist) => (
              <Link
                key={artist.username}
                href={`/profile/${artist.username}`}
                className="flex-shrink-0 w-32 pressable text-center group"
              >
                <div className="w-32 h-32 rounded-full overflow-hidden bg-[#282828] mx-auto mb-3 flex items-center justify-center">
                  {artist.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-3xl font-black">
                      {artist.name[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-white text-sm font-semibold truncate">
                  {artist.name}
                </p>
                <p className="text-[#a7a7a7] text-xs mt-0.5">
                  {artist.count} şarkı
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Tüm şarkılar ── */}
      {songs.length > 0 && (
        <section className="px-5 pb-10">
          <h2 className="text-white font-bold text-xl mb-3">Tüm şarkılar</h2>

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded shimmer flex-shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-3 rounded-full shimmer" />
                    <div className="h-2.5 w-2/3 rounded-full shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {songs.map((song) => {
                const isActive = currentSong?.id === song.id;
                return (
                  <button
                    key={song.id}
                    onClick={() =>
                      isActive ? togglePlay() : playSong(song, songs)
                    }
                    className="flex items-center gap-3 pressable group text-left min-w-0"
                  >
                    <div className="w-12 h-12 rounded-md flex-shrink-0 overflow-hidden bg-[#282828] relative">
                      {song.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={song.imageUrl}
                          alt={song.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music2 size={16} className="text-[#535353]" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {isActive && playing ? (
                          <Pause
                            size={14}
                            fill="white"
                            className="text-white"
                          />
                        ) : (
                          <Play
                            size={14}
                            fill="white"
                            className="text-white ml-0.5"
                          />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
                      >
                        {song.title}
                      </p>
                      <p className="text-[#a7a7a7] text-xs truncate mt-0.5">
                        {song.creator?.name || fmt(song.duration)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Boş durum */}
      {!loading && songs.length === 0 && (
        <div className="py-20 text-center px-5">
          <Music2 size={48} className="text-[#535353] mx-auto mb-4" />
          <p className="text-white font-bold text-xl mb-2">Henüz şarkı yok</p>
          <p className="text-[#535353] text-sm">
            Bu kategoride henüz şarkı oluşturulmamış
          </p>
        </div>
      )}
    </div>
  );
}
