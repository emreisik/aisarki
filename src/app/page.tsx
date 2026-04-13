"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Song, Playlist } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import { useSession } from "next-auth/react";
import {
  Play,
  Pause,
  Music2,
  Clock3,
  ListMusic,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

/* ── Kategori sistemi ── */
interface CategoryItem {
  emoji: string;
  title: string;
  prompt: string;
}

interface CategoryGroup {
  label: string;
  color: string; // gradient başlangıç
  items: CategoryItem[];
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: "Kişiye Özel",
    color: "#be185d",
    items: [
      {
        emoji: "💕",
        title: "Sevgiliye",
        prompt:
          "Sevgilime özel, romantik ve içten duygular anlatan aşk şarkısı",
      },
      {
        emoji: "🌸",
        title: "Anneme",
        prompt: "Anneme sonsuz sevgi ve minnettarlık anlatan duygusal şarkı",
      },
      {
        emoji: "👨",
        title: "Babama",
        prompt: "Babama saygı, sevgi ve teşekkür anlatan güçlü bir şarkı",
      },
      {
        emoji: "🤝",
        title: "Arkadaşıma",
        prompt: "En iyi arkadaşıma ithaf, neşeli ve samimi dostluk şarkısı",
      },
      {
        emoji: "👶",
        title: "Bebeğime",
        prompt: "Bebeğime ninni tarzında yumuşak, sevgi dolu bir şarkı",
      },
      {
        emoji: "👩‍🏫",
        title: "Öğretmenime",
        prompt: "Öğretmenime teşekkür ve saygı anlatan içten bir şarkı",
      },
      {
        emoji: "❤️",
        title: "Kardeşime",
        prompt: "Kardeşime sevgi, birliktelik ve paylaşımı anlatan şarkı",
      },
    ],
  },
  {
    label: "Özel Günler",
    color: "#b45309",
    items: [
      {
        emoji: "🎂",
        title: "Doğum Günü",
        prompt: "Doğum günü için neşeli, enerjik ve kutlama ruhunda şarkı",
      },
      {
        emoji: "💍",
        title: "Düğün",
        prompt: "Düğün için romantik, mutlu ve kutlama dolu özel bir şarkı",
      },
      {
        emoji: "🥂",
        title: "Yıl Dönümü",
        prompt: "Yıl dönümü için romantik, birlikteliği anlatan özel şarkı",
      },
      {
        emoji: "🎉",
        title: "Parti Gecesi",
        prompt: "Parti için dans ettiren, enerjik ve eğlenceli bir şarkı",
      },
      {
        emoji: "🕌",
        title: "Bayram",
        prompt: "Bayram için kutlama, sevinç ve birliktelik temalı şarkı",
      },
      {
        emoji: "🎓",
        title: "Mezuniyet",
        prompt: "Mezuniyet için gurur verici, coşkulu bir kutlama şarkısı",
      },
      {
        emoji: "🌙",
        title: "Ramazan",
        prompt: "Ramazan ayına özel, manevi ve huzur dolu bir şarkı",
      },
    ],
  },
  {
    label: "Duygular",
    color: "#4338ca",
    items: [
      {
        emoji: "💔",
        title: "Ayrılık Acısı",
        prompt: "Ayrılık acısı ve yalnızlığı anlatan derin hüzünlü şarkı",
      },
      {
        emoji: "🌅",
        title: "Özlem",
        prompt: "Uzakta birine duyulan özlemi anlatan hüzünlü bir şarkı",
      },
      {
        emoji: "⚡",
        title: "Motivasyon",
        prompt: "Güçlü ve motive edici, hayata tutunmayı anlatan enerjik şarkı",
      },
      {
        emoji: "✨",
        title: "Mutlu & Neşeli",
        prompt: "Hayatın güzelliğini anlatan neşeli ve pozitif bir şarkı",
      },
      {
        emoji: "🌊",
        title: "Huzur & Sakinlik",
        prompt: "Sakinleştirici, huzurlu ve rahatlatıcı ambient bir şarkı",
      },
      {
        emoji: "🔥",
        title: "Öfke & Güç",
        prompt: "İçten gelen öfkeyi ve gücü anlatan rock tarzı şarkı",
      },
      {
        emoji: "🥺",
        title: "Nostalji",
        prompt: "Geçmiş günlere özlem, nostaljik ve duygusal bir şarkı",
      },
    ],
  },
  {
    label: "Türk Kültürü",
    color: "#065f46",
    items: [
      {
        emoji: "🌉",
        title: "İstanbul'a",
        prompt: "İstanbul'un ruhunu ve güzelliğini anlatan Türk pop şarkısı",
      },
      {
        emoji: "🏡",
        title: "Memleket Özlemi",
        prompt: "Memleketini özleyen birinin hüzünlü Türk şarkısı",
      },
      {
        emoji: "🌙",
        title: "Arabesk",
        prompt: "Klasik arabesk tarzında kader ve aşkı anlatan derin şarkı",
      },
      {
        emoji: "🪘",
        title: "Türk Halk",
        prompt: "Anadolu halk müziği tarzında kökleri anlatan şarkı",
      },
      {
        emoji: "☀️",
        title: "Yaz & Sahil",
        prompt: "Yaz tatili, deniz ve güneş temalı neşeli Türk pop şarkısı",
      },
      {
        emoji: "🎭",
        title: "Dizi Müziği",
        prompt: "Türk dizisi için dramatik ve etkileyici fon müziği",
      },
      {
        emoji: "🍵",
        title: "Çay Saati",
        prompt: "Sohbet, çay ve sıcak anlara dair sakin ve samimi şarkı",
      },
    ],
  },
];

