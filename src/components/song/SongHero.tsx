"use client";

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
  ArrowLeft,
  Wand2,
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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
      {/* Album art — full-width, immersive */}
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#282828]">
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

        {/* Gradient overlay — alt kısımda dominant renge fade */}
        <div
          className="absolute inset-x-0 bottom-0 h-2/5"
          style={{
            background: `linear-gradient(to top, rgb(${rgb}), transparent)`,
          }}
        />

        {/* Floating back button */}
        <button
          onClick={onBack}
          className="absolute left-4 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white pressable hover:bg-black/60 transition-colors"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
        >
          <ArrowLeft size={20} />
        </button>

        {/* Floating share button */}
        <button
          onClick={onShare}
          className="absolute right-4 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white pressable hover:bg-black/60 transition-colors"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
        >
          {copied ? (
            <Check size={18} className="text-[#1db954]" />
          ) : (
            <Share2 size={18} />
          )}
        </button>
      </div>

      {/* Song info */}
      <div className="mt-5">
        <h1 className="text-white text-2xl font-black leading-tight">
          {song.title}
        </h1>

        {/* Sanatçı + Follow */}
        {song.creator && (
          <div className="flex items-center gap-3 mt-2.5">
            <Link
              href={`/profile/${song.creator.username}`}
              className="flex items-center gap-2 group"
            >
              <div className="w-7 h-7 rounded-full bg-[#282828] overflow-hidden flex items-center justify-center flex-shrink-0">
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

        {/* Tarz + tarih */}
        <div className="flex items-center gap-2 mt-3 text-xs text-[#a7a7a7]">
          {mainStyle && (
            <>
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold">
                {mainStyle}
              </span>
              <span className="text-[#535353]">·</span>
            </>
          )}
          <span>{fmtDate(song.createdAt)}</span>
        </div>
      </div>

      {/* Aksiyon çubuğu */}
      <div className="flex items-center gap-2 mt-5">
        {/* Play */}
        <button
          onClick={onPlay}
          disabled={song.status !== "complete"}
          className="w-14 h-14 rounded-full bg-[#1db954] hover:bg-[#1ed760] flex items-center justify-center pressable hover:scale-105 transition-all shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isActive && playing ? (
            <Pause size={24} fill="black" className="text-black" />
          ) : (
            <Play size={24} fill="black" className="text-black ml-0.5" />
          )}
        </button>

        {/* Like */}
        <button
          onClick={onToggleLike}
          disabled={likeBusy}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors pressable ${
            liked
              ? "text-[#1db954]"
              : "text-white/70 hover:text-white hover:bg-white/5"
          }`}
        >
          <Heart size={22} fill={liked ? "#1db954" : "none"} />
        </button>

        {/* Remix */}
        <button
          onClick={onRemix}
          className="w-11 h-11 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-colors pressable"
          title="Remix Yap"
        >
          <Wand2 size={20} />
        </button>

        <div className="flex-1" />

        {/* More */}
        <button
          className="w-11 h-11 rounded-full flex items-center justify-center text-[#a7a7a7] hover:text-white hover:bg-white/5 transition-colors pressable"
          title="Daha fazla"
        >
          <MoreHorizontal size={22} />
        </button>
      </div>

      {/* Stats satırı */}
      <div className="flex items-center gap-4 mt-3 text-[#a7a7a7] text-xs">
        {song.playCount != null && song.playCount > 0 && (
          <span className="flex items-center gap-1.5">
            <Headphones size={14} />
            <span className="tabular-nums">
              {formatListenerCount(song.playCount)} dinlenme
            </span>
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Heart size={14} />
          <span className="tabular-nums">
            {formatListenerCount(likeCount)} beğeni
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle size={14} />
          <span className="tabular-nums">
            {formatListenerCount(commentCount)} yorum
          </span>
        </span>
      </div>
    </div>
  );
}
