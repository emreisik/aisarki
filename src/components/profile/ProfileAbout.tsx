"use client";

import Link from "next/link";
import { UserPlus, Check, Pencil } from "lucide-react";

type Props = {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  genreTags: string[];
  genreTagsAuto: boolean;
  isOwnProfile: boolean;
  isFollowing: boolean;
  onFollow: () => void;
  followLoading?: boolean;
};

export default function ProfileAbout({
  displayName,
  username,
  avatarUrl,
  bio,
  genreTags,
  genreTagsAuto,
  isOwnProfile,
  isFollowing,
  onFollow,
  followLoading,
}: Props) {
  const hasContent = !!bio || genreTags.length > 0 || isOwnProfile;
  if (!hasContent) return null;

  return (
    <section className="mt-10 px-1">
      <h2 className="text-white text-[18px] font-bold mb-4">Hakkında</h2>
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-[20px] p-6 md:p-7 flex flex-col md:flex-row gap-5 md:gap-7">
        <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-4 md:w-[200px] flex-shrink-0">
          <div className="w-20 h-20 md:w-[140px] md:h-[140px] rounded-full overflow-hidden bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-2xl md:text-4xl font-black">
                {displayName[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 md:w-full">
            <p className="text-white text-[18px] md:text-[22px] font-bold truncate">
              {displayName}
            </p>
            <p className="text-[#888] text-[12px] mt-0.5 truncate">
              @{username}
            </p>
            {isOwnProfile ? (
              <Link
                href="/settings/account"
                className="mt-3 h-9 px-4 rounded-full bg-[#2a2a2a] hover:bg-[#333] text-white text-[12px] font-semibold pressable inline-flex items-center gap-1.5 transition-colors"
              >
                <Pencil size={12} />
                Düzenle
              </Link>
            ) : (
              <button
                onClick={onFollow}
                disabled={followLoading}
                className={`mt-3 h-9 px-4 rounded-full text-[12px] font-bold pressable transition-all inline-flex items-center gap-1.5 ${
                  isFollowing
                    ? "bg-[#2a2a2a] text-white hover:bg-[#333]"
                    : "bg-white text-black hover:bg-[#f0f0f0]"
                } disabled:opacity-50`}
              >
                {isFollowing ? <Check size={12} /> : <UserPlus size={12} />}
                {isFollowing ? "Takip ediliyor" : "Takip et"}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {bio ? (
            <p className="text-white/90 text-[14px] leading-relaxed whitespace-pre-wrap">
              {bio}
            </p>
          ) : isOwnProfile ? (
            <p className="text-[#666] text-[13px] italic">
              Bio ekle — dinleyicilerin seni daha iyi tanısın.
            </p>
          ) : null}

          {genreTags.length > 0 && (
            <div>
              {genreTagsAuto && (
                <p className="text-[#666] text-[11px] uppercase tracking-wider mb-2">
                  Şarkılarından türler
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {genreTags.map((g) => (
                  <span
                    key={g}
                    className="px-3.5 py-1.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-white/90 text-[12px] font-medium"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
