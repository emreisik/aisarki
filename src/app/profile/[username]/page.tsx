"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Song } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import Link from "next/link";
import { Play, Pause, Music2, MoreHorizontal, ArrowLeft } from "lucide-react";
import { formatListenerCount } from "@/lib/formatNumber";

interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

interface UserStats {
  monthlyListeners: number;
  totalStreams: number;
  songCount: number;
}

interface ProfileData {
  user: PublicUser;
  songs: Song[];
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  stats?: UserStats;
}

function fmt(s?: number) {
  if (!s || isNaN(s)) return "--:--";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/* ── Avatar/kapaktan dominant renk ── */
function useHeroColor(avatarUrl?: string, songImageUrl?: string) {
  const [rgb, setRgb] = useState("30,30,40");
  const url = avatarUrl || songImageUrl;
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 60;
        const c = document.createElement("canvas");
        c.width = size;
        c.height = size;
        const ctx = c.getContext("2d");
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
  }, [url]);
  return rgb;
}

export default function ArtistPage() {
  const params = useParams();
  const username = params.username as string;
  const router = useRouter();
  const { data: session } = useSession();
  const { playSong, currentSong, playing, togglePlay } = usePlayer();

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const rgb = useHeroColor(data?.user.avatarUrl, data?.songs[0]?.imageUrl);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/profile/${username}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) return;
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFollow = async () => {
    if (!session?.user || !data) return;
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

  const isThisArtistPlaying =
    currentSong && songs.some((s) => s.id === currentSong.id) && playing;

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    if (currentSong && songs.some((s) => s.id === currentSong.id)) togglePlay();
    else playSong(songs[0], songs);
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="min-h-full bg-[#0a0a0a]">
        <div className="pt-4 h-72 shimmer" />
        <div className="px-5 py-6 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded shimmer flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-3 w-2/5 rounded-full shimmer" />
                <div className="h-2.5 w-1/4 rounded-full shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (notFound || !data) {
    return (
      <div className="min-h-full bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 pt-20">
        <Music2 size={48} className="text-[#333]" />
        <p className="text-white font-bold text-xl">Kullanıcı bulunamadı</p>
        <p className="text-[#888] text-sm">@{username} mevcut değil</p>
      </div>
    );
  }

  const { user, followerCount, isFollowing } = data;
  const isOwnProfile = session?.user?.id === user.id;

  return (
    <div className="min-h-full bg-[#0a0a0a]">
      {/* ══ Hero — Spotify native ══ */}
      <div
        className="relative pb-6"
        style={{
          background: `linear-gradient(180deg, rgb(${rgb}) 0%, rgba(${rgb},0.3) 65%, #0a0a0a 100%)`,
        }}
      >
        {/* Geri */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white pressable active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Avatar — ortada */}
        <div className="pt-14 flex justify-center">
          <div className="w-[140px] h-[140px] rounded-full overflow-hidden shadow-2xl bg-[#1a1a1a] flex items-center justify-center">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-5xl font-black">
                {user.displayName[0]?.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* İsim + dinleyici */}
        <div className="px-5 mt-5 text-center">
          <h1 className="text-white text-[28px] font-black leading-tight">
            {user.displayName}
          </h1>
          {data.stats && data.stats.monthlyListeners > 0 ? (
            <p className="text-[#aaa] text-[13px] mt-1.5">
              {formatListenerCount(data.stats.monthlyListeners)} aylık dinleyici
            </p>
          ) : (
            <p className="text-[#aaa] text-[13px] mt-1.5">
              {formatListenerCount(followerCount)} takipçi
            </p>
          )}
        </div>
      </div>

      {/* ══ Aksiyon bar ══ */}
      <div className="px-5 py-3 flex items-center">
        {/* Sol: follow + more */}
        <div className="flex items-center gap-3">
          {!isOwnProfile && (
            <button
              onClick={handleFollow}
              disabled={followLoading || !session?.user}
              className={`rounded-full px-5 py-1.5 text-[13px] font-bold border pressable active:scale-95 transition-all disabled:opacity-40 ${
                isFollowing
                  ? "border-[#1db954] text-[#1db954]"
                  : "border-[#888] text-white"
              }`}
            >
              {isFollowing ? "Takip ediliyor" : "Takip et"}
            </button>
          )}
          <button className="text-[#888] hover:text-white pressable active:scale-95 transition-colors">
            <MoreHorizontal size={24} />
          </button>
        </div>

        {/* Sağ: play */}
        <div className="ml-auto">
          {songs.length > 0 && (
            <button
              onClick={handlePlayAll}
              className="w-12 h-12 rounded-full bg-[#1db954] flex items-center justify-center pressable active:scale-95 transition-transform shadow-lg"
            >
              {isThisArtistPlaying ? (
                <Pause size={22} fill="black" className="text-black" />
              ) : (
                <Play size={22} fill="black" className="text-black ml-0.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* ══ Popüler şarkılar ══ */}
      {songs.length > 0 && (
        <div className="px-5 pb-6">
          <h2 className="text-white font-bold text-lg mb-3">Popüler</h2>
          <div className="flex flex-col">
            {songs.slice(0, 5).map((song, i) => {
              const isActive = currentSong?.id === song.id;
              return (
                <div
                  key={song.id}
                  className={`flex items-center gap-3 py-2.5 rounded-lg group transition-colors ${
                    isActive ? "bg-[#ffffff08]" : ""
                  }`}
                >
                  {/* Numara / wave */}
                  <div className="w-6 text-center flex-shrink-0">
                    {isActive && playing ? (
                      <span className="flex items-end justify-center gap-[2px] h-3.5">
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
                      <span className="text-[#888] text-sm">{i + 1}</span>
                    )}
                  </div>

                  {/* Kapak */}
                  <button
                    onClick={() =>
                      isActive ? togglePlay() : playSong(song, songs)
                    }
                    className="w-12 h-12 rounded flex-shrink-0 overflow-hidden bg-[#1a1a1a] pressable"
                  >
                    {song.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={song.imageUrl}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 size={16} className="text-[#444]" />
                      </div>
                    )}
                  </button>

                  {/* Başlık — tıklanabilir → şarkı detay */}
                  <Link
                    href={`/song/${song.id}`}
                    className="flex-1 min-w-0 pressable"
                  >
                    <p
                      className={`text-[15px] font-semibold truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
                    >
                      {song.title}
                    </p>
                    {song.playCount != null && song.playCount > 0 && (
                      <p className="text-[#888] text-[12px] tabular-nums mt-0.5">
                        {formatListenerCount(song.playCount)}
                      </p>
                    )}
                  </Link>

                  {/* Sağ: more */}
                  <button className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-white pressable opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ Diskografi — grid kartları ══ */}
      {songs.length > 5 && (
        <div className="px-5 pb-10">
          <h2 className="text-white font-bold text-lg mb-3">Diskografi</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {songs.slice(5).map((song) => {
              const isActive = currentSong?.id === song.id;
              return (
                <button
                  key={song.id}
                  onClick={() =>
                    isActive ? togglePlay() : playSong(song, songs)
                  }
                  className="bg-[#161616] hover:bg-[#1a1a1a] transition-colors rounded-xl p-3 text-left pressable group"
                >
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-[#1a1a1a] relative mb-2.5">
                    {song.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={song.imageUrl}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 size={28} className="text-[#333]" />
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
                    className={`text-[13px] font-semibold truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
                  >
                    {song.title}
                  </p>
                  <p className="text-[#888] text-[11px] mt-0.5">
                    {fmt(song.duration)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Boş durum */}
      {songs.length === 0 && (
        <div className="py-20 text-center px-5">
          <Music2 size={48} className="text-[#333] mx-auto mb-4" />
          <p className="text-white font-bold text-xl mb-2">Henüz şarkı yok</p>
          <p className="text-[#888] text-sm">
            Bu sanatçı henüz şarkı oluşturmamış
          </p>
        </div>
      )}
    </div>
  );
}
