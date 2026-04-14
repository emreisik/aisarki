"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Song } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import { Play, Pause, Music2, Clock3, UserCheck, UserPlus } from "lucide-react";

interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

interface ProfileData {
  user: PublicUser;
  songs: Song[];
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}

function fmt(s?: number) {
  if (!s || isNaN(s)) return "--:--";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} B`;
  return String(n);
}

/* Albüm kapağından dominant renk — hero gradient için */
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
          const dk = 0.55;
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

export default function ArtistPage() {
  const params = useParams();
  const username = params.username as string;
  const { data: session } = useSession();
  const { playSong, currentSong, playing, togglePlay } = usePlayer();

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const rgb = useHeroColor(data?.songs ?? []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/profile/${username}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFollow = async () => {
    if (!session?.user) return;
    if (!data) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/follow/${data.user.id}`, {
        method: "POST",
      });
      if (res.ok) {
        const json = await res.json();
        setData((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: json.following,
                followerCount: json.followerCount,
              }
            : prev,
        );
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const songs = data?.songs ?? [];
  const popularSongs = songs.slice(0, 5);
  const discography = songs.slice(5);

  const isThisArtistPlaying =
    currentSong && songs.some((s) => s.id === currentSong.id) && playing;

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    if (currentSong && songs.some((s) => s.id === currentSong.id)) {
      togglePlay();
    } else {
      playSong(songs[0], songs);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[#121212]">
        <div className="pt-16 md:pt-20 h-64 shimmer" />
        <div className="px-6 py-8 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded shimmer" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-3 w-1/3 rounded-full shimmer" />
                <div className="h-2.5 w-1/5 rounded-full shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-full bg-[#121212] flex flex-col items-center justify-center gap-4 pt-20">
        <Music2 size={56} className="text-[#535353]" />
        <p className="text-white font-bold text-xl">Kullanıcı bulunamadı</p>
        <p className="text-[#a7a7a7] text-sm">@{username} mevcut değil</p>
      </div>
    );
  }

  const { user, followerCount, followingCount, isFollowing } = data;
  const isOwnProfile = session?.user?.id === user.id;

  return (
    <div className="min-h-full bg-[#121212]">
      {/* ── Hero ── */}
      <div
        className="relative pt-16 md:pt-20 pb-6 overflow-hidden"
        style={{
          background: `linear-gradient(180deg, rgb(${rgb}) 0%, rgba(18,18,18,0.4) 100%)`,
          minHeight: 280,
        }}
      >
        {/* Blurred cover arka plan */}
        {songs[0]?.imageUrl && (
          <div className="absolute inset-0 pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={songs[0].imageUrl}
              alt=""
              className="w-full h-full object-cover"
              style={{
                filter: "blur(100px) saturate(1.3)",
                transform: "scale(1.5)",
                opacity: 0.2,
              }}
            />
          </div>
        )}
        <div className="relative z-10 px-6 flex flex-col items-center md:flex-row md:items-end gap-6">
          {/* Avatar */}
          <div className="w-36 h-36 md:w-48 md:h-48 rounded-full overflow-hidden flex-shrink-0 shadow-2xl bg-[#282828] flex items-center justify-center border-4 border-black/20">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span
                className="text-white font-black"
                style={{ fontSize: "clamp(2rem, 8vw, 5rem)" }}
              >
                {user.displayName[0]?.toUpperCase()}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col items-center md:items-start gap-2 text-center md:text-left">
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest">
              Sanatçı
            </p>
            <h1
              className="text-white font-black leading-none"
              style={{ fontSize: "clamp(2rem, 8vw, 5rem)" }}
            >
              {user.displayName}
            </h1>
            <p className="text-white/60 text-sm">@{user.username}</p>
            <div className="flex items-center gap-4 text-sm text-white/60 mt-1">
              <span>
                <span className="text-white font-bold">
                  {fmtCount(followerCount)}
                </span>{" "}
                takipçi
              </span>
              <span>
                <span className="text-white font-bold">
                  {fmtCount(followingCount)}
                </span>{" "}
                takip
              </span>
              <span>
                <span className="text-white font-bold">{songs.length}</span>{" "}
                şarkı
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="px-6 py-6 bg-[#121212] flex items-center gap-5">
        {songs.length > 0 && (
          <button
            onClick={handlePlayAll}
            className="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center pressable hover:scale-105 transition-transform shadow-xl"
          >
            {isThisArtistPlaying ? (
              <Pause size={26} fill="black" className="text-black" />
            ) : (
              <Play size={26} fill="black" className="text-black ml-1" />
            )}
          </button>
        )}

        {/* Follow butonu — kendi profilini görüntülemiyorsa */}
        {!isOwnProfile && (
          <button
            onClick={handleFollow}
            disabled={followLoading || !session?.user}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all pressable border ${
              isFollowing
                ? "border-[#1db954] text-[#1db954] hover:border-white hover:text-white"
                : "border-white/40 text-white hover:border-white"
            } disabled:opacity-50`}
          >
            {isFollowing ? (
              <>
                <UserCheck size={16} />
                Takip ediliyor
              </>
            ) : (
              <>
                <UserPlus size={16} />
                {session?.user ? "Takip et" : "Takip et"}
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Popüler şarkılar ── */}
      {songs.length > 0 && (
        <div className="px-6 pb-6">
          <h2 className="text-white font-bold text-xl mb-4">Popüler</h2>

          <div className="flex flex-col">
            {/* Column headers */}
            <div className="flex items-center gap-4 px-4 pb-2 border-b border-[#282828] mb-1 text-[#a7a7a7] text-xs uppercase tracking-widest">
              <span className="w-8 text-center">#</span>
              <span className="w-10 flex-shrink-0" />
              <span className="flex-1">Başlık</span>
              <Clock3 size={14} className="flex-shrink-0" />
            </div>

            {popularSongs.map((song, i) => (
              <SongRow
                key={song.id}
                song={song}
                index={i + 1}
                songs={songs}
                isActive={currentSong?.id === song.id}
                isPlaying={playing}
                onPlay={() => playSong(song, songs)}
                onToggle={togglePlay}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Diskografi ── */}
      {discography.length > 0 && (
        <div className="px-6 pb-10">
          <h2 className="text-white font-bold text-xl mb-4">Diskografi</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {discography.map((song) => (
              <button
                key={song.id}
                onClick={() => playSong(song, songs)}
                className="bg-[#181818] hover:bg-[#282828] transition-colors rounded-lg p-3 text-left pressable group"
              >
                <div className="w-full aspect-square rounded-md overflow-hidden mb-3 bg-[#282828] relative">
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
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-end justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-[#1db954] flex items-center justify-center shadow-xl translate-y-2 group-hover:translate-y-0 transition-transform">
                      {currentSong?.id === song.id && playing ? (
                        <Pause size={18} fill="black" className="text-black" />
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
                  className={`text-sm font-semibold truncate ${currentSong?.id === song.id ? "text-[#1db954]" : "text-white"}`}
                >
                  {song.title}
                </p>
                <p className="text-[#a7a7a7] text-xs truncate mt-0.5">
                  {fmt(song.duration)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hiç şarkı yok */}
      {songs.length === 0 && (
        <div className="py-20 text-center px-6">
          <Music2 size={48} className="text-[#535353] mx-auto mb-4" />
          <p className="text-white font-bold text-xl mb-2">Henüz şarkı yok</p>
          <p className="text-[#535353] text-sm">
            Bu sanatçı henüz şarkı oluşturmamış
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Satır bileşeni ── */
function SongRow({
  song,
  index,
  songs,
  isActive,
  isPlaying,
  onPlay,
  onToggle,
}: {
  song: Song;
  index: number;
  songs: Song[];
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onToggle: () => void;
}) {
  const fmt = (s?: number) => {
    if (!s || isNaN(s)) return "--:--";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  return (
    <div
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
              {index}
            </span>
            <button
              onClick={onPlay}
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
      <button
        onClick={isActive ? onToggle : onPlay}
        className="flex-1 min-w-0 text-left pressable"
      >
        <p
          className={`text-sm font-medium truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
        >
          {song.title}
        </p>
        <p className="text-[#a7a7a7] text-xs truncate mt-0.5">
          {song.style?.split(",")[0] || "Hubeya"}
        </p>
      </button>

      {/* Duration */}
      <span className="text-[#a7a7a7] text-sm tabular-nums flex-shrink-0">
        {fmt(song.duration)}
      </span>
    </div>
  );
}