/* ── Kategori kartı ── */
function CategoryCard({
  item,
  color,
  onSelect,
}: {
  item: CategoryItem;
  color: string;
  onSelect: (prompt: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(item.prompt)}
      className="flex-shrink-0 w-[120px] h-[80px] rounded-xl overflow-hidden relative pressable hover:scale-[1.04] transition-transform"
      style={{ background: `linear-gradient(135deg, ${color}dd, ${color}88)` }}
    >
      <span className="absolute top-2.5 left-3 text-2xl">{item.emoji}</span>
      <span className="absolute bottom-2.5 left-3 right-2 text-white text-xs font-bold leading-tight text-left">
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
  onSelect: (prompt: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? group.items : group.items.slice(0, 5);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2 px-6">
        <p className="text-white text-xs font-bold uppercase tracking-widest">
          {group.label}
        </p>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[#a7a7a7] text-xs pressable hover:text-white transition-colors"
        >
          {expanded ? "Gizle" : "Tümünü Gör"}
          <ChevronRight
            size={12}
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      {expanded ? (
        <div className="px-6 flex flex-wrap gap-2">
          {group.items.map((item) => (
            <CategoryCard
              key={item.title}
              item={item}
              color={group.color}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto scroll-area px-6 pb-1">
          {shown.map((item) => (
            <CategoryCard
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

/* ── Song tile (horizontal rail) ── */
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
      className="flex-shrink-0 w-[160px] bg-[#181818] hover:bg-[#282828] rounded-lg p-3 transition-colors text-left group pressable"
    >
      <div className="relative w-full aspect-square rounded-md overflow-hidden bg-[#282828] mb-3 shadow-lg">
        {song.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.imageUrl}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={32} className="text-[#535353]" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-[#1db954] flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
          {isPlaying ? (
            <Pause size={16} fill="black" className="text-black" />
          ) : (
            <Play size={16} fill="black" className="text-black ml-0.5" />
          )}
        </div>
      </div>
      <p
        className={`text-sm font-semibold truncate mb-0.5 ${isPlaying ? "text-[#1db954]" : "text-white"}`}
      >
        {song.title}
      </p>
      <p className="text-[#a7a7a7] text-xs truncate">
        {song.style?.split(",")[0] || "AI Müzik"}
      </p>
    </button>
  );
}

/* ── Playlist tile ── */
function PlaylistTile({ playlist }: { playlist: Playlist }) {
  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className="flex-shrink-0 w-[160px] bg-[#181818] hover:bg-[#282828] rounded-lg p-3 transition-colors group pressable"
    >
      <div className="relative w-full aspect-square rounded-md overflow-hidden bg-[#282828] mb-3 shadow-lg">
        {playlist.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.coverUrl}
            alt={playlist.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#450af5] to-[#c4efd9]">
            <ListMusic size={36} className="text-white" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-[#1db954] flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
          <Play size={16} fill="black" className="text-black ml-0.5" />
        </div>
      </div>
      <p className="text-white text-sm font-semibold truncate mb-0.5">
        {playlist.title}
      </p>
      <p className="text-[#a7a7a7] text-xs">{playlist.songCount ?? 0} şarkı</p>
    </Link>
  );
}

/* ── Track row ── */
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
    // Textarea'ya scroll et
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
      <div
        className="pt-16 md:pt-20 pb-6"
        style={{
          background: "linear-gradient(180deg, #0d2b1a 0%, #121212 100%)",
        }}
      >
        <div className="px-6 mb-5">
          <p className="text-[#1db954] text-xs font-bold uppercase tracking-widest mb-1">
            Yapay Zeka ile Müzik
          </p>
          <h1 className="text-white text-2xl md:text-3xl font-black leading-tight">
            Hangi şarkıyı yapalım?
          </h1>
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
        <div className="px-6 mt-4">
          <div className="relative">
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
              className="w-full bg-[#1a1a1a] border-2 border-[#2a2a2a] focus:border-[#1db954] rounded-2xl px-5 py-3.5 text-white text-sm placeholder-[#535353] resize-none focus:outline-none transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="mt-2.5 w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all pressable disabled:opacity-40"
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
        </div>
      </div>

      <div className="bg-[#121212] pb-8">
        {/* Oluşturulanlar */}
        {generatedSongs.length > 0 && (
          <section className="mb-8 px-6 pt-6">
            <h2 className="text-white text-2xl font-black mb-4">
              Oluşturulanlar
            </h2>
            <div className="flex flex-col">
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

        {/* Playlists */}
        {playlists.length > 0 && (
          <Rail title="Çalma listelerin">
            {playlists.map((pl) => (
              <PlaylistTile key={pl.id} playlist={pl} />
            ))}
          </Rail>
        )}

        {/* Tüm şarkılar */}
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

        {/* Boş durum */}
        {allSongs.length === 0 && generatedSongs.length === 0 && (
          <div className="px-6 pt-6">
            <div className="rounded-2xl bg-gradient-to-br from-[#1a3a2a] to-[#0a1a10] p-8 text-center">
              <Music2 size={40} className="text-[#1db954] mx-auto mb-4" />
              <p className="text-white text-xl font-bold mb-2">
                İlk şarkını oluştur
              </p>
              <p className="text-[#a7a7a7] text-sm">
                Bir kategori seç ve AI senin için şarkı üretsin
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
