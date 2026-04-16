"use client";

import { Loader2, Play, Pause, MoreHorizontal, X } from "lucide-react";
import { Song } from "@/types";

/**
 * Create sayfasındaki birleşik üretim timeline satırı.
 * - Tamamlanmış şarkı → SongCard benzeri görünüm (play/title/style)
 * - Hâlâ üretiliyor → Suno tarzı skeleton (spinner + shimmer çubuklar + v4.5-all tag)
 * - Hata → kırmızı uyarı satırı
 */

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
  model = "v4.5-all",
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
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-red-500/30 bg-red-500/[0.04]">
        <div className="w-12 h-12 rounded-md bg-red-500/10 flex items-center justify-center flex-shrink-0">
          <X size={18} className="text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">
            {errorTitle || "Üretim başarısız"}
          </p>
          <p className="text-red-300/70 text-xs mt-0.5 truncate">
            {errorMessage || "Tekrar deneyebilirsin"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={retrying}
              className="text-xs font-semibold text-white bg-[#7c3aed] hover:bg-[#8b5cf6] rounded-full px-3 py-1.5 pressable disabled:opacity-50"
            >
              {retrying ? "..." : "Tekrar"}
            </button>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#7a7a7a] hover:text-white hover:bg-white/10 pressable"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03] rounded-lg transition-colors">
      {/* Cover — gradient + spinner */}
      <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
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
          <div
            className="w-full h-full"
            style={{
              background:
                "linear-gradient(135deg, #1a3a2a 0%, #0d1f14 50%, #1a1a1a 100%)",
            }}
          />
        )}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <Loader2 size={18} className="text-white/80 animate-spin" />
        </div>
      </div>

      {/* Title + description placeholders */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="h-3 w-40 rounded bg-white/[0.08] animate-pulse" />
        <div className="h-2 w-64 max-w-full rounded bg-white/[0.05] animate-pulse" />
      </div>

      {/* v4.5-all tag */}
      <span className="text-[10px] font-medium text-[#9a9a9a] bg-white/[0.06] rounded px-1.5 py-0.5 border border-white/5 flex-shrink-0">
        {model}
      </span>

      {/* Action area placeholder */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#7a7a7a] hover:text-white hover:bg-white/10 pressable"
            title="İptal"
          >
            <X size={14} />
          </button>
        )}
        <button
          disabled
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#4a4a4a]"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
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
  model = "v4.5-all",
}: GenerationRowProps) {
  const description = song.prompt || song.style || "";

  return (
    <div
      className="group flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] rounded-lg transition-colors cursor-pointer"
      onClick={onOpenDetail}
    >
      {/* Cover + play overlay */}
      <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-[#2a2a2a]">
        {song.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.imageUrl}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background:
                "linear-gradient(135deg, #1db954 0%, #0d1f14 50%, #1a1a1a 100%)",
            }}
          />
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={isPlaying ? "Duraklat" : "Oynat"}
        >
          {isPlaying ? (
            <Pause size={20} className="text-white fill-white" />
          ) : (
            <Play size={20} className="text-white fill-white ml-0.5" />
          )}
        </button>
      </div>

      {/* Title + description */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">
          {song.title || "İsimsiz"}
        </p>
        {description && (
          <p className="text-[#9a9a9a] text-xs truncate mt-0.5">
            {description}
          </p>
        )}
      </div>

      {/* v4.5 tag */}
      <span className="text-[10px] font-medium text-[#9a9a9a] bg-white/[0.06] rounded px-1.5 py-0.5 border border-white/5 flex-shrink-0">
        {model}
      </span>

      <button
        onClick={(e) => e.stopPropagation()}
        className="w-8 h-8 rounded-full flex items-center justify-center text-[#7a7a7a] hover:text-white hover:bg-white/10 pressable flex-shrink-0"
      >
        <MoreHorizontal size={16} />
      </button>
    </div>
  );
}
