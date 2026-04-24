"use client";

import { Play, Pause, UserPlus, Check } from "lucide-react";
import { useHeroColor } from "@/hooks/useHeroColor";

type Props = {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  totalPlays: number;
  totalLikes: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
  isPlayingAll: boolean;
  canPlay: boolean;
  onFollow: () => void;
  onPlayAll: () => void;
  followLoading?: boolean;
};

function formatCount(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export default function ProfileHero({
  displayName,
  username,
  avatarUrl,
  bannerUrl,
  totalPlays,
  totalLikes,
  isFollowing,
  isOwnProfile,
  isPlayingAll,
  canPlay,
  onFollow,
  onPlayAll,
  followLoading,
}: Props) {
  const rgb = useHeroColor(bannerUrl, avatarUrl);

  return (
    <div className="relative">
      <div
        className="relative w-full h-[280px] md:h-[340px] rounded-[18px] overflow-hidden"
        style={{
          background: bannerUrl
            ? undefined
            : `linear-gradient(135deg, rgb(${rgb}) 0%, rgba(${rgb},0.55) 50%, rgba(${rgb},0.25) 100%)`,
        }}
      >
        {bannerUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
          </>
        )}

        {/* Bottom info overlay */}
        <div className="absolute left-0 right-0 bottom-0 p-5 md:p-7 flex items-end gap-4 md:gap-5">
          <div className="w-[96px] h-[96px] md:w-[128px] md:h-[128px] rounded-full overflow-hidden shadow-2xl flex-shrink-0 bg-[#1a1a1a] flex items-center justify-center ring-2 ring-black/20">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-3xl md:text-5xl font-black">
                {displayName[0]?.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-white text-[28px] md:text-[40px] font-black leading-none truncate drop-shadow">
              {displayName}
            </h1>
            <p className="text-white/80 text-[13px] md:text-[14px] font-medium mt-1.5">
              @{username}
            </p>
            <div className="flex items-center gap-3 mt-2 text-white/85 text-[13px] md:text-[14px]">
              <span className="flex items-center gap-1 tabular-nums">
                <Play size={11} fill="currentColor" className="opacity-80" />
                {formatCount(totalPlays)}
              </span>
              <span className="flex items-center gap-1 tabular-nums">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="opacity-80"
                >
                  <path d="M14 9V5a3 3 0 0 0-6 0v4H5v12h14V9h-5zm-4-4a1 1 0 0 1 2 0v4h-2V5z" />
                </svg>
                {formatCount(totalLikes)}
              </span>
            </div>
          </div>

          {/* Sağ taraf aksiyonları — desktop */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            {!isOwnProfile && (
              <button
                onClick={onFollow}
                disabled={followLoading}
                className={`h-11 px-5 rounded-full text-[14px] font-bold flex items-center gap-2 pressable active:scale-95 transition-all ${
                  isFollowing
                    ? "bg-[#222] text-white hover:bg-[#2a2a2a]"
                    : "bg-white text-black hover:bg-[#f0f0f0]"
                } disabled:opacity-50`}
              >
                {isFollowing ? <Check size={15} /> : <UserPlus size={15} />}
                {isFollowing ? "Takip ediliyor" : "Takip et"}
              </button>
            )}
            <button
              onClick={onPlayAll}
              disabled={!canPlay}
              className="w-14 h-14 rounded-full bg-white hover:bg-[#f0f0f0] flex items-center justify-center shadow-xl pressable active:scale-95 transition-transform disabled:opacity-40"
              aria-label={isPlayingAll ? "Duraklat" : "Hepsini çal"}
            >
              {isPlayingAll ? (
                <Pause size={22} fill="black" className="text-black" />
              ) : (
                <Play size={22} fill="black" className="text-black ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobil aksiyon satırı — hero'nun dışında */}
      <div className="md:hidden flex items-center gap-2 mt-3 px-1">
        {!isOwnProfile && (
          <button
            onClick={onFollow}
            disabled={followLoading}
            className={`flex-1 h-11 rounded-full text-[14px] font-bold flex items-center justify-center gap-1.5 pressable active:scale-95 transition-all ${
              isFollowing ? "bg-[#222] text-white" : "bg-white text-black"
            } disabled:opacity-50`}
          >
            {isFollowing ? <Check size={15} /> : <UserPlus size={15} />}
            {isFollowing ? "Takip ediliyor" : "Takip et"}
          </button>
        )}
        <button
          onClick={onPlayAll}
          disabled={!canPlay}
          className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-xl pressable active:scale-95 disabled:opacity-40"
          aria-label={isPlayingAll ? "Duraklat" : "Hepsini çal"}
        >
          {isPlayingAll ? (
            <Pause size={20} fill="black" className="text-black" />
          ) : (
            <Play size={20} fill="black" className="text-black ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
}
