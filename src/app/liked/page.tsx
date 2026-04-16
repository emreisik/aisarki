"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePlayer } from "@/contexts/PlayerContext";
import { Song } from "@/types";
import SongCard from "@/components/SongCard";
import { Play, Pause, Shuffle, Heart, Music2 } from "lucide-react";

export default function LikedSongsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { playSong, currentSong, playing, togglePlay } = usePlayer();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/likes")
      .then((r) => r.json())
      .then((d) => setSongs(d.songs || []))
      .finally(() => setLoading(false));
  }, [status]);

  // liked=false olursa listeden çıkar (optimistic)
  const handleToggle = (song: Song, nextLiked: boolean) => {
    if (!nextLiked) {
      setSongs((prev) => prev.filter((s) => s.id !== song.id));
    }
  };

  const isCurrentList =
    currentSong && songs.some((s) => s.id === currentSong.id);

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    if (isCurrentList) togglePlay();
    else playSong(songs[0], songs);
  };

  const handleShuffle = () => {
    if (songs.length === 0) return;
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Kırmızı-mor gradient Spotify "Liked Songs" tarzı
  const heroGradient =
    "linear-gradient(180deg, #e11d48 0%, #7e22ce 45%, #121212 100%)";

  const user = session?.user;
  const totalSecs = songs.reduce((a, s) => a + (s.duration ?? 0), 0);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.round((totalSecs % 3600) / 60);
  const durationLabel =
    hrs > 0
      ? `yaklaşık ${hrs} sa${mins > 0 ? ` ${mins} dk` : ""}`
      : mins > 0
        ? `yaklaşık ${mins} dk`
        : "";

  return (
    <div className="min-h-full pb-8">
      {/* Hero */}
      <div style={{ background: heroGradient }} className="pt-16 md:pt-20">
        <div className="px-6 pb-6 flex flex-col md:flex-row md:items-end gap-6">
          {/* Cover — kırmızı-mor kalp */}
          <div
            className="w-48 h-48 md:w-56 md:h-56 flex-shrink-0 rounded-md overflow-hidden shadow-2xl mx-auto md:mx-0 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #e11d48 0%, #7e22ce 100%)",
            }}
          >
            <Heart size={80} fill="white" className="text-white drop-shadow" />
          </div>

          {/* Info */}
          <div className="flex flex-col gap-3 text-center md:text-left flex-1 min-w-0">
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              Çalma Listesi
            </p>
            <h1
              className="text-white font-black leading-none tracking-tight"
              style={{
                fontSize: "clamp(2.5rem, 7vw, 6rem)",
                lineHeight: 1.02,
              }}
            >
              Beğenilen Şarkılar
            </h1>
            <div className="flex items-center gap-1.5 text-sm text-white/90 flex-wrap justify-center md:justify-start">
              <span className="font-bold text-white">
                {user?.name ?? "Sen"}
              </span>
              {songs.length > 0 && (
                <>
                  <span className="text-white/60">·</span>
                  <span className="text-white/80">
                    {songs.length} şarkı
                    {durationLabel && `, ${durationLabel}`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 py-6 bg-[#121212] flex items-center gap-5">
        {songs.length > 0 && (
          <button
            onClick={handlePlayAll}
            className="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center pressable hover:scale-105 transition-transform shadow-xl"
            title={isCurrentList && playing ? "Duraklat" : "Çal"}
          >
            {isCurrentList && playing ? (
              <Pause size={26} fill="black" className="text-black" />
            ) : (
              <Play size={26} fill="black" className="text-black ml-1" />
            )}
          </button>
        )}

        {songs.length > 0 && (
          <button
            onClick={handleShuffle}
            className="text-[#a7a7a7] hover:text-white transition-colors pressable"
            title="Karıştır"
          >
            <Shuffle size={28} />
          </button>
        )}
      </div>

      {/* Track list */}
      <div className="px-3 md:px-6 bg-[#121212]">
        {songs.length === 0 ? (
          <div className="py-16 text-center">
            <Music2 size={40} className="text-[#535353] mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">
              Henüz beğenilen şarkı yok
            </p>
            <p className="text-[#a7a7a7] text-sm">
              Beğendiğin şarkılar buraya eklenecek
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {songs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                variant="row"
                liked={true}
                onPlay={() => playSong(song, songs)}
                onToggleLike={handleToggle}
                isPlaying={currentSong?.id === song.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
