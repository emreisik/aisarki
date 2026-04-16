"use client";

import Link from "next/link";
import {
  Play,
  Pause,
  Heart,
  Share2,
  Music2,
  MoreHorizontal,
  Check,
  ArrowLeft,
  Wand2,
  ChevronRight,
} from "lucide-react";
import { Song } from "@/types";
import { formatListenerCount } from "@/lib/formatNumber";

interface Props {
  song: Song;
  isActive: boolean;
  playing: boolean;
  onPlay: () => void;
  onShare: () => void;
  onBack: () => void;
  onRemix: () => void;
  copied: boolean;
  liked: boolean;
  likeBusy: boolean;
  likeCount: number;
  onToggleLike: () => void;
  isFollowing: boolean;
  followBusy: boolean;
  onToggleFollow: () => void;
  canFollow: boolean;
  commentCount: number;
  rgb: string;
}

function fmtDuration(s?: number) {
  if (!s || isNaN(s)) return "";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function fmtYear(iso: string) {
  return new Date(iso).getFullYear().toString();
}

export default function SongHero({
  song,
  isActive,
  playing,
  onPlay,
  onShare,
  onBack,
  onRemix,
  copied,
  liked,
  likeBusy,
  likeCount,
  onToggleLike,
  isFollowing,
  followBusy,
  onToggleFollow,
  canFollow,
  commentCount,
  rgb,
}: Props) {
  const mainStyle = song.style?.split(",")[0]?.trim();

  return (
    <div>
      {/* ── Geri butonu ── */}
      <button
        onClick={onBack}
        className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white pressable active:scale-95 mb-4"
      >
        <ArrowLeft size={18} />
      </button>

      {/* ── Kapak resmi — ortada, büyük ── */}
      <div className="flex justify-center">
        <div className="w-[240px] h-[240px] rounded-lg overflow-hidden shadow-2xl bg-[#1a1a1a]">
          {song.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={song.imageUrl}
              alt={song.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music2 size={64} className="text-[#333]" />
            </div>
          )}
        </div>
      </div>

      {/* ── Şarkı bilgileri ── */}
      <div className="mt-6">
        <h1 className="text-white text-[22px] font-black leading-tight">
          {song.title}
        </h1>

        {/* Sanatçı — avatar + isim (tıklanabilir) */}
        {song.creator && (
          <Link
            href={`/profile/${song.creator.username}`}
            className="flex items-center gap-2 mt-2 group"
          >
            <div className="w-6 h-6 rounded-full bg-[#282828] overflow-hidden flex items-center justify-center flex-shrink-0">
              {song.creator.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={song.creator.image}
                  alt={song.creator.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-[10px] font-bold">
                  {song.creator.name[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-white text-[13px] font-semibold group-hover:underline">
              {song.creator.name}
            </span>
          </Link>
        )}

        {/* Meta: Tarz • Yıl • Süre */}
        <p className="text-[#888] text-[13px] mt-1.5">
          {[mainStyle, fmtYear(song.createdAt), fmtDuration(song.duration)]
            .filter(Boolean)
            .join(" \u00b7 ")}
        </p>
      </div>

      {/* ── Aksiyon bar — Spotify layout ── */}
      <div className="flex items-center mt-5">
        {/* Sol: like + share + remix + more */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleLike}
            disabled={likeBusy}
            className={`w-10 h-10 rounded-full flex items-center justify-center pressable active:scale-95 transition-all ${
              liked ? "text-[#1db954]" : "text-[#a7a7a7] hover:text-white"
            }`}
          >
            <Heart size={22} fill={liked ? "#1db954" : "none"} />
          </button>

          <button
            onClick={onShare}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#a7a7a7] hover:text-white pressable active:scale-95 transition-colors"
          >
            {copied ? (
              <Check size={18} className="text-[#1db954]" />
            ) : (
              <Share2 size={18} />
            )}
          </button>

          <button
            onClick={onRemix}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#a7a7a7] hover:text-white pressable active:scale-95 transition-colors"
            title="Remix Yap"
          >
            <Wand2 size={18} />
          </button>

          <button className="w-10 h-10 rounded-full flex items-center justify-center text-[#a7a7a7] hover:text-white pressable active:scale-95 transition-colors">
            <MoreHorizontal size={22} />
          </button>
        </div>

        {/* Sağ: play butonu */}
        <div className="ml-auto">
          <button
            onClick={onPlay}
            disabled={song.status !== "complete"}
            className="w-12 h-12 rounded-full bg-[#1db954] flex items-center justify-center pressable active:scale-95 transition-transform shadow-lg disabled:opacity-30"
          >
            {isActive && playing ? (
              <Pause size={22} fill="black" className="text-black" />
            ) : (
              <Play size={22} fill="black" className="text-black ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* ── Sanatçı kartı — tıklanabilir ── */}
      {song.creator && (
        <Link
          href={`/profile/${song.creator.username}`}
          className="flex items-center gap-3 mt-8 p-3 rounded-xl bg-[#161616] hover:bg-[#1a1a1a] pressable active:scale-[0.98] transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-[#282828] overflow-hidden flex items-center justify-center flex-shrink-0">
            {song.creator.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={song.creator.image}
                alt={song.creator.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-lg font-black">
                {song.creator.name[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-[#888] font-semibold uppercase tracking-wider">
              Sanatçı
            </p>
            <p className="text-white text-[15px] font-semibold truncate">
              {song.creator.name}
            </p>
          </div>
          <ChevronRight
            size={18}
            className="text-[#555] flex-shrink-0 group-hover:text-white transition-colors"
          />
        </Link>
      )}

      {/* ── İstatistikler ── */}
      {(song.playCount || likeCount > 0) && (
        <div className="flex items-center gap-4 mt-4 text-[#888] text-xs">
          {song.playCount != null && song.playCount > 0 && (
            <span className="tabular-nums">
              {formatListenerCount(song.playCount)} dinlenme
            </span>
          )}
          {likeCount > 0 && (
            <span className="tabular-nums">
              {formatListenerCount(likeCount)} beğeni
            </span>
          )}
        </div>
      )}
    </div>
  );
}
