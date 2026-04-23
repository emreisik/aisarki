"use client";

import { useEffect, useRef } from "react";
import {
  ArrowUpRight,
  SlidersHorizontal,
  RefreshCw,
  MoveRight,
  Shuffle,
  AudioLines,
  Sparkles,
  Gauge,
  ListMusic,
  Scissors,
  LayoutPanelTop,
} from "lucide-react";

type MenuAction =
  | "studio"
  | "editor"
  | "cover"
  | "extend"
  | "mashup"
  | "sample"
  | "inspiration"
  | "speed"
  | "reuse_prompt"
  | "crop"
  | "replace_section";

type Item = {
  id: MenuAction;
  label: string;
  icon: typeof ArrowUpRight;
  badge?: "NEW" | "PRO";
  enabled: boolean;
};

const ITEMS: Item[] = [
  {
    id: "studio",
    label: "Stüdyoda Aç",
    icon: ArrowUpRight,
    badge: "NEW",
    enabled: false,
  },
  {
    id: "editor",
    label: "Editörde Aç",
    icon: SlidersHorizontal,
    badge: "PRO",
    enabled: false,
  },
  { id: "cover", label: "Cover Yap", icon: RefreshCw, enabled: true },
  { id: "extend", label: "Uzat", icon: MoveRight, enabled: true },
  { id: "mashup", label: "Mashup", icon: Shuffle, enabled: true },
  {
    id: "sample",
    label: "Bu Şarkıyı Örnekle",
    icon: AudioLines,
    enabled: false,
  },
  {
    id: "inspiration",
    label: "İlham Olarak Kullan",
    icon: Sparkles,
    badge: "PRO",
    enabled: false,
  },
  { id: "speed", label: "Hızı Ayarla", icon: Gauge, enabled: false },
  {
    id: "reuse_prompt",
    label: "Promptu Tekrar Kullan",
    icon: ListMusic,
    enabled: true,
  },
  { id: "crop", label: "Kırp", icon: Scissors, enabled: false },
  {
    id: "replace_section",
    label: "Bölümü Değiştir",
    icon: LayoutPanelTop,
    badge: "PRO",
    enabled: false,
  },
];

type Props = {
  anchorRect: DOMRect;
  onClose: () => void;
  onAction: (id: MenuAction) => void;
};

export default function RowContextMenu({
  anchorRect,
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
  const menuHeight = 460;
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

  return (
    <div
      ref={ref}
      style={{ position: "fixed", top, left, width: menuWidth }}
      className="z-[200] bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] py-1.5 shadow-2xl shadow-black/60"
    >
      {ITEMS.map((item) => {
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
