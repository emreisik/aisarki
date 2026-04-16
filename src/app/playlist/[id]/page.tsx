"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
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
  List as ListIcon,
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
  const router = useRouter();

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

  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    if (!playlist) return;
    const ok = confirm(
      `"${playlist.title}" ${isAlbum ? "albümünü" : "listesini"} silmek istediğine emin misin? Bu işlem geri alınamaz.`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/playlists/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/playlists");
      } else {
        alert("Silinemedi — tekrar dene");
      }
    } catch {
      alert("Bağlantı hatası");
    } finally {
      setDeleting(false);
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
    ? "linear-gradient(180deg, #1a5a3a 0%, #0f2318 45%, #121212 100%)"
    : "linear-gradient(180deg, #7e3aad 0%, #3a1d5c 45%, #121212 100%)";

  // Şarkı sayısı + yaklaşık süre (Spotify tarzı: "50 şarkı, yaklaşık 3 sa")
  const totalSecs = songs.reduce((a, s) => a + (s.duration ?? 0), 0);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.round((totalSecs % 3600) / 60);
  const durationLabel =
    hrs > 0
      ? `yaklaşık ${hrs} sa${mins > 0 ? ` ${mins} dk` : ""}`
      : mins > 0
        ? `yaklaşık ${mins} dk`
        : "";

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
          <div className="flex flex-col gap-3 text-center md:text-left flex-1 min-w-0">
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              {playlist.isPublic
                ? isAlbum
                  ? "Açık Albüm"
                  : "Açık Çalma Listesi"
                : isAlbum
                  ? "Özel Albüm"
                  : "Özel Çalma Listesi"}
            </p>
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <h1
                className="text-white font-black leading-none tracking-tight"
                style={{
                  fontSize: "clamp(2.5rem, 7vw, 6rem)",
                  lineHeight: 1.02,
                }}
              >
                {playlist.title}
              </h1>
              {isOwner && (
                <button
                  onClick={openEdit}
                  className="flex-shrink-0 p-2 rounded-full text-[#a7a7a7] hover:text-white hover:bg-white/10 transition-colors pressable mt-2"
                  title="Düzenle"
                >
                  <Pencil size={18} />
                </button>
              )}
            </div>
            {playlist.description && (
              <p className="text-white/70 text-sm max-w-2xl">
                {playlist.description}
              </p>
            )}
            <div className="flex items-center gap-1.5 text-sm text-white/90 flex-wrap justify-center md:justify-start">
              <span className="font-bold text-white">
                {playlist.owner?.displayName ?? "Hubeya"}
              </span>
              {songs.length > 0 && (
                <>
                  <span className="text-white/60">·</span>
                  <span className="text-white/80">
                    {songs.length} şarkı
                    {durationLabel && `, ${durationLabel}`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Controls (Spotify tarzı: play + shuffle + add + more | queue/list) ── */}
      <div className="px-6 py-6 bg-[#121212] flex items-center gap-5">
        {songs.length > 0 && (
          <button
            onClick={handlePlayAll}
            className="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center pressable hover:scale-105 transition-transform shadow-xl"
            title={isCurrentPlaylist && playing ? "Duraklat" : "Çal"}
          >
            {isCurrentPlaylist && playing ? (
              <Pause size={26} fill="black" className="text-black" />
            ) : (
              <Play size={26} fill="black" className="text-black ml-1" />
            )}
          </button>
        )}

        <button
          className="text-[#a7a7a7] hover:text-white transition-colors pressable"
          title="Karıştır"
        >
          <Shuffle size={28} />
        </button>

        {isOwner && (
          <button
            onClick={() => setAddOpen(!addOpen)}
            className="w-10 h-10 rounded-full border-2 border-[#7a7a7a] text-[#7a7a7a] hover:text-white hover:border-white flex items-center justify-center transition-colors pressable"
            title="Şarkı ekle"
          >
            <Plus size={20} />
          </button>
        )}

        {isOwner && (
          <button
            onClick={openEdit}
            className="text-[#a7a7a7] hover:text-white transition-colors pressable"
            title="Diğer"
          >
            <MoreHorizontal size={28} />
          </button>
        )}

        {/* Sağ taraf — "Liste" view mode (gelecek için placeholder) */}
        <div className="ml-auto flex items-center gap-2 text-[#a7a7a7] text-sm">
          <span className="hidden md:inline">Liste</span>
          <ListIcon size={18} />
        </div>
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
          className="fixed inset-0 z-50 flex items-end pb-[calc(76px+env(safe-area-inset-bottom,0px))] sm:pb-0 sm:items-center justify-center"
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

            {/* Tehlike bölgesi — sil */}
            <div className="mt-6 pt-5 border-t border-[#2a2a2a]">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/60 hover:bg-red-500/5 rounded-full py-2.5 text-sm font-semibold transition-colors pressable disabled:opacity-40"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                {isAlbum ? "Albümü" : "Listeyi"} kalıcı olarak sil
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
            {/* Column headers — Spotify tarzı: # | Title | Album | Date added | ⏱ */}
            <div
              className="grid gap-4 px-4 pb-2 border-b border-[#282828] mb-2 text-[#a7a7a7] text-xs uppercase tracking-widest items-center"
              style={{ gridTemplateColumns: "32px 1fr 1fr 140px 60px 32px" }}
            >
              <span className="text-center">#</span>
              <span>Başlık</span>
              <span className="hidden md:block">Albüm</span>
              <span className="hidden lg:block">Eklenme</span>
              <span className="text-right">
                <Clock3 size={14} className="inline" />
              </span>
              <span />
            </div>

            {songs.map((song, i) => {
              const isActive = currentSong?.id === song.id;
              const dateLabel = song.createdAt
                ? new Date(song.createdAt).toLocaleDateString("tr-TR", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "";
              const albumLabel = song.title;
              return (
                <div
                  key={song.id}
                  className="grid gap-4 px-4 py-2 rounded-md hover:bg-[#ffffff1a] transition-colors group items-center"
                  style={{
                    gridTemplateColumns: "32px 1fr 1fr 140px 60px 32px",
                  }}
                >
                  {/* Index / wave */}
                  <div className="text-center">
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

                  {/* Title col: cover + title + creator */}
                  <button
                    onClick={() => playSong(song, songs)}
                    className="flex items-center gap-3 min-w-0 text-left pressable"
                  >
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
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
                      >
                        {song.title}
                      </p>
                      <p className="text-[#a7a7a7] text-xs truncate">
                        {song.creator?.name ||
                          song.style?.split(",")[0] ||
                          "Hubeya"}
                      </p>
                    </div>
                  </button>

                  {/* Album */}
                  <span className="hidden md:block text-[#a7a7a7] text-sm truncate">
                    {albumLabel}
                  </span>

                  {/* Date added */}
                  <span className="hidden lg:block text-[#a7a7a7] text-sm tabular-nums">
                    {dateLabel}
                  </span>

                  {/* Duration */}
                  <span className="text-[#a7a7a7] text-sm tabular-nums text-right">
                    {fmt(song.duration)}
                  </span>

                  {/* Owner: context menu */}
                  {isOwner ? (
                    <div className="relative">
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
                  ) : (
                    <span />
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
