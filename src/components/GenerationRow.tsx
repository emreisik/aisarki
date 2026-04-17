"use client";

import { Loader2, Play, Pause, X } from "lucide-react";
import { Song } from "@/types";

interface GenerationRowSkeletonProps {
  model?: string;
  imageHint?: string;
  failed?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  retrying?: boolean;
}

export function GenerationRowSkeleton({
  imageHint,
  failed,
  errorTitle,
  errorMessage,
  onCancel,
  onRetry,
  retrying,
}: GenerationRowSkeletonProps) {
  if (failed) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-500/5">
        <div className="w-11 h-11 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
          <X size={16} className="text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-[13px] font-semibold truncate">
            {errorTitle || "Üretim başarısız"}
          </p>
          <p className="text-red-400/60 text-[11px] mt-0.5 truncate">
            {errorMessage || "Tekrar deneyebilirsin"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={retrying}
              className="text-[11px] font-semibold text-black bg-white hover:bg-white/90 rounded-full px-3 py-1.5 pressable disabled:opacity-50"
            >
              {retrying ? "..." : "Tekrar"}
            </button>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#555] hover:text-white pressable"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
      <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0">
        {imageHint ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageHint}
            alt=""
            className="w-full h-full object-cover"
            style={{
              filter: "blur(4px) saturate(1.1)",
              transform: "scale(1.15)",
            }}
          />
        ) : (
          <div className="w-full h-full bg-[#1a1a1a]" />
        )}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <Loader2 size={16} className="text-white/70 animate-spin" />
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="h-3 w-32 rounded-full bg-white/[0.06] animate-pulse" />
        <div className="h-2 w-48 max-w-full rounded-full bg-white/[0.04] animate-pulse" />
      </div>
      {onCancel && (
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#555] hover:text-white pressable flex-shrink-0"
          title="İptal"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

interface GenerationRowProps {
  song: Song;
  isPlaying: boolean;
  onPlay: () => void;
  onOpenDetail?: () => void;
  onDelete?: () => void;
  model?: string;
}

export function GenerationRow({
  song,
  isPlaying,
  onPlay,
  onOpenDetail,
}: GenerationRowProps) {
  const subtitle =
    song.style?.split(",")[0]?.trim() || song.prompt?.slice(0, 40) || "";

  return (
    <div
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer active:scale-[0.98]"
      onClick={onOpenDetail}
    >
      <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-[#1a1a1a]">
        {song.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.imageUrl}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1db954]/20 to-[#1a1a1a]" />
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={isPlaying ? "Duraklat" : "Oynat"}
        >
          {isPlaying ? (
            <Pause size={18} className="text-white fill-white" />
          ) : (
            <Play size={18} className="text-white fill-white ml-0.5" />
          )}
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`text-[13px] font-semibold truncate ${isPlaying ? "text-[#1db954]" : "text-white"}`}
        >
          {song.title || "İsimsiz"}
        </p>
        {subtitle && (
          <p className="text-[#555] text-[11px] truncate mt-0.5">{subtitle}</p>
        )}
      </div>

      {song.pronunciationScore != null && song.pronunciationScore > 0 && (
        <span
          className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md flex-shrink-0 ${
            song.pronunciationScore >= 80
              ? "bg-emerald-500/15 text-emerald-400"
              : song.pronunciationScore >= 60
                ? "bg-amber-500/15 text-amber-400"
                : "bg-red-500/15 text-red-400"
          }`}
        >
          {song.pronunciationScore}
        </span>
      )}
    </div>
  );
}
