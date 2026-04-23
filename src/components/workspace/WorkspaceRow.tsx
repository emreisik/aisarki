"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  ThumbsUp,
  ThumbsDown,
  Share2,
  MoreHorizontal,
  Upload as UploadIcon,
  Music2,
  ChevronDown,
} from "lucide-react";
import type { Song } from "@/types";
import RowContextMenu, { type MenuAction } from "./RowContextMenu";

type Props = {
  song: Song;
  isPlaying: boolean;
  onPlay: () => void;
  onOpenDetail: () => void;
  onLike?: () => void;
  onDislike?: () => void;
  onShare?: () => void;
  onAction: (id: MenuAction, song: Song) => void;
};

function formatDuration(sec?: number | null): string {
  if (!sec || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function modelLabel(model?: string | null): string | null {
  if (!model) return null;
  const m = model.toUpperCase();
  if (m.includes("V5_5")) return "v5.5";
  if (m === "V5") return "v5";
  if (m.includes("V4_5ALL")) return "v4.5-all";
  if (m.includes("V4_5PLUS")) return "v4.5+";
  if (m.includes("V4_5")) return "v4.5";
  if (m === "V4") return "v4";
  return m.toLowerCase();
}

export default function WorkspaceRow({
  song,
  isPlaying,
  onPlay,
  onOpenDetail,
  onLike,
  onDislike,
  onShare,
  onAction,
}: Props) {
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const extra = song as unknown as {
    model?: string;
    isCover?: boolean;
    isUpload?: boolean;
    sourceType?: string;
  };
  const duration = formatDuration(song.duration);
  const model = modelLabel(extra.model);
  const isCover = Boolean(extra.isCover || extra.sourceType === "cover");
  const isUpload = Boolean(
    extra.isUpload ||
    extra.sourceType === "upload" ||
    extra.sourceType === "upload-extend",
  );

  return (
    <div className="group relative flex gap-3 py-3 px-2 -mx-2 rounded-[12px] hover:bg-[#111] transition-colors">
      {/* Thumbnail */}
      <button
        onClick={onPlay}
        className="relative w-16 h-16 rounded-[8px] overflow-hidden flex-shrink-0 bg-[#1a1a1a] group/thumb"
      >
        {song.imageUrl ? (
          <Image
            src={song.imageUrl}
            alt={song.title || "Song"}
            width={64}
            height={64}
            unoptimized
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={20} className="text-[#555]" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/50 transition-colors flex items-center justify-center">
          {isPlaying ? (
            <Pause
              size={22}
              className="text-white opacity-0 group-hover/thumb:opacity-100"
              fill="white"
            />
          ) : (
            <Play
              size={22}
              className="text-white opacity-0 group-hover/thumb:opacity-100"
              fill="white"
            />
          )}
        </div>
        {duration && (
          <div className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white px-1 rounded font-medium">
            {duration}
          </div>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenDetail}
            className="text-white text-[15px] font-semibold truncate hover:underline decoration-[#555] underline-offset-2 max-w-full"
          >
            {song.title || "İsimsiz"}
          </button>
          {model && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#1f1f1f] text-[#aaa]">
              {model}
            </span>
          )}
          {isCover && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#1f1f1f] text-[#aaa]">
              Cover
            </span>
          )}
          {isUpload && (
            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#1f1f1f] text-[#aaa]">
              <UploadIcon size={9} />
              Yükleme
            </span>
          )}
        </div>
        <p className="text-[#888] text-[12.5px] line-clamp-1 mt-0.5">
          {song.style || "—"}
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <button
            onClick={onLike}
            className="w-8 h-8 rounded-full hover:bg-[#222] flex items-center justify-center text-[#888] hover:text-white transition-colors"
          >
            <ThumbsUp size={13} />
          </button>
          <button
            onClick={onDislike}
            className="w-8 h-8 rounded-full hover:bg-[#222] flex items-center justify-center text-[#888] hover:text-white transition-colors"
          >
            <ThumbsDown size={13} />
          </button>
          <button
            onClick={onShare}
            className="w-8 h-8 rounded-full hover:bg-[#222] flex items-center justify-center text-[#888] hover:text-white transition-colors"
          >
            <Share2 size={13} />
          </button>
        </div>
      </div>

      {/* Remix/Edit + menu */}
      <div className="flex items-center gap-1 self-start opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onAction("editor", song)}
          className="h-9 px-3 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] flex items-center gap-1.5 text-white text-[12px] font-medium transition-colors"
        >
          Remix/Düzenle
          <ChevronDown size={12} />
        </button>
        <button
          ref={menuBtnRef}
          onClick={() => {
            const r = menuBtnRef.current?.getBoundingClientRect();
            if (r) setMenuAnchor(r);
          }}
          className="w-9 h-9 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] flex items-center justify-center transition-colors"
        >
          <MoreHorizontal size={14} className="text-white" />
        </button>
      </div>

      {menuAnchor && (
        <RowContextMenu
          anchorRect={menuAnchor}
          onClose={() => setMenuAnchor(null)}
          onAction={(id) => onAction(id, song)}
        />
      )}
    </div>
  );
}
