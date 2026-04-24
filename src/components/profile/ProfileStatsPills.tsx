"use client";

import { Music2, Users, UserCheck, Repeat } from "lucide-react";

export type CircleTab = "followers" | "following" | "remixes";

type Props = {
  songCount: number;
  followerCount: number;
  followingCount: number;
  remixesInspiredCount: number;
  onOpenCircle: (tab: CircleTab) => void;
};

function formatCount(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export default function ProfileStatsPills({
  songCount,
  followerCount,
  followingCount,
  remixesInspiredCount,
  onOpenCircle,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Pill icon={Music2} label={`${formatCount(songCount)} şarkı`} />
      <Pill
        icon={Users}
        label={`${formatCount(followerCount)} takipçi`}
        onClick={() => onOpenCircle("followers")}
      />
      <Pill
        icon={UserCheck}
        label={`${formatCount(followingCount)} takip`}
        onClick={() => onOpenCircle("following")}
      />
      <Pill
        icon={Repeat}
        label={`${formatCount(remixesInspiredCount)} remix`}
        onClick={() => onOpenCircle("remixes")}
      />
    </div>
  );
}

function Pill({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Music2;
  label: string;
  onClick?: () => void;
}) {
  const clickable = !!onClick;
  return (
    <button
      onClick={onClick}
      disabled={!clickable}
      className={`h-9 px-4 rounded-full border border-[#2a2a2a] flex items-center gap-2 text-[13px] text-white font-medium ${
        clickable
          ? "hover:bg-[#1a1a1a] pressable cursor-pointer"
          : "cursor-default opacity-90"
      } transition-colors`}
    >
      <Icon size={13} className="text-[#bbb]" />
      <span className="tabular-nums">{label}</span>
    </button>
  );
}
