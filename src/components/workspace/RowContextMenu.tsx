"use client";

import { useEffect, useRef } from "react";
import {
  RefreshCw,
  MoveRight,
  Shuffle,
  Sparkles,
  ListMusic,
  Download,
  AudioLines,
  Globe,
  Lock,
  FileAudio,
  Scissors,
  SlidersHorizontal,
} from "lucide-react";
import type { Song } from "@/types";

type MenuAction =
  | "studio"
  | "cover"
  | "extend"
  | "mashup"
  | "stems"
  | "sample"
  | "inspiration"
  | "reuse_prompt"
  | "download_mp3"
  | "download_wav"
  | "toggle_visibility";

type Item = {
  id: MenuAction;
  label: string;
  icon: typeof RefreshCw;
  badge?: "NEW" | "PRO";
  enabled: boolean;
};

function buildItems(song: Song): Item[] {
  const canDownload = !!(song.audioUrl || song.streamUrl);
  return [
    {
      id: "studio",
      label: "Stüdyoda Aç",
      icon: SlidersHorizontal,
      badge: "NEW",
      enabled: canDownload,
    },
    { id: "cover", label: "Cover Yap", icon: RefreshCw, enabled: true },
    { id: "extend", label: "Uzat", icon: MoveRight, enabled: true },
    { id: "mashup", label: "Mashup", icon: Shuffle, enabled: true },
    {
      id: "stems",
      label: "Stems Ayır",
      icon: AudioLines,
      badge: "PRO",
      enabled: canDownload,
    },
    {
      id: "sample",
      label: "Örnek Olarak Kullan",
      icon: Scissors,
      enabled: canDownload,
    },
    {
      id: "inspiration",
      label: "İlham Olarak Kullan",
      icon: Sparkles,
      enabled: !!song.style,
    },
    {
      id: "reuse_prompt",
      label: "Promptu Tekrar Kullan",
      icon: ListMusic,
      enabled: !!(song.prompt || song.style),
    },
    {
      id: "download_mp3",
      label: "MP3 İndir",
      icon: Download,
      enabled: canDownload,
    },
    {
      id: "download_wav",
      label: "WAV İndir (HD)",
      icon: FileAudio,
      badge: "PRO",
      enabled: canDownload,
    },
    {
      id: "toggle_visibility",
      label: song.isPublic === false ? "Yayımla" : "Yayından kaldır",
      icon: song.isPublic === false ? Globe : Lock,
      enabled: true,
    },
  ];
}

type Props = {
  anchorRect: DOMRect;
  song: Song;
  onClose: () => void;
  onAction: (id: MenuAction) => void;
};

export default function RowContextMenu({
  anchorRect,
  song,
  onClose,
  onAction,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  const menuWidth = 240;
  const menuHeight = 440;
  const margin = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  let left = anchorRect.right - menuWidth;
  let top = anchorRect.bottom + margin;
  if (top + menuHeight > vh - margin) {
    top = Math.max(margin, anchorRect.top - menuHeight - margin);
  }
  if (left < margin) left = margin;
  if (left + menuWidth > vw - margin) left = vw - margin - menuWidth;

  const items = buildItems(song);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", top, left, width: menuWidth }}
      className="z-[200] bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] py-1.5 shadow-2xl shadow-black/60"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const disabled = !item.enabled;
        return (
          <button
            key={item.id}
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              onAction(item.id);
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors ${
              disabled
                ? "text-[#555] cursor-not-allowed"
                : "text-white hover:bg-[#222]"
            }`}
          >
            <Icon size={14} className="flex-shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge === "NEW" && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#ec4899] text-white">
                YENİ
              </span>
            )}
            {item.badge === "PRO" && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#2a2a2a] text-[#aaa]">
                PRO
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export type { MenuAction };
