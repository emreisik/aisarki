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
  /** CSS mesh gradient — tek string, birebir Suno deseni */
  bg: string;
  keywords: string[];
}

// Her kategori Suno'nun birebir mesh-gradient desenini kullanır.
// Teknik: birden fazla radial-gradient katmanı, büyük blur, üst üste binen blob'lar.
const CATEGORIES: Category[] = [
  {
    id: "pop",
    label: "Pop",
    bg: "radial-gradient(circle at 30% 20%, #a855f7 0%, transparent 50%), radial-gradient(circle at 80% 80%, #ec4899 0%, transparent 50%), radial-gradient(circle at 50% 60%, #7c3aed 0%, transparent 60%), linear-gradient(135deg, #6d28d9 0%, #db2777 100%)",
    keywords: ["pop"],
  },
  {
    id: "turk",
    label: "Türk Müziği",
    bg: "radial-gradient(circle at 25% 25%, #4ade80 0%, transparent 50%), radial-gradient(circle at 75% 75%, #166534 0%, transparent 50%), radial-gradient(circle at 60% 30%, #22c55e 0%, transparent 55%), linear-gradient(135deg, #14532d 0%, #15803d 100%)",
    keywords: ["türk", "türkçe", "anatolian", "arabesk"],
  },
  {
    id: "rock",
    label: "Rock",
    bg: "radial-gradient(circle at 40% 30%, #2dd4bf 0%, transparent 45%), radial-gradient(circle at 70% 70%, #064e3b 0%, transparent 50%), radial-gradient(circle at 20% 80%, #0f766e 0%, transparent 55%), linear-gradient(135deg, #134e4a 0%, #0d3d36 100%)",
    keywords: ["rock", "metal", "alternative"],
  },
  {
    id: "hiphop",
    label: "Hip-Hop",
    bg: "radial-gradient(circle at 30% 30%, #60a5fa 0%, transparent 50%), radial-gradient(circle at 75% 70%, #1e3a8a 0%, transparent 50%), radial-gradient(circle at 55% 50%, #3b82f6 0%, transparent 55%), linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)",
    keywords: ["hip", "rap", "trap"],
  },
  {
    id: "electronic",
    label: "Electronic",
    bg: "radial-gradient(circle at 35% 25%, #22d3ee 0%, transparent 45%), radial-gradient(circle at 70% 75%, #0e7490 0%, transparent 50%), radial-gradient(circle at 50% 50%, #06b6d4 0%, transparent 55%), linear-gradient(135deg, #164e63 0%, #0891b2 100%)",
    keywords: ["electronic", "edm", "synth", "techno"],
  },
  {
    id: "latin",
    label: "Latin",
    bg: "radial-gradient(circle at 25% 30%, #818cf8 0%, transparent 50%), radial-gradient(circle at 80% 70%, #2563eb 0%, transparent 45%), radial-gradient(circle at 50% 50%, #4f46e5 0%, transparent 55%), linear-gradient(135deg, #312e81 0%, #3730a3 100%)",
    keywords: ["latin", "reggaeton", "salsa"],
  },
  {
    id: "country",
    label: "Country",
    bg: "radial-gradient(circle at 30% 30%, #fbbf24 0%, transparent 45%), radial-gradient(circle at 75% 70%, #b45309 0%, transparent 50%), radial-gradient(circle at 55% 45%, #f59e0b 0%, transparent 55%), linear-gradient(135deg, #78350f 0%, #d97706 100%)",
    keywords: ["country"],
  },
  {
    id: "folk",
    label: "Folk",
    bg: "radial-gradient(circle at 35% 35%, #a3e635 0%, transparent 45%), radial-gradient(circle at 70% 65%, #4d7c0f 0%, transparent 50%), radial-gradient(circle at 45% 75%, #65a30d 0%, transparent 50%), linear-gradient(135deg, #365314 0%, #4d7c0f 100%)",
    keywords: ["folk", "acoustic", "akustik"],
  },
  {
    id: "jazz",
    label: "Jazz",
    bg: "radial-gradient(circle at 30% 25%, #fbbf24 0%, transparent 45%), radial-gradient(circle at 75% 75%, #c2410c 0%, transparent 50%), radial-gradient(circle at 50% 50%, #ea580c 0%, transparent 55%), linear-gradient(135deg, #9a3412 0%, #ea580c 100%)",
    keywords: ["jazz", "swing", "blues"],
  },
  {
    id: "rnb",
    label: "R&B",
    bg: "radial-gradient(circle at 30% 25%, #f97316 0%, transparent 45%), radial-gradient(circle at 75% 75%, #dc2626 0%, transparent 50%), radial-gradient(circle at 50% 55%, #ea580c 0%, transparent 50%), linear-gradient(135deg, #7f1d1d 0%, #c2410c 100%)",
    keywords: ["rnb", "r&b", "soul"],
  },
  {
    id: "dans",
    label: "Dance",
    bg: "radial-gradient(circle at 30% 30%, #c084fc 0%, transparent 45%), radial-gradient(circle at 75% 70%, #7c3aed 0%, transparent 50%), radial-gradient(circle at 50% 55%, #a855f7 0%, transparent 55%), linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)",
    keywords: ["dance", "dans"],
  },
  {
    id: "romantik",
    label: "Romantik",
    bg: "radial-gradient(circle at 30% 30%, #fb7185 0%, transparent 45%), radial-gradient(circle at 75% 70%, #be123c 0%, transparent 50%), radial-gradient(circle at 50% 55%, #f43f5e 0%, transparent 55%), linear-gradient(135deg, #881337 0%, #e11d48 100%)",
    keywords: ["romantic", "romantik", "love", "aşk"],
  },
  {
    id: "cocuk",
    label: "Çocuk",
    bg: "radial-gradient(circle at 25% 25%, #fde047 0%, transparent 50%), radial-gradient(circle at 75% 75%, #f97316 0%, transparent 45%), radial-gradient(circle at 55% 45%, #facc15 0%, transparent 55%), linear-gradient(135deg, #a16207 0%, #eab308 100%)",
    keywords: ["child", "çocuk", "kid", "nursery"],
  },
  {
    id: "sakin",
    label: "Chill",
    bg: "radial-gradient(circle at 30% 30%, #6ee7b7 0%, transparent 45%), radial-gradient(circle at 70% 70%, #065f46 0%, transparent 50%), radial-gradient(circle at 50% 50%, #10b981 0%, transparent 55%), linear-gradient(135deg, #064e3b 0%, #047857 100%)",
    keywords: ["calm", "chill", "sakin", "ambient"],
  },
  {
    id: "duygusal",
    label: "Duygusal",
    bg: "radial-gradient(circle at 30% 25%, #e879f9 0%, transparent 45%), radial-gradient(circle at 75% 75%, #86198f 0%, transparent 50%), radial-gradient(circle at 50% 55%, #d946ef 0%, transparent 55%), linear-gradient(135deg, #701a75 0%, #a21caf 100%)",
    keywords: ["sad", "duygusal", "emotional", "melanko"],
  },
  {
    id: "nostalji",
    label: "Nostaljik",
    bg: "radial-gradient(circle at 30% 30%, #93c5fd 0%, transparent 45%), radial-gradient(circle at 75% 70%, #1e3a8a 0%, transparent 50%), radial-gradient(circle at 50% 55%, #3b82f6 0%, transparent 55%), linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
    keywords: ["nostalji", "retro", "vintage", "klasik"],
  },
  {
    id: "reggae",
    label: "Reggae",
    bg: "radial-gradient(circle at 30% 30%, #4ade80 0%, transparent 45%), radial-gradient(circle at 75% 70%, #eab308 0%, transparent 45%), radial-gradient(circle at 50% 55%, #22c55e 0%, transparent 50%), linear-gradient(135deg, #14532d 0%, #15803d 100%)",
    keywords: ["reggae", "ska", "dub"],
  },
  {
    id: "punk",
    label: "Punk",
    bg: "radial-gradient(circle at 30% 30%, #ef4444 0%, transparent 45%), radial-gradient(circle at 75% 70%, #1c1917 0%, transparent 50%), radial-gradient(circle at 50% 50%, #dc2626 0%, transparent 55%), linear-gradient(135deg, #450a0a 0%, #991b1b 100%)",
    keywords: ["punk", "hardcore", "grunge"],
  },
];

