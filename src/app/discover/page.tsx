"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Song } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import Link from "next/link";
import {
  Search,
  X,
  Play,
  Pause,
  Music2,
  Loader2,
  MoreHorizontal,
  ListPlus,
  Trash2,
} from "lucide-react";

/* ── Kategoriler ── */
interface Category {
  id: string;
  label: string;
  color: string;
  keywords: string[];
  imageUrl?: string;
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

export default function DiscoverPage() {
  const { playSong, currentSong, playing, togglePlay } = usePlayer();
  const { data: session } = useSession();
  const router = useRouter();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [menuSong, setMenuSong] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/discover-songs");
      if (!res.ok) return;
      const data: { songs: Song[] } = await res.json();
      setSongs(data.songs ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* Arama + kategori filtresi */
  const filteredSongs = (() => {
    let list = songs;
    if (activeCategory) {
      const cat = CATEGORIES.find((c) => c.id === activeCategory);
      if (cat) {
        list = list.filter((s) => {
          const haystack = `${s.title} ${s.style ?? ""}`.toLowerCase();
          return cat.keywords.some((kw) => haystack.includes(kw));
        });
      }
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.style?.toLowerCase().includes(q) ||
          s.creator?.name.toLowerCase().includes(q),
      );
    }
    return list;
  })();

  const isSearching = query.trim() !== "" || activeCategory !== null;

  const deleteSong = async (songId: string) => {
    await fetch(`/api/song/${songId}`, { method: "DELETE" });
    setSongs((prev) => prev.filter((s) => s.id !== songId));
    setMenuSong(null);
  };

  const isLibraryPlaying =
    currentSong &&
    filteredSongs.some((s) => s.id === currentSong.id) &&
    playing;

  return (
    <div className="min-h-full bg-[#121212]">
      {/* ── Başlık + arama ── */}
      <div className="pt-16 md:pt-6 px-4 pb-4 sticky top-0 z-10 bg-[#121212]">
        <h1 className="text-white text-2xl font-black mb-4 px-2">Keşfet</h1>
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-black/60"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveCategory(null);
            }}
            placeholder="Ne dinlemek istiyorsunuz?"
            className="w-full bg-white rounded-full py-3 pl-11 pr-10 text-black placeholder:text-black/50 text-sm font-medium outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 pressable"
            >
              <X size={18} className="text-black/60" />
            </button>
          )}
        </div>
      </div>

      {/* ── Kategoriler (arama yokken) ── */}
      {!isSearching ? (
        <div className="px-4 pb-6">
          <h2 className="text-white font-bold text-base mb-3 px-2">
            Tüm kategoriler
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => router.push(`/discover/${cat.id}`)}
                className="relative h-24 rounded-xl overflow-hidden pressable text-left"
                style={{ backgroundColor: cat.color }}
              >
                <span className="absolute top-3 left-3 text-white font-bold text-base leading-tight">
                  {cat.label}
                </span>
                {/* Dekoratif köşe görseli */}
                <div
                  className="absolute -bottom-2 -right-2 w-16 h-16 rounded-lg opacity-70 rotate-12"
                  style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
                />
                <div
                  className="absolute -bottom-1 -right-1 w-12 h-12 rounded-lg opacity-50 rotate-6 flex items-center justify-center"
                  style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                >
                  <Music2 size={20} className="text-white/80" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ── Arama / kategori sonuçları ── */
        <div className="px-4 pb-8">
          {/* Aktif kategori badge */}
          {activeCategory && (
            <div className="flex items-center gap-2 mb-4 px-2">
              <span className="text-white/60 text-sm">Kategori:</span>
              <button
                onClick={() => setActiveCategory(null)}
                className="flex items-center gap-1.5 bg-[#1db954] text-black text-sm font-bold rounded-full px-3 py-1 pressable"
              >
                {CATEGORIES.find((c) => c.id === activeCategory)?.label}
                <X size={13} />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="text-[#1db954] animate-spin" />
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="py-20 text-center">
              <Music2 size={48} className="text-[#535353] mx-auto mb-4" />
              <p className="text-white font-bold text-xl mb-2">
                Sonuç bulunamadı
              </p>
              <p className="text-[#535353] text-sm">
                &ldquo;
                {query ||
                  CATEGORIES.find((c) => c.id === activeCategory)?.label}
                &rdquo; için şarkı yok
              </p>
            </div>
          ) : (
            <>
              <p className="text-[#a7a7a7] text-sm mb-3 px-2">
                {filteredSongs.length} sonuç
              </p>
              <div className="flex flex-col">
                {filteredSongs.map((song, i) => {
                  const isActive = currentSong?.id === song.id;
                  return (
                    <div
                      key={song.id}
                      className={`flex items-center gap-3 px-2 py-2 rounded-md transition-colors group ${
                        isActive ? "bg-[#ffffff12]" : "hover:bg-[#ffffff0d]"
                      }`}
                    >
                      {/* Cover */}
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
                        {/* Play overlay */}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() =>
                              isActive
                                ? togglePlay()
                                : playSong(song, filteredSongs)
                            }
                            className="pressable"
                          >
                            {isActive && playing ? (
                              <Pause
                                size={18}
                                fill="white"
                                className="text-white"
                              />
                            ) : (
                              <Play
                                size={18}
                                fill="white"
                                className="text-white ml-0.5"
                              />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Info */}
                      <button
                        onClick={() =>
                          isActive
                            ? togglePlay()
                            : playSong(song, filteredSongs)
                        }
                        className="flex-1 min-w-0 text-left pressable"
                      >
                        <p
                          className={`text-sm font-semibold truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
                        >
                          {song.title}
                        </p>
                        <p className="text-[#a7a7a7] text-xs truncate mt-0.5">
                          {song.creator?.name ||
                            song.style?.split(",")[0] ||
                            "Hubeya"}
                        </p>
                      </button>

                      {/* Duration */}
                      <span className="text-[#a7a7a7] text-xs tabular-nums flex-shrink-0">
                        {fmt(song.duration)}
                      </span>

                      {/* Menu */}
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() =>
                            setMenuSong(menuSong === song.id ? null : song.id)
                          }
                          className="w-8 h-8 flex items-center justify-center text-[#a7a7a7] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity pressable"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {menuSong === song.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-[#282828] rounded-md shadow-2xl z-20 overflow-hidden">
                            <button
                              onClick={() => {
                                router.push(`/song/${song.id}`);
                                setMenuSong(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-[#3e3e3e] transition-colors text-left"
                            >
                              <Music2 size={14} />
                              Şarkı detayı
                            </button>
                            {song.creator?.username && (
                              <button
                                onClick={() => {
                                  router.push(
                                    `/profile/${song.creator!.username}`,
                                  );
                                  setMenuSong(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-[#3e3e3e] transition-colors text-left"
                              >
                                <ListPlus size={14} />
                                Profili gör
                              </button>
                            )}
                            {session?.user?.id &&
                              song.creator?.id === session.user.id && (
                                <button
                                  onClick={() => deleteSong(song.id)}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-[#3e3e3e] transition-colors text-left"
                                >
                                  <Trash2 size={14} />
                                  Sil
                                </button>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Arama yokken en son şarkılar ── */}
      {!isSearching && !loading && songs.length > 0 && (
        <div className="px-4 pb-10">
          <div className="flex items-center justify-between mb-3 px-2">
            <h2 className="text-white font-bold text-base">Son eklenenler</h2>
          </div>
          <div className="flex flex-col">
            {songs.slice(0, 20).map((song) => {
              const isActive = currentSong?.id === song.id;
              return (
                <div
                  key={song.id}
                  className={`flex items-center gap-3 px-2 py-2 rounded-md transition-colors group ${
                    isActive ? "bg-[#ffffff12]" : "hover:bg-[#ffffff0d]"
                  }`}
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
                      <button
                        onClick={() =>
                          isActive ? togglePlay() : playSong(song, songs)
                        }
                        className="pressable"
                      >
                        {isActive && playing ? (
                          <Pause
                            size={18}
                            fill="white"
                            className="text-white"
                          />
                        ) : (
                          <Play
                            size={18}
                            fill="white"
                            className="text-white ml-0.5"
                          />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      isActive ? togglePlay() : playSong(song, songs)
                    }
                    className="flex-1 min-w-0 text-left pressable"
                  >
                    <p
                      className={`text-sm font-semibold truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
                    >
                      {song.title}
                    </p>
                    <p className="text-[#a7a7a7] text-xs truncate mt-0.5">
                      {song.creator ? (
                        <Link
                          href={`/profile/${song.creator.username}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline"
                        >
                          {song.creator.name}
                        </Link>
                      ) : (
                        song.style?.split(",")[0] || "Hubeya"
                      )}
                    </p>
                  </button>

                  <span className="text-[#a7a7a7] text-xs tabular-nums flex-shrink-0">
                    {fmt(song.duration)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
