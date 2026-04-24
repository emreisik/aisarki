"use client";

import { useEffect, useState } from "react";
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
  /** ISO string — processing started time */
  startedAt?: string;
}

/** Tahmini ortalama üretim süresi (saniye). Suno V5 ~90-120s. */
const ESTIMATED_TOTAL_SEC = 120;

function formatElapsed(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function GenerationRowSkeleton({
  imageHint,
  failed,
  errorTitle,
  errorMessage,
  onCancel,
  onRetry,
  retrying,
  startedAt,
}: GenerationRowSkeletonProps) {
  const [elapsed, setElapsed] = useState<number>(() => {
    if (!startedAt) return 0;
    const t = new Date(startedAt).getTime();
    if (!Number.isFinite(t)) return 0;
    return Math.max(0, Math.floor((Date.now() - t) / 1000));
  });

  useEffect(() => {
    if (failed || !startedAt) return;
    const id = setInterval(() => {
      const t = new Date(startedAt).getTime();
      if (!Number.isFinite(t)) return;
      setElapsed(Math.max(0, Math.floor((Date.now() - t) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [failed, startedAt]);

  const progressPct =
    startedAt && !failed
      ? Math.min(98, (elapsed / ESTIMATED_TOTAL_SEC) * 100)
      : 0;
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

  const isLate = elapsed > ESTIMATED_TOTAL_SEC;
  const statusLabel = isLate
    ? "Hâlâ üretiliyor..."
    : elapsed < 15
      ? "Başlatılıyor..."
      : elapsed < 45
        ? "Sözler işleniyor..."
        : "Ses üretiliyor...";

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
        <div className="flex items-center gap-2">
          <span className="text-white text-[12px] font-medium">
            {statusLabel}
          </span>
          {startedAt && (
            <span className="text-[10px] text-[#666] font-mono tabular-nums">
              {formatElapsed(elapsed)}
              {!isLate && ` / ~${formatElapsed(ESTIMATED_TOTAL_SEC)}`}
            </span>
          )}
        </div>
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${
              isLate
                ? "bg-amber-500/60 animate-pulse"
                : "bg-gradient-to-r from-[#295b53] to-[#19b35c]"
            }`}
            style={{ width: `${Math.max(5, progressPct)}%` }}
          />
        </div>
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