function fmt(s?: number) {
  if (!s || isNaN(s)) return "--:--";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/* ── Suno birebir mesh-gradient genre kart + üst deste ── */
function GenreCard({
  cat,
  onClick,
  onPlay,
  isPlaying,
}: {
  cat: Category;
  onClick: () => void;
  onPlay?: () => void;
  isPlaying?: boolean;
}) {
  return (
    <div className="flex-shrink-0 w-[148px] flex flex-col items-start group">
      <div className="relative w-full pt-[8px]">
        {/* Deste katman 2 (en arka, en üstte) */}
        <div
          className="absolute rounded-t-[12px] transition-all duration-200 ease-out group-hover:top-[-2px] group-hover:left-[5px] group-hover:right-[5px]"
          style={{
            top: 0,
            left: 8,
            right: 8,
            height: 14,
            background: cat.bg,
            opacity: 0.3,
            filter: "brightness(0.45) saturate(0.8)",
          }}
        />
        {/* Deste katman 1 */}
        <div
          className="absolute rounded-t-[13px] transition-all duration-200 ease-out group-hover:top-[1px] group-hover:left-[2px] group-hover:right-[2px]"
          style={{
            top: 4,
            left: 4,
            right: 4,
            height: 12,
            background: cat.bg,
            opacity: 0.55,
            filter: "brightness(0.65) saturate(0.9)",
          }}
        />

        {/* Ana kart */}
        <button
          onClick={onClick}
          className="relative w-full aspect-square rounded-[14px] overflow-hidden transition-transform duration-200 ease-out group-hover:translate-y-[3px] active:scale-[0.97]"
          style={{ background: cat.bg }}
        >
          {/* Kategori adı — sol üst */}
          <span
            className="absolute z-10 text-white italic"
            style={{
              top: "14px",
              left: "14px",
              fontSize: "20px",
              fontWeight: 600,
              lineHeight: 1.1,
              textShadow: "0 2px 16px rgba(0,0,0,0.3)",
            }}
          >
            {cat.label}
          </span>

          {/* Play / equalizer */}
          <div
            className="absolute bottom-[10px] right-[10px] z-10"
            onClick={(e) => {
              e.stopPropagation();
              onPlay?.();
            }}
          >
            {isPlaying ? (
              <div className="w-[32px] h-[32px] rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center gap-[2px]">
                <span className="w-[2.5px] h-[11px] wave-bar !bg-white" />
                <span className="w-[2.5px] h-[11px] wave-bar !bg-white" />
                <span className="w-[2.5px] h-[11px] wave-bar !bg-white" />
              </div>
            ) : (
              <div className="w-[32px] h-[32px] rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play size={14} fill="white" className="text-white ml-[1px]" />
              </div>
            )}
          </div>
        </button>
      </div>

      <p className="text-[#888] text-[11px] mt-[8px] ml-[2px] font-medium">
        Best of {cat.label}
      </p>
    </div>
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
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-end p-2.5 pointer-events-none">
          <div
            className="w-10 h-10 rounded-full bg-[#1db954] flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
          >
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
          <SectionRow title="Bu hafta trend">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[130px] md:w-[154px]">
                    <div className="w-full aspect-square rounded-xl bg-[#1a1a1a] animate-pulse" />
                    <div className="h-3 w-20 rounded-full bg-[#1a1a1a] animate-pulse mt-2.5" />
                    <div className="h-2 w-14 rounded-full bg-[#141414] animate-pulse mt-1.5" />
                  </div>
                ))
              : trending.slice(0, 10).map((song, i) => {
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

          {/* ══ Best Of — Suno mesh-gradient yatay scroll ══ */}
          <SectionRow title="Türe Göre">
            {CATEGORIES.map((cat) => {
              const catSongs = songs.filter((s) =>
                cat.keywords.some(
                  (kw) =>
                    s.style?.toLowerCase().includes(kw) ||
                    s.prompt?.toLowerCase().includes(kw),
                ),
              );
              const isCatPlaying =
                playing &&
                !!currentSong &&
                catSongs.some((s) => s.id === currentSong.id);
              return (
                <GenreCard
                  key={cat.id}
                  cat={cat}
                  onClick={() => router.push(`/discover/${cat.id}`)}
                  isPlaying={isCatPlaying}
                  onPlay={() => {
                    if (isCatPlaying) {
                      togglePlay();
                    } else if (catSongs.length > 0) {
                      playSong(catSongs[0], catSongs);
                    } else {
                      router.push(`/discover/${cat.id}`);
                    }
                  }}
                />
              );
            })}
          </SectionRow>

          {/* ══ En çok dinlenenler — yatay kart ══ */}
          <SectionRow title="En çok dinlenenler">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[130px] md:w-[154px]">
                    <div className="w-full aspect-square rounded-xl bg-[#1a1a1a] animate-pulse" />
                    <div className="h-3 w-20 rounded-full bg-[#1a1a1a] animate-pulse mt-2.5" />
                    <div className="h-2 w-14 rounded-full bg-[#141414] animate-pulse mt-1.5" />
                  </div>
                ))
              : topCharts.slice(0, 10).map((song) => {
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

          {/* ══ Son eklenenler — "Staff Picks" tarzı ══ */}
          <SectionRow title="Son eklenenler">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[130px] md:w-[154px]">
                    <div className="w-full aspect-square rounded-xl bg-[#1a1a1a] animate-pulse" />
                    <div className="h-3 w-20 rounded-full bg-[#1a1a1a] animate-pulse mt-2.5" />
                    <div className="h-2 w-14 rounded-full bg-[#141414] animate-pulse mt-1.5" />
                  </div>
                ))
              : recentPicks.map((song) => {
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
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <button
                            onClick={() =>
                              isActive
                                ? togglePlay()
                                : playSong(song, filteredSongs)
                            }
                            className="pressable pointer-events-auto"
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
