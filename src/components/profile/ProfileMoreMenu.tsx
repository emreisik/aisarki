"use client";

import { useEffect, useRef, useState } from "react";
import {
  MoreHorizontal,
  Share2,
  ShieldOff,
  ShieldCheck,
  EyeOff,
  Flag,
} from "lucide-react";

type Props = {
  onShare: () => void;
  onToggleBlock: () => void;
  onHide: () => void;
  onReport: () => void;
  isBlocked: boolean;
  isOwnProfile: boolean;
};

export default function ProfileMoreMenu({
  onShare,
  onToggleBlock,
  onHide,
  onReport,
  isBlocked,
  isOwnProfile,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-full border border-[#2a2a2a] hover:bg-[#1a1a1a] flex items-center justify-center pressable transition-colors"
        aria-label="Daha fazla"
      >
        <MoreHorizontal size={18} className="text-white" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-[48px] right-0 bg-[#1c1c1c] border border-[#2a2a2a] rounded-[14px] py-2 shadow-2xl shadow-black/70 z-50 min-w-[200px]"
        >
          <MenuItem
            icon={Share2}
            label="Paylaş..."
            onClick={() => {
              setOpen(false);
              onShare();
            }}
          />
          {!isOwnProfile && (
            <>
              <MenuItem
                icon={isBlocked ? ShieldCheck : ShieldOff}
                label={isBlocked ? "Engeli kaldır" : "Engelle"}
                danger={!isBlocked}
                onClick={() => {
                  setOpen(false);
                  onToggleBlock();
                }}
              />
              <MenuItem
                icon={EyeOff}
                label="Feed'den gizle"
                onClick={() => {
                  setOpen(false);
                  onHide();
                }}
              />
              <div className="my-1 mx-3 h-px bg-[#2a2a2a]" />
              <MenuItem
                icon={Flag}
                label="Raporla"
                danger
                onClick={() => {
                  setOpen(false);
                  onReport();
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Share2;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left pressable ${
        danger
          ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
          : "text-[#bbb] hover:text-white hover:bg-[#262626]"
      }`}
    >
      <Icon size={15} className="opacity-80" />
      <span className="text-[13px] font-medium">{label}</span>
    </button>
  );
}
