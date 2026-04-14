"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Pause, Music2, Clock3, Sparkles } from "lucide-react";
import { Song } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";

function fmt(s?: number) {
  if (!s || isNaN(s)) return null;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SongDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { playSong, currentSong, playing, togglePlay } = usePlayer();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/song/${id}`)
      .then((r) => r.json())
      .then((d) => setSong(d.song ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  const isActive = currentSong?.id === song?.id;

  const handlePlay = () => {
    if (!song || song.status !== "complete") return;
    if (isActive) {
      togglePlay();
    } else {
      playSong(song, [song]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] gap-3">
        <Music2 size={48} className="text-[#535353]" />
        <p className="text-white font-bold">Şarkı bulunamadı</p>
        <button
          onClick={() => router.back()}
          className="text-[#1db954] text-sm pressable"
        >
          Geri dön
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0a0a0a]">
      {/* Hero */}
      <div
        className="relative pt-14 md:pt-10 pb-8"
        style={{
          background: song.imageUrl
            ? "linear-gradient(180deg, #1a1a2e 0%, #0a0a0a 70%)"
            : "linear-gradient(180deg, #1c1c1c 0%, #0a0a0a 70%)",
        }}
      >
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 md:top-6 left-4 md:left-6 z-10 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors pressable"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>

        <div className="px-6 pt-8 flex flex-col md:flex-row md:items-end gap-6 md:gap-8">
          {/* Cover */}
          <div className="w-52 h-52 md:w-64 md:h-64 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl mx-auto md:mx-0">
            {song.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={song.imageUrl}
                alt={song.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1db954]/30 to-[#0a0a0a] flex items-center justify-center">
                <Music2 size={72} className="text-white/20" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-2 text-center md:text-left">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">
              Hubeya
            </p>
            <h1 className="text-white text-3xl md:text-5xl font-black leading-tight">
              {song.title}
            </h1>
            {song.creator && (
              <Link
                href={`/profile/${song.creator.username}`}
                className="text-white font-semibold text-sm hover:underline transition-colors self-center md:self-start"
              >
                {song.creator.name}
              </Link>
            )}
            {song.style && (
              <p className="text-[#a7a7a7] text-sm">{song.style}</p>
            )}
            <div className="flex items-center justify-center md:justify-start gap-3 text-[#a7a7a7] text-xs mt-1">
              {song.duration && (
                <span className="flex items-center gap-1">
                  <Clock3 size={12} />
                  {fmt(song.duration)}
                </span>
              )}
              <span>{fmtDate(song.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 py-6 flex items-center gap-5">
        <button
          onClick={handlePlay}
          disabled={song.status !== "complete"}
          className="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center pressable hover:scale-105 transition-transform shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isActive && playing ? (
            <Pause size={26} fill="black" className="text-black" />
          ) : (
            <Play size={26} fill="black" className="text-black ml-1" />
          )}
        </button>
      </div>

      {/* Prompt */}
      {song.prompt && (
        <div className="px-6 pb-8">
          <div className="bg-[#111] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-[#1db954]" />
              <p className="text-[#a7a7a7] text-xs font-semibold uppercase tracking-widest">
                Prompt
              </p>
            </div>
            <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
              {song.prompt}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
