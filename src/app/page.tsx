"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { type LucideIcon } from "lucide-react";
import {
  Play,
  Pause,
  Music2,
  Clock3,
  ListMusic,
  ChevronRight,
  Heart,
  Flower2,
  Shield,
  Users,
  Baby,
  GraduationCap,
  Cake,
  Gem,
  Calendar,
  PartyPopper,
  Star,
  Moon,
  HeartCrack,
  CloudRain,
  Zap,
  Smile,
  Wind,
  Flame,
  Clock,
  Landmark,
  Home,
  Sun,
  Film,
  Coffee,
  Mic2,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { Song, Playlist } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import { useSession } from "next-auth/react";

/* ── Kategori sistemi ── */
interface CategoryItem {
  icon: LucideIcon;
  title: string;
  prompt: string;
}
interface CategoryGroup {
  label: string;
  color: string;
  items: CategoryItem[];
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: "Kişiye Özel",
    color: "#f43f5e",
    items: [
      {
        icon: Heart,
        title: "Sevgiliye",
        prompt: "Sevgilime özel romantik ve içten duygular anlatan aşk şarkısı",
      },
      {
        icon: Flower2,
        title: "Anneme",
        prompt: "Anneme sonsuz sevgi ve minnettarlık anlatan duygusal şarkı",
      },
      {
        icon: Shield,
        title: "Babama",
        prompt: "Babama saygı, sevgi ve teşekkür anlatan güçlü bir şarkı",
      },
      {
        icon: Users,
        title: "Arkadaşıma",
        prompt: "En iyi arkadaşıma neşeli ve samimi dostluk şarkısı",
      },
      {
        icon: Baby,
        title: "Bebeğime",
        prompt: "Bebeğime ninni tarzında yumuşak ve sevgi dolu şarkı",
      },
      {
        icon: GraduationCap,
        title: "Öğretmenime",
        prompt: "Öğretmenime teşekkür ve saygı anlatan içten bir şarkı",
      },
    ],
  },
  {
    label: "Özel Günler",
    color: "#f59e0b",
    items: [
      {
        icon: Cake,
        title: "Doğum Günü",
        prompt: "Doğum günü için neşeli, enerjik ve kutlama ruhunda şarkı",
      },
      {
        icon: Gem,
        title: "Düğün",
        prompt: "Düğün için romantik, mutlu ve kutlama dolu özel bir şarkı",
      },
      {
        icon: Calendar,
        title: "Yıl Dönümü",
        prompt: "Yıl dönümü için romantik ve birlikteliği anlatan şarkı",
      },
      {
        icon: PartyPopper,
        title: "Parti",
        prompt: "Parti için dans ettiren, enerjik ve eğlenceli şarkı",
      },
      {
        icon: Star,
        title: "Bayram",
        prompt: "Bayram için kutlama, sevinç ve birliktelik temalı şarkı",
      },
      {
        icon: Moon,
        title: "Ramazan",
        prompt: "Ramazan ayına özel, manevi ve huzur dolu bir şarkı",
      },
    ],
  },
  {
    label: "Duygular",
    color: "#8b5cf6",
    items: [
      {
        icon: HeartCrack,
        title: "Ayrılık",
        prompt: "Ayrılık acısı ve yalnızlığı anlatan derin hüzünlü şarkı",
      },
      {
        icon: CloudRain,
        title: "Özlem",
        prompt: "Uzakta birine duyulan özlemi anlatan hüzünlü şarkı",
      },
      {
        icon: Zap,
        title: "Motivasyon",
        prompt: "Güçlü ve motive edici, hayata tutunmayı anlatan enerjik şarkı",
      },
      {
        icon: Smile,
        title: "Mutluluk",
        prompt: "Hayatın güzelliğini anlatan neşeli ve pozitif bir şarkı",
      },
      {
        icon: Wind,
        title: "Huzur",
        prompt: "Sakinleştirici, huzurlu ve rahatlatıcı ambient şarkı",
      },
      {
        icon: Flame,
        title: "Güç & Öfke",
        prompt: "İçten gelen gücü ve öfkeyi anlatan rock tarzı şarkı",
      },
      {
        icon: Clock,
        title: "Nostalji",
        prompt: "Geçmiş günlere özlem, nostaljik ve duygusal bir şarkı",
      },
    ],
  },
  {
    label: "Türk Kültürü",
    color: "#10b981",
    items: [
      {
        icon: Landmark,
        title: "İstanbul",
        prompt: "İstanbul'un ruhunu ve güzelliğini anlatan Türk pop şarkısı",
      },
      {
        icon: Home,
        title: "Memleket",
        prompt: "Memleketini özleyen birinin hüzünlü Türk şarkısı",
      },
      {
        icon: Mic2,
        title: "Arabesk",
        prompt: "Klasik arabesk tarzında kader ve aşkı anlatan derin şarkı",
      },
      {
        icon: Music2,
        title: "Türk Halk",
        prompt: "Anadolu halk müziği tarzında kökleri anlatan şarkı",
      },
      {
        icon: Sun,
        title: "Yaz & Sahil",
        prompt: "Yaz tatili, deniz ve güneş temalı neşeli Türk pop şarkısı",
      },
      {
        icon: Film,
        title: "Dizi Müziği",
        prompt: "Türk dizisi için dramatik ve etkileyici fon müziği",
      },
      {
        icon: Coffee,
        title: "Çay Saati",
        prompt: "Sohbet, çay ve sıcak anlara dair sakin ve samimi şarkı",
      },
      {
        icon: MapPin,
        title: "Anadolu",
        prompt: "Anadolu'nun renklerini ve kültürünü anlatan şarkı",
      },
    ],
  },
];

