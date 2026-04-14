"use client";

import Link from "next/link";
import { Play, Music2, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { Song } from "@/types";

interface SongCardProps {
  song: Song;
  onPlay: (song: Song) => void;
  onDetail?: (song: Song) => void;
  onDelete?: (song: Song) => void;
  isPlaying?: boolean;
  variant?: "grid" | "row";
}

function fmtDur(s?: number) {
  if (!s) return "";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function WaveBars({ color = "white" }: { color?: string }) {
  return (
    <span className="flex items-end gap-[3px]" style={{ height: "16px" }}>
      <span
        className="wave-bar rounded-sm"
        style={{ width: "3px", height: "100%", background: color }}
      />
      <span
        className="wave-bar rounded-sm"
        style={{
          width: "3px",
          height: "100%",
          background: color,
          animationDelay: "0.15s",
        }}
      />
      <span
        className="wave-bar rounded-sm"
        style={{
          width: "3px",
          height: "100%",
          background: color,
          animationDelay: "0.3s",
        }}
      />
    </span>
  );
}

export default function SongCard({
  song,
  onPlay,
  onDetail,
  onDelete,
  isPlaying,
  variant = "grid",
}: SongCardProps) {
  const ready = song.status === "complete" && song.audioUrl;

  if (variant === "row") {
    return (
      <div
        className="flex items-center gap-3 px-4 py-2.5 active:bg-[#1a1a1a] rounded-xl pressable"
        onClick={() => ready && onPlay(song)}
      >
        {/* Cover with playing overlay */}
        <div className="relative w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden bg-[#222]">
          {song.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={song.imageUrl}
              alt={song.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {song.status === "processing" ? (
                <Loader2 size={16} className="text-[#1db954] animate-spin" />
              ) : (
                <Music2 size={16} className="text-[#535353]" />
              )}
            </div>
          )}

          {/* Playing overlay */}
          {isPlaying && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <WaveBars />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-semibold truncate ${isPlaying ? "text-[#1db954]" : "text-white"}`}
          >
            {song.title || "İsimsiz Şarkı"}
          </p>
          {song.status === "processing" ? (
            <p className="text-[#a7a7a7] text-xs truncate mt-0.5">
              Oluşturuluyor...
            </p>
          ) : song.creator ? (
            <Link
              href={`/profile/${song.creator.username}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[#a7a7a7] text-xs truncate mt-0.5 hover:text-white hover:underline transition-colors block"
            >
              {song.creator.name}
            </Link>
          ) : (
            <p className="text-[#a7a7a7] text-xs truncate mt-0.5">
              {song.style?.split(",")[0] || "AI Müzik"}
            </p>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {song.duration && !isPlaying && (
            <span className="text-[#535353] text-xs tabular-nums">
              {fmtDur(song.duration)}
            </span>
          )}
          {onDelete ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(song);
              }}
              className="p-1 pressable text-[#535353] hover:text-red-400 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          ) : (
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1 pressable"
            >
              <MoreHorizontal size={18} className="text-[#535353]" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Grid variant
  return (
    <div
      className="group pressable rounded-xl overflow-hidden bg-[#111] active:opacity-80"
      onClick={() => (onDetail ? onDetail(song) : ready && onPlay(song))}
    >
      {/* Cover */}
      <div className="relative aspect-square bg-[#222]">
        {song.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.imageUrl}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {song.status === "processing" ? (
              <Loader2 size={28} className="text-[#1db954] animate-spin" />
            ) : (
              <Music2 size={28} className="text-[#535353]" />
            )}
          </div>
        )}

        {/* Playing overlay */}
        {isPlaying && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <WaveBars />
          </div>
        )}

        {/* Play button on hover (not playing) */}
        {ready && !isPlaying && (
          <div
            className="absolute inset-0 bg-black/40 flex items-end justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(song);
            }}
          >
            <div className="w-9 h-9 rounded-full bg-[#1db954] flex items-center justify-center shadow-lg">
              <Play size={16} fill="black" className="text-black ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p
          className={`text-sm font-semibold truncate ${isPlaying ? "text-[#1db954]" : "text-white"}`}
        >
          {song.title || "İsimsiz"}
        </p>
        {song.status === "processing" ? (
          <p className="text-[#a7a7a7] text-xs truncate mt-0.5">
            Oluşturuluyor...
          </p>
        ) : song.creator ? (
          <Link
            href={`/profile/${song.creator.username}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[#a7a7a7] text-xs truncate mt-0.5 hover:text-white hover:underline transition-colors block"
          >
            {song.creator.name}
          </Link>
        ) : (
          <p className="text-[#a7a7a7] text-xs truncate mt-0.5">
            {song.style?.split(",")[0] || "AI Müzik"}
          </p>
        )}
      </div>
    </div>
  );
}
