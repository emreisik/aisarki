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
  ChevronRight,
} from "lucide-react";

/* ══════════════════════════════════════════════
   Kategoriler — Suno "Best Of" tarzı
══════════════════════════════════════════════ */
interface Category {
  id: string;
  label: string;
  gradient: [string, string]; // iki renk → mesh gradient
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

/* ── Suno tarzı gradient kart ── */
function GenreCard({ cat, onClick }: { cat: Category; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex flex-col items-start pressable group"
    >
      <div
        className="w-[130px] h-[130px] md:w-[154px] md:h-[154px] rounded-xl overflow-hidden relative"
        style={{
          background: `linear-gradient(135deg, ${cat.gradient[0]} 0%, ${cat.gradient[1]} 50%, ${cat.gradient[0]}88 100%)`,
        }}
      >
        {/* Bulanık dekoratif daireler — Suno "blob" efekti */}
        <div
          className="absolute w-[80%] h-[80%] rounded-full blur-2xl opacity-50"
          style={{
            background: cat.gradient[1],
            top: "10%",
            left: "-20%",
          }}
        />
        <div
          className="absolute w-[60%] h-[60%] rounded-full blur-2xl opacity-40"
          style={{
            background: cat.gradient[0],
            bottom: "-10%",
            right: "-10%",
          }}
        />

        {/* Kategori adı — sol üst */}
        <span className="absolute top-3 left-3.5 text-white font-bold text-[15px] md:text-base leading-tight drop-shadow-md z-10">
          {cat.label}
        </span>

        {/* Hover play indicator */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
          <Play
            size={28}
            fill="white"
            className="text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg ml-0.5"
          />
        </div>
      </div>
      <p className="text-[#999] text-xs mt-2 ml-0.5">{cat.label} şarkıları</p>
    </button>
  );
}

/* ── Yatay scroll satırı — başlık + ok ── */
function SectionRow({
  title,
  children,
  onSeeAll,
}: {
  title: string;
  children: React.ReactNode;
  onSeeAll?: () => void;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between px-5 mb-3">
        <h2 className="text-white font-bold text-xl">{title}</h2>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-[#999] text-xs font-semibold flex items-center gap-0.5 pressable hover:text-white transition-colors"
          >
            See all <ChevronRight size={14} />
          </button>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto scroll-area px-5 pb-1">
        {children}
      </div>
    </section>
  );
}

/* ── Song kart (Staff Picks / Trending tarzı) ── */
function SongCard({
  song,
  isActive,
  isPlaying,
  onPlay,
  showBadge,
  badge,
}: {
  song: Song;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  showBadge?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <button
      onClick={onPlay}
      className="flex-shrink-0 w-[130px] md:w-[154px] text-left pressable group"
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
        {/* Badge */}
        {showBadge && badge}
        {/* Hover play */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-end p-2.5">
          <div className="w-10 h-10 rounded-full bg-[#1db954] flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
            {isActive && isPlaying ? (
              <Pause size={18} fill="black" className="text-black" />
            ) : (
              <Play size={18} fill="black" className="text-black ml-0.5" />
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
        {song.creator?.name || song.style?.split(",")[0] || "Hubeya"}
      </p>
    </button>
  );
}

/* ══════════════════════════════════════════════
   Ana sayfa — Keşfet
══════════════════════════════════════════════ */
export default function DiscoverPage() {
  const { playSong, currentSong, playing, togglePlay } = usePlayer();
  const { data: session } = useSession();
  const router = useRouter();

  const [songs, setSongs] = useState<Song[]>([]);
  const [trending, setTrending] = useState<Song[]>([]);
  const [topCharts, setTopCharts] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [menuSong, setMenuSong] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [all, trend, top] = await Promise.all([
        fetch("/api/discover-songs").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/charts/trending?days=7&limit=20").then((r) =>
          r.ok ? r.json() : null,
        ),
        fetch("/api/charts/top?limit=20").then((r) => (r.ok ? r.json() : null)),
      ]);
      setSongs(all?.songs ?? []);
      setTrending(trend?.songs ?? []);
      setTopCharts(top?.songs ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* Arama filtresi */
  const filteredSongs = (() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.style?.toLowerCase().includes(q) ||
        s.creator?.name.toLowerCase().includes(q),
    );
  })();

  const isSearching = query.trim() !== "";

  const deleteSong = async (songId: string) => {
    await fetch(`/api/song/${songId}`, { method: "DELETE" });
    setSongs((prev) => prev.filter((s) => s.id !== songId));
    setMenuSong(null);
  };

  /* ── Son eklenenler — "Staff Picks" tarzı ── */
  const recentPicks = songs.slice(0, 12);

  return (
    <div className="min-h-full bg-[#0a0a0a]">
      {/* ── Başlık + arama ── */}
      <div className="pt-4 px-5 pb-5">
        <h1 className="text-white text-2xl font-black mb-4">Keşfet</h1>
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ne dinlemek istiyorsunuz?"
            className="w-full bg-[#1a1a1a] rounded-xl py-3 pl-11 pr-10 text-white placeholder:text-[#555] text-sm font-medium outline-none border border-[#222] focus:border-[#333] transition-colors"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 pressable"
            >
              <X size={18} className="text-[#888]" />
            </button>
          )}
        </div>
      </div>

      {!isSearching ? (
        <>
          {/* ══ Trend — yatay kart satırı ══ */}
          {trending.length > 0 && (
            <SectionRow title="Bu hafta trend">
              {trending.slice(0, 10).map((song, i) => {
                const isActive = currentSong?.id === song.id;
                return (
                  <SongCard
                    key={song.id}
                    song={song}
                    isActive={isActive}
                    isPlaying={isActive && playing}
                    onPlay={() =>
                      isActive ? togglePlay() : playSong(song, trending)
                    }
                    showBadge
                    badge={
                      <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white text-xs font-black z-10">
                        {i + 1}
                      </div>
                    }
                  />
                );
              })}
            </SectionRow>
          )}

          {/* ══ Best Of — Suno tarzı gradient kartlar ══ */}
          <SectionRow title="Türe Göre">
            {CATEGORIES.map((cat) => (
              <GenreCard
                key={cat.id}
                cat={cat}
                onClick={() => router.push(`/discover/${cat.id}`)}
              />
            ))}
          </SectionRow>

          {/* ══ En çok dinlenenler — yatay kart ══ */}
          {topCharts.length > 0 && (
            <SectionRow title="En çok dinlenenler">
              {topCharts.slice(0, 10).map((song) => {
                const isActive = currentSong?.id === song.id;
                return (
                  <SongCard
                    key={song.id}
                    song={song}
                    isActive={isActive}
                    isPlaying={isActive && playing}
                    onPlay={() =>
                      isActive ? togglePlay() : playSong(song, topCharts)
                    }
                  />
                );
              })}
            </SectionRow>
          )}

          {/* ══ Son eklenenler — "Staff Picks" tarzı ══ */}
          {!loading && recentPicks.length > 0 && (
            <SectionRow title="Son eklenenler">
              {recentPicks.map((song) => {
                const isActive = currentSong?.id === song.id;
                return (
                  <SongCard
                    key={song.id}
                    song={song}
                    isActive={isActive}
                    isPlaying={isActive && playing}
                    onPlay={() =>
                      isActive ? togglePlay() : playSong(song, songs)
                    }
                  />
                );
              })}
            </SectionRow>
          )}

          {/* Boş padding */}
          <div className="h-10" />
        </>
      ) : (
        /* ══ Arama sonuçları ══ */
        <div className="px-5 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="text-[#1db954] animate-spin" />
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="py-20 text-center">
              <Music2 size={48} className="text-[#333] mx-auto mb-4" />
              <p className="text-white font-bold text-xl mb-2">
                Sonuç bulunamadı
              </p>
              <p className="text-[#555] text-sm">
                &ldquo;{query}&rdquo; ile eşleşen şarkı yok
              </p>
            </div>
          ) : (
            <>
              <p className="text-[#888] text-sm mb-3">
                {filteredSongs.length} sonuç
              </p>
              <div className="flex flex-col">
                {filteredSongs.map((song) => {
                  const isActive = currentSong?.id === song.id;
                  return (
                    <div
                      key={song.id}
                      className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-colors group ${
                        isActive ? "bg-[#ffffff12]" : "hover:bg-[#ffffff08]"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden bg-[#1a1a1a] relative">
                        {song.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={song.imageUrl}
                            alt={song.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music2 size={16} className="text-[#333]" />
                          </div>
                        )}
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
                        <p className="text-[#888] text-xs truncate mt-0.5">
                          {song.creator?.name ||
                            song.style?.split(",")[0] ||
                            "Hubeya"}
                        </p>
                      </button>

                      <span className="text-[#888] text-xs tabular-nums flex-shrink-0">
                        {fmt(song.duration)}
                      </span>

                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() =>
                            setMenuSong(menuSong === song.id ? null : song.id)
                          }
                          className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity pressable"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {menuSong === song.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-[#1a1a1a] rounded-xl shadow-2xl z-20 overflow-hidden border border-[#222]">
                            <button
                              onClick={() => {
                                router.push(`/song/${song.id}`);
                                setMenuSong(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-[#252525] transition-colors text-left"
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
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-[#252525] transition-colors text-left"
                              >
                                <ListPlus size={14} />
                                Profili gör
                              </button>
                            )}
                            {session?.user?.id &&
                              song.creator?.id === session.user.id && (
                                <button
                                  onClick={() => deleteSong(song.id)}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-[#252525] transition-colors text-left"
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
    </div>
  );
}
