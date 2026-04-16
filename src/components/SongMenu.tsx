"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Share2, User2, Info, Trash2, MoreHorizontal } from "lucide-react";
import { Song } from "@/types";

interface SongMenuProps {
  song: Song;
  onDelete?: (song: Song) => void;
  /** Etrafta koyu background varsa menu butonunun görünürlüğü için. */
  iconClassName?: string;
  /** Buton boyutu — ikon boyutu 16 veya 18. */
  iconSize?: number;
}

/**
 * Paylaşılmış ⋯ menu. Her yerde aynı aksiyon seti:
 * Detay, Sanatçı profili, Paylaş (link kopyala), Sil (sahibi ise).
 */
export default function SongMenu({
  song,
  onDelete,
  iconClassName = "text-[#a7a7a7] hover:text-white",
  iconSize = 18,
}: SongMenuProps) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const stop = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const openDetail = (e: React.MouseEvent) => {
    stop(e);
    setOpen(false);
    router.push(`/song/${song.id}`);
  };

  const openProfile = (e: React.MouseEvent) => {
    stop(e);
    setOpen(false);
    if (song.creator?.username) {
      router.push(`/profile/${song.creator.username}`);
    }
  };

  const share = async (e: React.MouseEvent) => {
    stop(e);
    setOpen(false);
    const url = `${window.location.origin}/song/${song.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: song.title,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setToast("Link kopyalandı");
      }
    } catch {
      /* iptal edildi */
    }
  };

  const del = (e: React.MouseEvent) => {
    stop(e);
    setOpen(false);
    if (onDelete && confirm(`"${song.title}" şarkısı silinsin mi?`)) {
      onDelete(song);
    }
  };

  return (
    <div ref={ref} className="relative" onClick={stop}>
      <button
        type="button"
        onClick={(e) => {
          stop(e);
          setOpen((v) => !v);
        }}
        aria-label="Daha fazla"
        className={`p-1.5 rounded-full transition-colors ${iconClassName}`}
      >
        <MoreHorizontal size={iconSize} />
      </button>

      {open && (
        <div
          className="absolute right-0 bottom-full mb-2 w-48 bg-[#1f1f1f] border border-[#2a2a2a] rounded-xl shadow-xl py-1 z-50"
          role="menu"
        >
          <MenuItem
            icon={<Info size={15} />}
            label="Detay"
            onClick={openDetail}
          />
          {song.creator?.username && (
            <MenuItem
              icon={<User2 size={15} />}
              label="Sanatçı profili"
              onClick={openProfile}
            />
          )}
          <MenuItem
            icon={<Share2 size={15} />}
            label="Paylaş"
            onClick={share}
          />
          {onDelete && (
            <>
              <div className="my-1 h-px bg-[#2a2a2a]" />
              <MenuItem
                icon={<Trash2 size={15} />}
                label="Sil"
                onClick={del}
                danger
              />
            </>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-white text-black text-sm font-semibold px-4 py-2 rounded-full shadow-lg pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "text-white hover:bg-[#2a2a2a]"
      }`}
    >
      <span className="w-4 h-4 flex items-center justify-center opacity-80">
        {icon}
      </span>
      {label}
    </button>
  );
}
