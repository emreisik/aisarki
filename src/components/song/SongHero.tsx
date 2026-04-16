"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Heart,
  Share2,
  Music2,
  UserPlus,
  UserCheck,
  Headphones,
  MessageCircle,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { Song } from "@/types";
import { formatListenerCount } from "@/lib/formatNumber";

interface Props {
  song: Song;
  isActive: boolean;
  playing: boolean;
  onPlay: () => void;
  onShare: () => void;
  copied: boolean;
  liked: boolean;
  likeBusy: boolean;
  onToggleLike: () => void;
  isFollowing: boolean;
  followBusy: boolean;
  onToggleFollow: () => void;
  canFollow: boolean;
  commentCount: number;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Suno tarzı şarkı başlık bloğu: cover + info + stats + aksiyonlar. */
export default function SongHero({
  song,
  isActive,
  playing,
  onPlay,
  onShare,
  copied,
  liked,
  likeBusy,
  onToggleLike,
  isFollowing,
  followBusy,
  onToggleFollow,
  canFollow,
  commentCount,
}: Props) {
  const [showMore, setShowMore] = useState(false);
  const mainStyle = song.style?.split(",")[0]?.trim();
  const promptText = song.prompt?.trim() ?? "";
  const showExpand = promptText.length > 220;
  const promptShown = showMore
    ? promptText
    : promptText.slice(0, 220) + (showExpand ? "…" : "");

  return (
    <div className="flex flex-col md:flex-row gap-5">
      {/* Cover */}
      <div className="w-full md:w-56 aspect-square md:h-56 rounded-xl overflow-hidden shadow-2xl flex-shrink-0 bg-[#282828]">
        {song.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.imageUrl}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={72} className="text-[#535353]" />
          </div>
        )}
      </div>

      {/* Info block */}
      <div className="flex-1 min-w-0">
        <h1 className="text-white text-2xl md:text-3xl font-black leading-tight">
          {song.title}
          {mainStyle && (
            <span className="text-white/60 font-bold"> ({mainStyle})</span>
          )}
        </h1>

        {/* Sanatçı + Follow */}
        {song.creator && (
          <div className="flex items-center gap-3 mt-2">
            <Link
              href={`/profile/${song.creator.username}`}
              className="flex items-center gap-2 group"
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
                  <span className="text-white text-[11px] font-bold">
                    {song.creator.name[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-white text-sm font-semibold group-hover:underline">
                {song.creator.name}
              </span>
            </Link>
            {canFollow && (
              <button
                onClick={onToggleFollow}
                disabled={followBusy}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border transition-all pressable disabled:opacity-50 ${
                  isFollowing
                    ? "border-[#1db954] text-[#1db954] hover:border-white hover:text-white"
                    : "border-white/40 text-white hover:border-white"
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck size={12} /> Takip ediliyor
                  </>
                ) : (
                  <>
                    <UserPlus size={12} /> Takip et
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Prompt / açıklama */}
        {promptText && (
          <p className="text-[#a7a7a7] text-sm mt-3 leading-relaxed whitespace-pre-wrap">
            {promptShown}
            {showExpand && (
              <button
                onClick={() => setShowMore((v) => !v)}
                className="text-[#1db954] font-semibold ml-1 hover:underline"
              >
                {showMore ? "daha az" : "devamını oku"}
              </button>
            )}
          </p>
        )}

        {/* Meta chip'ler */}
        <div className="flex items-center gap-2 mt-3 text-xs text-[#a7a7a7]">
          <span>{fmtDate(song.createdAt)}</span>
          <span className="text-[#535353]">·</span>
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px]">
            Hubeya
          </span>
        </div>

        {/* Stat + aksiyon bar */}
        <div className="flex flex-wrap items-center gap-2 mt-5">
          {/* Like */}
          <button
            onClick={onToggleLike}
            disabled={likeBusy}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border transition-colors pressable ${
              liked
                ? "border-[#1db954] bg-[#1db954]/10 text-[#1db954]"
                : "border-white/15 text-white/80 hover:text-white hover:border-white/30"
            }`}
          >
            <Heart size={15} fill={liked ? "#1db954" : "none"} />
            <span className="tabular-nums">
              {formatListenerCount(song.likeCount ?? 0)}
            </span>
          </button>

          {/* Plays (pasif chip) */}
          {song.playCount != null && song.playCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[#a7a7a7] border border-white/10">
              <Headphones size={15} />
              <span className="tabular-nums">
                {formatListenerCount(song.playCount)}
              </span>
            </span>
          )}

          {/* Comments (pasif chip) */}
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[#a7a7a7] border border-white/10">
            <MessageCircle size={15} />
            <span className="tabular-nums">
              {formatListenerCount(commentCount)}
            </span>
          </span>

          <div className="flex-1" />

          {/* Play */}
          <button
            onClick={onPlay}
            disabled={song.status !== "complete"}
            className="w-12 h-12 rounded-full bg-[#1db954] hover:bg-[#1ed760] flex items-center justify-center pressable hover:scale-105 transition-all shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isActive && playing ? (
              <Pause size={22} fill="black" className="text-black" />
            ) : (
              <Play size={22} fill="black" className="text-black ml-0.5" />
            )}
          </button>

          {/* Share */}
          <button
            onClick={onShare}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#a7a7a7] hover:text-white hover:bg-white/5 transition-colors pressable"
            title="Paylaş"
          >
            {copied ? (
              <Check size={18} className="text-[#1db954]" />
            ) : (
              <Share2 size={18} />
            )}
          </button>

          {/* More (placeholder) */}
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#a7a7a7] hover:text-white hover:bg-white/5 transition-colors pressable"
            title="Daha fazla"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
