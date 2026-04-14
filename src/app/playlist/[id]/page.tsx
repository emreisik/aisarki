"use client";

import { useEffect, useState, use } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useSession } from "next-auth/react";
import { Playlist, Song } from "@/types";
import {
  Play,
  Pause,
  Shuffle,
  Clock3,
  Music2,
  MoreHorizontal,
  Trash2,
  Plus,
  Disc3,
  Pencil,
  X,
  Check,
} from "lucide-react";

function fmt(s?: number) {
  if (!s || isNaN(s)) return "--:--";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function totalDuration(songs: Song[]) {
  const secs = songs.reduce((a, s) => a + (s.duration ?? 0), 0);
  if (secs < 60) return `${secs} sn`;
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m} dk`;
  return `${Math.floor(m / 60)} sa ${m % 60} dk`;
}

export default function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { playSong, currentSong, playing, togglePlay } = usePlayer();
  const { data: session } = useSession();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuSong, setMenuSong] = useState<string | null>(null);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const isOwner = session?.user?.id && playlist?.userId === session.user.id;

  useEffect(() => {
    fetch(`/api/playlists/${id}`)
      .then((r) => r.json())
      .then((d) => setPlaylist(d.playlist ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!addOpen) return;
    fetch("/api/all-songs")
      .then((r) => r.json())
      .then((d) => setAllSongs(d.songs || []));
  }, [addOpen]);

  const songs = playlist?.songs ?? [];

  const isCurrentPlaylist =
    currentSong && songs.some((s) => s.id === currentSong.id);

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    if (isCurrentPlaylist) {
      togglePlay();
    } else {
      playSong(songs[0], songs);
    }
  };

  const removeSong = async (songId: string) => {
    await fetch(`/api/playlists/${id}/songs`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId }),
    });
    setPlaylist((prev) =>
      prev
        ? {
            ...prev,
            songs: prev.songs?.filter((s) => s.id !== songId),
            songCount: (prev.songCount ?? 1) - 1,
          }
        : prev,
    );
    setMenuSong(null);
  };

  const openEdit = () => {
    setEditTitle(playlist?.title ?? "");
    setEditDesc(playlist?.description ?? "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editTitle.trim() || !playlist) return;
    setSaving(true);
    try {
      await fetch(`/api/playlists/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim(),
        }),
      });
      setPlaylist((prev) =>
        prev
          ? {
              ...prev,
              title: editTitle.trim(),
              description: editDesc.trim() || undefined,
            }
          : prev,
      );
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const addSong = async (song: Song) => {
    await fetch(`/api/playlists/${id}/songs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId: song.id }),
    });
    setPlaylist((prev) => {
      if (!prev) return prev;
      const already = prev.songs?.some((s) => s.id === song.id);
      if (already) return prev;
      return {
        ...prev,
        songs: [...(prev.songs ?? []), song],
        songCount: (prev.songCount ?? 0) + 1,
        coverUrl: prev.coverUrl ?? song.imageUrl,
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Music2 size={48} className="text-[#535353]" />
        <p className="text-white font-bold">Çalma listesi bulunamadı</p>
      </div>
    );
  }

  const isAlbum = playlist.type === "album";
  const heroGradient = isAlbum
    ? "linear-gradient(180deg, #0d3320 0%, #121212 50%)"
    : "linear-gradient(180deg, #5038a0 0%, #121212 50%)";

  return (
    <div className="min-h-full pb-8">
      {/* ── Hero ── */}
      <div style={{ background: heroGradient }} className="pt-16 md:pt-20">
        <div className="px-6 pb-6 flex flex-col md:flex-row md:items-end gap-6">
          {/* Cover */}
          <div className="w-48 h-48 md:w-56 md:h-56 flex-shrink-0 rounded-md overflow-hidden shadow-2xl mx-auto md:mx-0">
            {playlist.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={playlist.coverUrl}
                alt={playlist.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  background: isAlbum
                    ? "linear-gradient(135deg,#0a3d1e,#1db954)"
                    : "linear-gradient(135deg,#450af5,#c4efd9)",
                }}
              >
                {isAlbum ? (
                  <Disc3 size={64} className="text-white/80" />
                ) : (
                  <Music2 size={64} className="text-white/80" />
                )}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-2 text-center md:text-left">
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: isAlbum ? "#1db954" : "rgba(255,255,255,0.7)" }}
            >
              {isAlbum ? "Albüm" : "Çalma listesi"}
            </p>
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <h1 className="text-white text-4xl md:text-6xl font-black leading-none">
                {playlist.title}
              </h1>
              {isOwner && (
                <button
                  onClick={openEdit}
                  className="flex-shrink-0 p-2 rounded-full text-[#a7a7a7] hover:text-white hover:bg-white/10 transition-colors pressable mt-1"
                  title="Düzenle"
                >
                  <Pencil size={18} />
                </button>
              )}
            </div>
            {playlist.description && (
              <p className="text-[#a7a7a7] text-sm">{playlist.description}</p>
            )}
            <p className="text-[#a7a7a7] text-sm">
              {songs.length} şarkı
              {songs.length > 0 && ` · ${totalDuration(songs)}`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="px-6 py-6 bg-[#121212] flex items-center gap-6">
        {songs.length > 0 && (
          <button
            onClick={handlePlayAll}
            className="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center pressable hover:scale-105 transition-transform shadow-xl"
          >
            {isCurrentPlaylist && playing ? (
              <Pause size={26} fill="black" className="text-black" />
            ) : (
              <Play size={26} fill="black" className="text-black ml-1" />
            )}
          </button>
        )}

        <button className="text-[#a7a7a7] hover:text-white transition-colors pressable">
          <Shuffle size={24} />
        </button>

        {isOwner && (
          <button
            onClick={() => setAddOpen(!addOpen)}
            className="ml-auto flex items-center gap-2 text-[#a7a7a7] hover:text-white text-sm font-semibold transition-colors pressable border border-[#535353] hover:border-white rounded-full px-4 py-1.5"
          >
            <Plus size={16} />
            Şarkı ekle
          </button>
        )}
      </div>

      {/* ── Add song panel ── */}
      {addOpen && (
        <div className="mx-6 mb-4 bg-[#1a1a1a] rounded-xl p-4">
          <p className="text-white font-semibold text-sm mb-3">Şarkı ekle</p>
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto scroll-area">
            {allSongs
              .filter((s) => !songs.some((ps) => ps.id === s.id))
              .map((song) => (
                <button
                  key={song.id}
                  onClick={() => addSong(song)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#282828] transition-colors text-left pressable"
                >
                  <div className="w-9 h-9 rounded flex-shrink-0 overflow-hidden bg-[#282828]">
                    {song.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={song.imageUrl}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 size={12} className="text-[#535353]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {song.title}
                    </p>
                    <p className="text-[#a7a7a7] text-xs truncate">
                      {song.style?.split(",")[0] || "Hubeya"}
                    </p>
                  </div>
                  <Plus
                    size={16}
                    className="text-[#1db954] flex-shrink-0 ml-auto"
                  />
                </button>
              ))}
          </div>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end pb-[calc(64px+env(safe-area-inset-bottom,0px))] sm:pb-0 sm:items-center justify-center"
          onClick={() => setEditOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="relative z-10 w-full sm:max-w-md bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white text-lg font-bold">
                {isAlbum ? "Albümü Düzenle" : "Listeyi Düzenle"}
              </h2>
              <button
                onClick={() => setEditOpen(false)}
                className="text-[#a7a7a7] hover:text-white pressable"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[#a7a7a7] text-xs font-semibold uppercase tracking-widest block mb-1.5">
                  {isAlbum ? "Albüm adı" : "Liste adı"}
                </label>
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                  maxLength={80}
                  className="w-full bg-[#282828] text-white placeholder-[#535353] rounded-md px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[#1db954]"
                />
              </div>
              <div>
                <label className="text-[#a7a7a7] text-xs font-semibold uppercase tracking-widest block mb-1.5">
                  Açıklama
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  maxLength={200}
                  rows={3}
                  placeholder="İsteğe bağlı"
                  className="w-full bg-[#282828] text-white placeholder-[#535353] rounded-md px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[#1db954] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 border border-[#535353] text-white font-semibold rounded-full py-3 text-sm hover:border-white transition-colors pressable"
              >
                İptal
              </button>
              <button
                onClick={saveEdit}
                disabled={saving || !editTitle.trim()}
                className="flex-1 bg-[#1db954] text-black font-bold rounded-full py-3 text-sm hover:bg-[#1ed760] transition-colors pressable disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Track list ── */}
      <div className="px-6 bg-[#121212]">
        {songs.length === 0 ? (
          <div className="py-16 text-center">
            <Music2 size={40} className="text-[#535353] mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">Henüz şarkı yok</p>
            <p className="text-[#a7a7a7] text-sm">
              &quot;Şarkı ekle&quot; butonuyla içerik ekle
            </p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="flex items-center gap-4 px-4 pb-2 border-b border-[#282828] mb-1 text-[#a7a7a7] text-xs uppercase tracking-widest">
              <span className="w-8 text-center">#</span>
              <span className="w-10 flex-shrink-0" />
              <span className="flex-1">Başlık</span>
              <Clock3 size={14} className="flex-shrink-0" />
              {isOwner && <span className="w-8" />}
            </div>

            {songs.map((song, i) => {
              const isActive = currentSong?.id === song.id;
              return (
                <div
                  key={song.id}
                  className="flex items-center gap-4 px-4 py-2 rounded-md hover:bg-[#ffffff1a] transition-colors group"
                >
                  {/* Index / wave */}
                  <div className="w-8 text-center flex-shrink-0">
                    {isActive ? (
                      <span className="flex items-end justify-center gap-[2px] h-4">
                        {[0, 0.15, 0.3].map((d, k) => (
                          <span
                            key={k}
                            className="wave-bar rounded-sm"
                            style={{
                              width: "2px",
                              height: "100%",
                              animationDelay: `${d}s`,
                            }}
                          />
                        ))}
                      </span>
                    ) : (
                      <>
                        <span className="text-[#a7a7a7] text-sm group-hover:hidden">
                          {i + 1}
                        </span>
                        <button
                          onClick={() => playSong(song, songs)}
                          className="hidden group-hover:flex items-center justify-center w-full pressable"
                        >
                          <Play size={14} fill="white" className="text-white" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Cover */}
                  <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-[#282828]">
                    {song.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={song.imageUrl}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 size={14} className="text-[#535353]" />
                      </div>
                    )}
                  </div>

                  {/* Title + style */}
                  <button
                    onClick={() => playSong(song, songs)}
                    className="flex-1 min-w-0 text-left pressable"
                  >
                    <p
                      className={`text-sm font-medium truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
                    >
                      {song.title}
                    </p>
                    <p className="text-[#a7a7a7] text-xs truncate">
                      {song.style?.split(",")[0] || "Hubeya"}
                    </p>
                  </button>

                  {/* Duration */}
                  <span className="text-[#a7a7a7] text-sm tabular-nums flex-shrink-0">
                    {fmt(song.duration)}
                  </span>

                  {/* Owner: context menu */}
                  {isOwner && (
                    <div className="relative w-8 flex-shrink-0">
                      <button
                        onClick={() =>
                          setMenuSong(menuSong === song.id ? null : song.id)
                        }
                        className="w-8 h-8 flex items-center justify-center text-[#a7a7a7] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity pressable"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {menuSong === song.id && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-[#282828] rounded-md shadow-2xl z-10 overflow-hidden">
                          <button
                            onClick={() => removeSong(song.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-[#3e3e3e] transition-colors text-left"
                          >
                            <Trash2 size={15} />
                            Listeden çıkar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
