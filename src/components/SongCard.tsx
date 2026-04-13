"use client";

import { Play, Music2, Loader2, MoreHorizontal } from "lucide-react";
import { Song } from "@/types";

interface SongCardProps {
  song: Song;
  onPlay: (song: Song) => void;
  isPlaying?: boolean;
  variant?: "grid" | "row";
}

function fmtDur(s?: number) {
  if (!s) return "";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function SongCard({
  song,
  onPlay,
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
        {/* Cover */}
        <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden bg-[#222]">
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
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-semibold truncate ${isPlaying ? "text-[#1db954]" : "text-white"}`}
          >
            {song.title || "İsimsiz Şarkı"}
          </p>
          <p className="text-[#a7a7a7] text-xs truncate mt-0.5">
            {song.status === "processing"
              ? "Oluşturuluyor..."
              : song.style?.split(",")[0] || "AI Müzik"}
          </p>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isPlaying && (
            <span className="flex items-end gap-[2px] h-3 mr-1">
              <span className="wave-bar w-[3px] h-full" />
              <span className="wave-bar w-[3px] h-full" />
              <span className="wave-bar w-[3px] h-full" />
            </span>
          )}
          {song.duration && (
            <span className="text-[#535353] text-xs tabular-nums">
              {fmtDur(song.duration)}
            </span>
          )}
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1 pressable"
          >
            <MoreHorizontal size={18} className="text-[#535353]" />
          </button>
        </div>
      </div>
    );
  }

  // Grid variant
  return (
    <div
      className="pressable rounded-xl overflow-hidden bg-[#111] active:bg-[#1a1a1a]"
      onClick={() => ready && onPlay(song)}
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

        {/* Play indicator */}
        {isPlaying && (
          <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[#1db954] flex items-center justify-center">
            <span className="flex items-end gap-[2px] h-3">
              <span className="wave-bar w-[2px] h-full" />
              <span className="wave-bar w-[2px] h-full" />
              <span className="wave-bar w-[2px] h-full" />
            </span>
          </div>
        )}

        {ready && !isPlaying && (
          <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[#1db954] flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Play size={14} fill="black" className="text-black ml-0.5" />
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
        <p className="text-[#a7a7a7] text-xs truncate mt-0.5">
          {song.status === "processing"
            ? "Oluşturuluyor..."
            : song.style?.split(",")[0] || "AI Müzik"}
        </p>
      </div>
    </div>
  );
}