/* ── Kategori pill ── */
function CategoryPill({
  item,
  color,
  onSelect,
}: {
  item: CategoryItem;
  color: string;
  onSelect: (p: string) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onSelect(item.prompt)}
      className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#222] transition-all pressable group"
    >
      <Icon size={15} style={{ color }} className="flex-shrink-0" />
      <span className="text-white text-xs font-semibold whitespace-nowrap">
        {item.title}
      </span>
    </button>
  );
}

/* ── Kategori satırı ── */
function CategoryRow({
  group,
  onSelect,
}: {
  group: CategoryGroup;
  onSelect: (p: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? group.items : group.items.slice(0, 6);

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5 px-6">
        <p className="text-[#535353] text-[10px] font-bold uppercase tracking-widest">
          {group.label}
        </p>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-0.5 text-[#535353] text-[10px] pressable hover:text-[#a7a7a7] transition-colors"
        >
          {expanded ? "Kapat" : "Tümü"}
          <ChevronRight
            size={10}
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      {expanded ? (
        <div className="px-6 flex flex-wrap gap-2">
          {group.items.map((item) => (
            <CategoryPill
              key={item.title}
              item={item}
              color={group.color}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto scroll-area px-6 pb-0.5 no-scrollbar">
          {shown.map((item) => (
            <CategoryPill
              key={item.title}
              item={item}
              color={group.color}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function fmt(s?: number) {
  if (!s || isNaN(s)) return "--:--";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function Rail({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="px-6 mb-4">
        <h2 className="text-white text-xl font-black">{title}</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto scroll-area px-6 pb-2">
        {children}
      </div>
    </section>
  );
}

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
      className="flex-shrink-0 w-[150px] bg-[#181818] hover:bg-[#222] rounded-xl p-3 transition-colors text-left group pressable"
    >
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#282828] mb-3">
        {song.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.imageUrl}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={28} className="text-[#535353]" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[#1db954] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
          {isPlaying ? (
            <Pause size={14} fill="black" className="text-black" />
          ) : (
            <Play size={14} fill="black" className="text-black ml-0.5" />
          )}
        </div>
      </div>
      <p
        className={`text-xs font-semibold truncate mb-0.5 ${isPlaying ? "text-[#1db954]" : "text-white"}`}
      >
        {song.title}
      </p>
      <p className="text-[#535353] text-[11px] truncate">
        {song.style?.split(",")[0] || "AI Müzik"}
      </p>
    </button>
  );
}

function PlaylistTile({ playlist }: { playlist: Playlist }) {
  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className="flex-shrink-0 w-[150px] bg-[#181818] hover:bg-[#222] rounded-xl p-3 transition-colors group pressable"
    >
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#282828] mb-3">
        {playlist.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.coverUrl}
            alt={playlist.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#450af5] to-[#c4efd9]">
            <ListMusic size={32} className="text-white" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[#1db954] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
          <Play size={14} fill="black" className="text-black ml-0.5" />
        </div>
      </div>
      <p className="text-white text-xs font-semibold truncate mb-0.5">
        {playlist.title}
      </p>
      <p className="text-[#535353] text-[11px]">
        {playlist.songCount ?? 0} şarkı
      </p>
    </Link>
  );
}

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
      className="w-full flex items-center gap-4 px-4 py-2 rounded-lg hover:bg-[#ffffff0f] transition-colors group text-left pressable"
    >
      <div className="w-7 text-center flex-shrink-0">
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
            <span className="text-[#535353] text-xs group-hover:hidden">
              {index + 1}
            </span>
            <Play
              size={13}
              fill="white"
              className="text-white hidden group-hover:block mx-auto"
            />
          </>
        )}
      </div>
      <div className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden bg-[#282828]">
        {song.imageUrl ? (
          <img
            src={song.imageUrl}
            alt={song.title}
            className="w-full h-full object-cover"
          /> // eslint-disable-line @next/next/no-img-element
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={13} className="text-[#535353]" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${isPlaying ? "text-[#1db954]" : "text-white"}`}
        >
          {song.title}
        </p>
        <p className="text-[#535353] text-xs truncate">
          {song.style?.split(",")[0] || "AI Müzik"}
        </p>
      </div>
      {song.status === "processing" && (
        <span className="w-3.5 h-3.5 border-2 border-[#535353] border-t-transparent rounded-full animate-spin flex-shrink-0" />
      )}
      <span className="text-[#535353] text-xs tabular-nums flex-shrink-0">
        {song.status === "complete" ? fmt(song.duration) : "—"}
      </span>
    </button>
  );
}

/* ══════════════════════════════════════════════ */
export default function HomePage() {
  const { playSong, currentSong } = usePlayer();
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [generatedSongs, setGeneratedSongs] = useState<Song[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const handleCategorySelect = (p: string) => {
    setPrompt(p);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

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
              return [
                ...data.songs.filter((s: Song) => !ids.has(s.id)),
                ...prev,
              ];
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

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setError("");
    setLoading(true);
    const tempSongs: Song[] = [1, 2].map((i) => ({
      id: `temp-${Date.now()}-${i}`,
      title: prompt.slice(0, 40),
      status: "processing" as const,
      createdAt: new Date().toISOString(),
    }));
    handleSongsAdded(tempSongs);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
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

  const moreSongs = allSongs.slice(0, 18);
  const mobilePad = currentSong
    ? "pb-[calc(144px+env(safe-area-inset-bottom,0px))]"
    : "pb-[calc(72px+env(safe-area-inset-bottom,0px))]";

  return (
    <div className={`min-h-full ${mobilePad} md:pb-0`}>
      {/* ── Hero ── */}
      <div className="pt-16 md:pt-20 pb-6 bg-[#0a0a0a]">
        <div className="px-6 mb-5">
          <h1 className="text-white text-2xl md:text-3xl font-black">
            Şarkını Yap
          </h1>
          <p className="text-[#535353] text-sm mt-0.5">
            Bir kategori seç, AI üretsin
          </p>
        </div>

        {/* Kategori satırları */}
        {CATEGORY_GROUPS.map((group) => (
          <CategoryRow
            key={group.label}
            group={group}
            onSelect={handleCategorySelect}
          />
        ))}

        {/* Textarea + buton */}
        <div className="px-6 mt-5">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder="Bir kategori seç ya da kendin yaz..."
            rows={2}
            maxLength={500}
            className="w-full bg-[#141414] border border-[#2a2a2a] focus:border-[#1db954] rounded-2xl px-4 py-3.5 text-white text-sm placeholder-[#3a3a3a] resize-none focus:outline-none transition-colors"
          />
          {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="mt-2 w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all pressable disabled:opacity-30"
            style={{
              background: loading ? "#1a1a1a" : "#1db954",
              color: loading ? "#535353" : "black",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-[#535353]/40 border-t-[#535353] rounded-full animate-spin" />
                Oluşturuluyor...
              </span>
            ) : (
              "Şarkı Oluştur"
            )}
          </button>
        </div>
      </div>

      <div className="bg-[#0a0a0a] pb-8">
        {/* Oluşturulanlar */}
        {generatedSongs.length > 0 && (
          <section className="mb-8 px-6 pt-6">
            <h2 className="text-white text-xl font-black mb-3">
              Oluşturulanlar
            </h2>
            <div className="flex flex-col">
              <div className="flex items-center gap-4 px-4 pb-2 border-b border-[#1a1a1a] mb-1">
                <span className="w-7 text-center text-[#535353] text-xs">
                  #
                </span>
                <span className="w-9 flex-shrink-0" />
                <span className="flex-1 text-[#535353] text-xs uppercase tracking-widest">
                  Başlık
                </span>
                <Clock3 size={13} className="text-[#535353]" />
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

        {playlists.length > 0 && (
          <Rail title="Çalma Listelerim">
            {playlists.map((pl) => (
              <PlaylistTile key={pl.id} playlist={pl} />
            ))}
          </Rail>
        )}

        {moreSongs.length > 0 && (
          <Rail title="Son Şarkılar">
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

        {allSongs.length === 0 && generatedSongs.length === 0 && (
          <div className="px-6 pt-6">
            <div className="rounded-2xl border border-[#1a1a1a] p-8 text-center">
              <Music2 size={32} className="text-[#2a2a2a] mx-auto mb-3" />
              <p className="text-white text-base font-bold mb-1">
                İlk şarkını oluştur
              </p>
              <p className="text-[#535353] text-sm">
                Yukarıdan bir kategori seç
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
