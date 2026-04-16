"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Share2,
  User2,
  Info,
  Trash2,
  MoreHorizontal,
  ListPlus,
  ChevronLeft,
  Plus,
  Check,
  Loader2,
} from "lucide-react";
import { Song, Playlist } from "@/types";

interface SongMenuProps {
  song: Song;
  onDelete?: (song: Song) => void;
  iconClassName?: string;
  iconSize?: number;
}

type View = "main" | "playlists";

export default function SongMenu({
  song,
  onDelete,
  iconClassName = "text-[#a7a7a7] hover:text-white",
  iconSize = 18,
}: SongMenuProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("main");
  const [toast, setToast] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPl, setLoadingPl] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (!open) {
      setTimeout(() => setView("main"), 200);
      return;
    }
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

  const close = () => setOpen(false);

  const openDetail = (e: React.MouseEvent) => {
    stop(e);
    close();
    router.push(`/song/${song.id}`);
  };

  const openProfile = (e: React.MouseEvent) => {
    stop(e);
    close();
    if (song.creator?.username) {
      router.push(`/profile/${song.creator.username}`);
    }
  };

  const share = async (e: React.MouseEvent) => {
    stop(e);
    close();
    const url = `${window.location.origin}/song/${song.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: song.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast("Link kopyalandı");
      }
    } catch {
      /* iptal */
    }
  };

  const del = (e: React.MouseEvent) => {
    stop(e);
    close();
    if (onDelete && confirm(`"${song.title}" şarkısı silinsin mi?`)) {
      onDelete(song);
    }
  };

  const openPlaylistView = async (e: React.MouseEvent) => {
    stop(e);
    setView("playlists");
    if (playlists.length > 0) return;
    setLoadingPl(true);
    try {
      const res = await fetch("/api/playlists");
      const d = await res.json();
      setPlaylists(d.playlists ?? []);
    } catch {
      /* */
    } finally {
      setLoadingPl(false);
    }
  };

  const addToPlaylist = async (e: React.MouseEvent, playlistId: string) => {
    stop(e);
    if (addingTo) return;
    setAddingTo(playlistId);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: song.id }),
      });
      if (res.ok) {
        setAddedTo((prev) => new Set(prev).add(playlistId));
        setToast("Playlist'e eklendi");
      }
    } catch {
      /* */
    } finally {
      setAddingTo(null);
    }
  };

  const createAndAdd = async (e: React.MouseEvent) => {
    stop(e);
    const title = newTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const d = await res.json();
      if (d.playlist) {
        setPlaylists((prev) => [d.playlist, ...prev]);
        setNewTitle("");
        await fetch(`/api/playlists/${d.playlist.id}/songs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId: song.id }),
        });
        setAddedTo((prev) => new Set(prev).add(d.playlist.id));
        setToast("Yeni playlist oluşturulup eklendi");
      }
    } catch {
      /* */
    } finally {
      setCreating(false);
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
          className="absolute right-0 bottom-full mb-2 w-56 bg-[#1f1f1f] border border-[#2a2a2a] rounded-xl shadow-xl py-1 z-50 max-h-80 overflow-y-auto"
          role="menu"
        >
          {view === "main" ? (
            <>
              <MItem
                icon={<Info size={15} />}
                label="Detay"
                onClick={openDetail}
              />
              {song.creator?.username && (
                <MItem
                  icon={<User2 size={15} />}
                  label="Sanatçı profili"
                  onClick={openProfile}
                />
              )}
              <MItem
                icon={<Share2 size={15} />}
                label="Paylaş"
                onClick={share}
              />
              {session?.user && (
                <MItem
                  icon={<ListPlus size={15} />}
                  label="Playlist'e ekle"
                  onClick={openPlaylistView}
                />
              )}
              {onDelete && (
                <>
                  <div className="my-1 h-px bg-[#2a2a2a]" />
                  <MItem
                    icon={<Trash2 size={15} />}
                    label="Sil"
                    onClick={del}
                    danger
                  />
                </>
              )}
            </>
          ) : (
            <>
              <MItem
                icon={<ChevronLeft size={15} />}
                label="Geri"
                onClick={(e) => {
                  stop(e);
                  setView("main");
                }}
              />
              <div className="my-1 h-px bg-[#2a2a2a]" />

              {/* Yeni playlist oluştur */}
              <div className="px-2 py-1.5 flex gap-1.5">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Yeni playlist adı"
                  maxLength={60}
                  className="flex-1 min-w-0 bg-[#141414] border border-[#3a3a3a] rounded-lg px-2 py-1 text-white text-xs placeholder-[#6a6a6a] focus:outline-none focus:border-[#7c3aed]"
                  onClick={stop}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      createAndAdd(e as unknown as React.MouseEvent);
                  }}
                />
                <button
                  type="button"
                  onClick={createAndAdd}
                  disabled={!newTitle.trim() || creating}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#7c3aed] text-white disabled:opacity-40 shrink-0"
                >
                  {creating ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                </button>
              </div>

              {loadingPl ? (
                <div className="py-4 flex justify-center">
                  <Loader2 size={16} className="animate-spin text-[#a7a7a7]" />
                </div>
              ) : playlists.length === 0 ? (
                <p className="px-3 py-3 text-[#6a6a6a] text-xs text-center">
                  Henüz playlist yok — yukarıdan oluştur
                </p>
              ) : (
                playlists.map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={(e) => addToPlaylist(e, pl.id)}
                    disabled={addedTo.has(pl.id) || addingTo === pl.id}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-white hover:bg-[#2a2a2a] transition-colors disabled:opacity-60"
                  >
                    <span className="w-4 h-4 flex items-center justify-center opacity-80">
                      {addedTo.has(pl.id) ? (
                        <Check size={14} className="text-[#1db954]" />
                      ) : addingTo === pl.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ListPlus size={14} />
                      )}
                    </span>
                    <span className="truncate">{pl.title}</span>
                  </button>
                ))
              )}
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

function MItem({
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
