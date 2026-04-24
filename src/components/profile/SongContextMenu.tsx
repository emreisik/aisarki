"use client";

import { useEffect, useRef, useState } from "react";
import {
  MoreHorizontal,
  Sparkles,
  Music2,
  ListPlus,
  Library,
  Share2,
  Flag,
  ChevronRight,
  Loader2,
  Check,
  Plus,
} from "lucide-react";
import type { Song, Playlist } from "@/types";
import { useRouter } from "next/navigation";

export type SongMenuAction =
  | { type: "remix" }
  | { type: "create" }
  | { type: "add_to_queue" }
  | { type: "add_to_playlist"; playlistId: string }
  | { type: "share" }
  | { type: "report" };

type Props = {
  song: Song;
  onAction: (action: SongMenuAction) => void;
  variant?: "card" | "row";
};

type Submenu = "playlist" | null;

export default function SongContextMenu({
  song,
  onAction,
  variant = "card",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<Submenu>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPl, setLoadingPl] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setSubmenu(null);
      setAddedTo(new Set());
      return;
    }
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (submenu) setSubmenu(null);
        else setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, submenu]);

  const openPlaylistSubmenu = async () => {
    setSubmenu("playlist");
    if (playlists.length > 0) return;
    setLoadingPl(true);
    try {
      const res = await fetch("/api/playlists");
      const d = await res.json();
      setPlaylists(d.playlists ?? []);
    } catch {
      /* sessiz */
    } finally {
      setLoadingPl(false);
    }
  };

  const addToPlaylist = async (pl: Playlist) => {
    setAdding(pl.id);
    try {
      const res = await fetch(`/api/playlists/${pl.id}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: song.id }),
      });
      if (res.ok) {
        setAddedTo((s) => new Set(s).add(pl.id));
        onAction({ type: "add_to_playlist", playlistId: pl.id });
      }
    } finally {
      setAdding(null);
    }
  };

  const triggerClass =
    variant === "card"
      ? "w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center"
      : "w-8 h-8 rounded-full hover:bg-[#222] flex items-center justify-center";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className={`${triggerClass} text-white pressable transition-colors`}
        aria-label="Şarkı menüsü"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-[36px] right-0 bg-[#1c1c1c] border border-[#2a2a2a] rounded-[14px] py-2 shadow-2xl shadow-black/70 z-[60] min-w-[220px]"
        >
          {submenu === "playlist" ? (
            <>
              <button
                onClick={() => setSubmenu(null)}
                className="flex items-center gap-2 px-3 pb-2 mb-1 border-b border-[#2a2a2a] w-full text-left text-[#888] hover:text-white text-[12px] font-medium"
              >
                <ChevronRight size={12} className="rotate-180" />
                Geri
              </button>

              <div className="max-h-[260px] overflow-y-auto scroll-area">
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push("/playlists?create=1");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[#1ed760] hover:bg-[#262626] transition-colors pressable"
                >
                  <Plus size={14} />
                  <span className="text-[13px] font-semibold">
                    Yeni çalma listesi
                  </span>
                </button>
                {loadingPl ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={14} className="animate-spin text-[#555]" />
                  </div>
                ) : playlists.length === 0 ? (
                  <p className="text-[#666] text-[12px] text-center py-4 px-4">
                    Henüz çalma listen yok
                  </p>
                ) : (
                  playlists.map((pl) => {
                    const added = addedTo.has(pl.id);
                    return (
                      <button
                        key={pl.id}
                        onClick={() => addToPlaylist(pl)}
                        disabled={added || adding === pl.id}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[#bbb] hover:text-white hover:bg-[#262626] transition-colors pressable disabled:opacity-60"
                      >
                        <span className="flex-1 text-left text-[13px] truncate">
                          {pl.title}
                        </span>
                        {adding === pl.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : added ? (
                          <Check size={14} className="text-[#1ed760]" />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <>
              <MenuItem
                icon={Sparkles}
                label="Remix / Düzenle"
                onClick={() => {
                  setOpen(false);
                  onAction({ type: "remix" });
                }}
              />
              <MenuItem
                icon={Music2}
                label="Bu şarkı gibi yap"
                onClick={() => {
                  setOpen(false);
                  onAction({ type: "create" });
                }}
              />
              <MenuItem
                icon={ListPlus}
                label="Sıraya ekle"
                onClick={() => {
                  setOpen(false);
                  onAction({ type: "add_to_queue" });
                }}
              />
              <MenuItem
                icon={Library}
                label="Çalma listesine ekle"
                hasSubmenu
                onClick={openPlaylistSubmenu}
              />
              <MenuItem
                icon={Share2}
                label="Paylaş"
                onClick={() => {
                  setOpen(false);
                  onAction({ type: "share" });
                }}
              />
              <div className="my-1 mx-3 h-px bg-[#2a2a2a]" />
              <MenuItem
                icon={Flag}
                label="Raporla"
                danger
                onClick={() => {
                  setOpen(false);
                  onAction({ type: "report" });
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
  hasSubmenu,
  danger,
}: {
  icon: typeof Sparkles;
  label: string;
  onClick: () => void;
  hasSubmenu?: boolean;
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
      <Icon size={15} className="opacity-80 flex-shrink-0" />
      <span className="text-[13px] font-medium flex-1">{label}</span>
      {hasSubmenu && <ChevronRight size={13} className="opacity-70" />}
    </button>
  );
}
