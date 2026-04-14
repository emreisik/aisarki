"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Pause, Music2, Heart } from "lucide-react";
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

function useDominantColor(imageUrl?: string | null) {
  const [rgb, setRgb] = useState("30,30,40");
  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 80;
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
          const dk = 0.65;
          setRgb(
            `${Math.floor((r / n) * dk)},${Math.floor((g / n) * dk)},${Math.floor((b / n) * dk)}`,
          );
        }
      } catch {
        /* CORS */
      }
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);
  return rgb;
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
  const dominantRgb = useDominantColor(song?.imageUrl);

  const handlePlay = () => {
    if (!song || song.status !== "complete") return;
    if (isActive) togglePlay();
    else playSong(song, [song]);
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
      {/* Hero — album art + dinamik gradient */}
      <div
        className="relative pb-0 overflow-hidden"
        style={{
          background: `linear-gradient(180deg, rgb(${dominantRgb}) 0%, rgba(${dominantRgb},0.6) 50%, #0a0a0a 100%)`,
          minHeight: 380,
        }}
      >
        {/* Blurred bg */}
        {song.imageUrl && (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url(${song.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(40px)",
              transform: "scale(1.1)",
            }}
          />
        )}

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/30 pressable"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>

        {/* Cover + info */}
        <div className="relative z-10 px-5 pt-14 pb-6 flex flex-col items-center gap-5">
          {/* Cover */}
          <div className="w-56 h-56 rounded-xl overflow-hidden shadow-2xl flex-shrink-0">
            {song.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={song.imageUrl}
                alt={song.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                <Music2 size={64} className="text-[#535353]" />
              </div>
            )}
          </div>

          {/* Başlık ve sanatçı */}
          <div className="w-full">
            <h1 className="text-white text-2xl font-black leading-tight truncate">
              {song.title}
            </h1>
            {song.creator && (
              <Link
                href={`/profile/${song.creator.username}`}
                className="text-white/70 text-sm font-semibold mt-1 inline-block hover:text-white transition-colors"
              >
                {song.creator.name}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-5 py-4 flex items-center justify-between">
        {/* Kalp (placeholder) */}
        <button className="w-10 h-10 flex items-center justify-center pressable">
          <Heart size={24} className="text-[#a7a7a7]" />
        </button>

        {/* Play butonu — büyük ve belirgin */}
        <button
          onClick={handlePlay}
          disabled={song.status !== "complete"}
          className="w-16 h-16 rounded-full bg-[#1db954] flex items-center justify-center pressable hover:scale-105 transition-transform shadow-2xl disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isActive && playing ? (
            <Pause size={30} fill="black" className="text-black" />
          ) : (
            <Play size={30} fill="black" className="text-black ml-1" />
          )}
        </button>

        {/* Süre */}
        <div className="w-10 h-10 flex items-center justify-center">
          <span className="text-[#a7a7a7] text-xs">
            {fmt(song.duration) ?? ""}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="px-5 pt-2 pb-10 border-t border-white/5">
        <p className="text-[#a7a7a7] text-xs mt-4">{fmtDate(song.createdAt)}</p>
        <p className="text-[#535353] text-xs mt-1">Hubeya ile oluşturuldu</p>
      </div>
    </div>
  );
}
