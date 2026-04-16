"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import SongCard from "@/components/SongCard";
import { Song } from "@/types";
import { LogOut, Music2, User, Settings } from "lucide-react";

interface Stats {
  followerCount: number;
  followingCount: number;
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} B`;
  return String(n);
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { playSong, currentSong } = usePlayer();
  const [songs, setSongs] = useState<Song[]>([]);
  const [stats, setStats] = useState<Stats>({
    followerCount: 0,
    followingCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const username = (session?.user as { username?: string })?.username;

    Promise.all([
      fetch("/api/all-songs")
        .then((r) => r.json())
        .then((d) => setSongs(d.songs || [])),
      username
        ? fetch(`/api/profile/${username}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.followerCount !== undefined) {
                setStats({
                  followerCount: d.followerCount,
                  followingCount: d.followingCount,
                });
              }
            })
        : Promise.resolve(),
    ]).finally(() => setLoading(false));

    // Callback'in kaçırdığı şarkıları arka planda Bunny'ye taşı (idempotent).
    fetch("/api/songs/heal", { method: "POST", keepalive: true }).catch(
      () => {},
    );
  }, [status]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = session!.user!;
  const username = (user as { username?: string }).username;

  return (
    <div className="min-h-full bg-[#121212]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#1a3a1a] to-[#121212] pt-16 md:pt-20 px-6 pb-6">
        <div className="flex items-end gap-5">
          {/* Avatar */}
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#282828] flex-shrink-0 overflow-hidden shadow-2xl">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name ?? ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User size={40} className="text-[#535353]" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pb-1">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">
              Profil
            </p>
            <h1 className="text-white text-3xl md:text-5xl font-black truncate">
              {user.name || username}
            </h1>
            {username && (
              <p className="text-white/50 text-sm mt-1">@{username}</p>
            )}
            {/* Stats */}
            {!loading && (
              <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
                <span>
                  <span className="text-white font-bold">
                    {fmtCount(stats.followerCount)}
                  </span>{" "}
                  takipçi
                </span>
                <span>
                  <span className="text-white font-bold">
                    {fmtCount(stats.followingCount)}
                  </span>{" "}
                  takip
                </span>
                <span>
                  <span className="text-white font-bold">{songs.length}</span>{" "}
                  şarkı
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-6">
          <button className="flex items-center gap-2 border border-white/20 rounded-full px-4 py-1.5 text-white text-sm font-semibold hover:border-white/50 transition-colors pressable">
            <Settings size={14} />
            Düzenle
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-2 border border-white/10 rounded-full px-4 py-1.5 text-white/50 text-sm font-semibold hover:text-white hover:border-white/30 transition-colors pressable"
          >
            <LogOut size={14} />
            Çıkış yap
          </button>
        </div>
      </div>

      {/* Songs */}
      <div className="px-6 pb-8">
        <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <Music2 size={18} className="text-[#1db954]" />
          Şarkılarım
          {!loading && songs.length > 0 && (
            <span className="text-white/40 font-normal text-sm">
              {songs.length} şarkı
            </span>
          )}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-16">
            <Music2 size={40} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">Henüz şarkı yok</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {songs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                isPlaying={currentSong?.id === song.id}
                onPlay={() => playSong(song, songs)}
                onDelete={async (s) => {
                  await fetch(`/api/song/${s.id}`, { method: "DELETE" });
                  setSongs((prev) => prev.filter((x) => x.id !== s.id));
                }}
                variant="row"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
