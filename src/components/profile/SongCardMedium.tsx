"use client";

import { Play, Pause, Music2 } from "lucide-react";
import type { Song } from "@/types";
import SongContextMenu, { type SongMenuAction } from "./SongContextMenu";

type Props = {
  song: Song;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onAction: (action: SongMenuAction) => void;
};

function formatCount(n: number | undefined): string {
  if (!n) return "";
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export default function SongCardMedium({
  song,
  isActive,
  isPlaying,
  onPlay,
  onAction,
}: Props) {
  return (
    <div className="group flex flex-col text-left">
      <div
        role="button"
        tabIndex={0}
        onClick={onPlay}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPlay();
          }
        }}
        className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#1a1a1a] pressable cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
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
            <Music2 size={36} className="text-[#333]" />
          </div>
        )}

        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Play button — center overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <span className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-xl scale-90 group-hover:scale-100 transition-transform">
            {isActive && isPlaying ? (
              <Pause size={22} fill="black" className="text-black" />
            ) : (
              <Play size={22} fill="black" className="text-black ml-0.5" />
            )}
          </span>
        </div>

        {/* 3-dot menu — top right */}
        <div
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <SongContextMenu song={song} onAction={onAction} variant="card" />
        </div>

        {/* Play count — bottom left */}
        {song.playCount != null && song.playCount > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold">
            <Play size={9} fill="currentColor" />
            {formatCount(song.playCount)}
          </div>
        )}
      </div>

      <div className="pt-2.5 min-w-0">
        <p
          className={`text-[14px] font-semibold truncate ${
            isActive ? "text-[#1ed760]" : "text-white"
          }`}
        >
          {song.title}
        </p>
        <p className="text-[#888] text-[11px] truncate mt-0.5">
          {song.style?.split(",")[0]?.trim() || song.creator?.name || "Rifmo"}
        </p>
      </div>
    </div>
  );
}
