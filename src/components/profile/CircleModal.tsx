"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { X, Loader2, Music2, UserPlus, Check } from "lucide-react";
import type { CircleTab } from "./ProfileStatsPills";
import type { Song } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import { useSession } from "next-auth/react";

export interface ProfileListUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isFollowing: boolean;
}

export interface RemixInspired {
  remix: Song;
  source: { id: string; title: string } | null;
}

type Props = {
  open: boolean;
  onClose: () => void;
  initialTab: CircleTab;
  userId: string;
  displayName: string;
};

export default function CircleModal({
  open,
  onClose,
  initialTab,
  userId,
  displayName,
}: Props) {
  const { data: session } = useSession();
  const { playSong } = usePlayer();
  const [tab, setTab] = useState<CircleTab>(initialTab);
  const [closing, setClosing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followers, setFollowers] = useState<ProfileListUser[]>([]);
  const [following, setFollowing] = useState<ProfileListUser[]>([]);
  const [remixes, setRemixes] = useState<RemixInspired[]>([]);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const load = useCallback(
    async (which: CircleTab) => {
      setLoading(true);
      try {
        if (which === "followers") {
          const res = await fetch(`/api/follow/${userId}/followers`);
          const d = await res.json();
          setFollowers(d.items ?? []);
        } else if (which === "following") {
          const res = await fetch(`/api/follow/${userId}/following`);
          const d = await res.json();
          setFollowing(d.items ?? []);
        } else {
          const res = await fetch(`/api/profile/remixes/${userId}`);
          const d = await res.json();
          setRemixes(d.items ?? []);
        }
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!open) return;
    load(tab);
  }, [open, tab, load]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open && !closing) return null;

  const dismiss = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 180);
  };

  const toggleFollow = async (id: string) => {
    const prev = tab === "followers" ? followers : following;
    const updater = tab === "followers" ? setFollowers : setFollowing;
    updater(
      prev.map((u) =>
        u.id === id ? { ...u, isFollowing: !u.isFollowing } : u,
      ),
    );
    try {
      await fetch(`/api/follow/${id}`, { method: "POST" });
    } catch {
      updater(prev);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className={`absolute inset-0 bg-black/75 backdrop-blur-sm ${closing ? "backdrop-exit" : "backdrop-enter"}`}
        onClick={dismiss}
      />
      <div
        className={`relative z-10 w-full max-w-[560px] max-h-[80vh] bg-[#161616] border border-[#222] rounded-[20px] flex flex-col shadow-2xl ${closing ? "modal-exit" : "modal-enter"}`}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h2 className="text-white text-[17px] font-bold">
            {displayName} · Bağlantılar
          </h2>
          <button
            onClick={dismiss}
            className="w-8 h-8 rounded-full bg-[#222] hover:bg-[#2a2a2a] flex items-center justify-center pressable"
            aria-label="Kapat"
          >
            <X size={14} className="text-[#aaa]" />
          </button>
        </div>

        <div className="flex border-b border-[#222]">
          <TabButton
            label="Takipçiler"
            active={tab === "followers"}
            onClick={() => setTab("followers")}
          />
          <TabButton
            label="Takip"
            active={tab === "following"}
            onClick={() => setTab("following")}
          />
          <TabButton
            label="Remix'ler"
            active={tab === "remixes"}
            onClick={() => setTab("remixes")}
          />
        </div>

        <div className="flex-1 overflow-y-auto scroll-area">
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[#555]" />
            </div>
          )}

          {!loading && tab === "followers" && (
            <UserList
              items={followers}
              viewerId={session?.user?.id}
              onClose={dismiss}
              onToggleFollow={toggleFollow}
              emptyMsg="Henüz takipçi yok"
            />
          )}

          {!loading && tab === "following" && (
            <UserList
              items={following}
              viewerId={session?.user?.id}
              onClose={dismiss}
              onToggleFollow={toggleFollow}
              emptyMsg="Henüz kimseyi takip etmiyor"
            />
          )}

          {!loading && tab === "remixes" && (
            <div className="p-2">
              {remixes.length === 0 ? (
                <p className="text-[#888] text-[13px] text-center py-10">
                  Henüz remix yok
                </p>
              ) : (
                remixes.map((item) => {
                  const song = item.remix;
                  return (
                    <button
                      key={song.id}
                      onClick={() => {
                        playSong(
                          song,
                          remixes.map((r) => r.remix),
                        );
                        dismiss();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#1a1a1a] transition-colors text-left pressable"
                    >
                      <div className="w-12 h-12 rounded overflow-hidden bg-[#1a1a1a] flex-shrink-0 flex items-center justify-center">
                        {song.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={song.imageUrl}
                            alt={song.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music2 size={16} className="text-[#444]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[14px] font-semibold truncate">
                          {song.title}
                        </p>
                        <p className="text-[#888] text-[11px] truncate">
                          {song.creator?.name ?? "Bilinmeyen"}
                          {item.source && (
                            <>
                              {" · "}
                              <span className="text-[#1ed760]">
                                {item.source.title}
                              </span>
                              {" şarkısından"}
                            </>
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3.5 text-[13px] font-semibold transition-colors relative ${
        active ? "text-white" : "text-[#888] hover:text-white"
      }`}
    >
      {label}
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-full bg-white" />
      )}
    </button>
  );
}

function UserList({
  items,
  viewerId,
  onClose,
  onToggleFollow,
  emptyMsg,
}: {
  items: ProfileListUser[];
  viewerId: string | undefined;
  onClose: () => void;
  onToggleFollow: (id: string) => void;
  emptyMsg: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-[#888] text-[13px] text-center py-10">{emptyMsg}</p>
    );
  }
  return (
    <div className="p-2">
      {items.map((u) => (
        <div
          key={u.id}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#1a1a1a] transition-colors"
        >
          <Link
            href={`/profile/${u.username}`}
            onClick={onClose}
            className="flex items-center gap-3 flex-1 min-w-0 pressable"
          >
            <div className="w-11 h-11 rounded-full overflow-hidden bg-[#1a1a1a] flex-shrink-0 flex items-center justify-center">
              {u.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={u.avatarUrl}
                  alt={u.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-[14px] font-bold">
                  {u.displayName[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[14px] font-semibold truncate">
                {u.displayName}
              </p>
              <p className="text-[#888] text-[12px] truncate">@{u.username}</p>
            </div>
          </Link>
          {viewerId && viewerId !== u.id && (
            <button
              onClick={() => onToggleFollow(u.id)}
              className={`h-8 px-3.5 rounded-full text-[12px] font-bold pressable transition-all ${
                u.isFollowing
                  ? "bg-[#222] text-white hover:bg-[#2a2a2a]"
                  : "bg-white text-black hover:bg-[#f0f0f0]"
              }`}
            >
              {u.isFollowing ? (
                <span className="flex items-center gap-1">
                  <Check size={12} /> Takipte
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <UserPlus size={12} /> Takip et
                </span>
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
