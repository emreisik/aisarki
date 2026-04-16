"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/contexts/PlayerContext";
import { useSession } from "next-auth/react";
import { Playlist, Song } from "@/types";
import Link from "next/link";
import {
  Play,
  Pause,
  Shuffle,
  Music2,
  MoreHorizontal,
  Trash2,
  Plus,
  Disc3,
  Check,
  Heart,
  Share2,
  ArrowLeft,
} from "lucide-react";

/* ── Kapak resminden dominant renk ── */
function useDominantColor(url?: string | null) {
  const [rgb, setRgb] = useState("40,20,60");
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 60;
        const c = document.createElement("canvas");
        c.width = size;
        c.height = size;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const d = ctx.getImageData(0, 0, size, size).data;
        let r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (let i = 0; i < d.length; i += 8) {
          const br = (d[i] + d[i + 1] + d[i + 2]) / 3;
          if (br > 20 && br < 235) {
            r += d[i];
            g += d[i + 1];
            b += d[i + 2];
            n++;
          }
        }
        if (n > 0 && !cancelled) {
          const dk = 0.55;
          setRgb(
            `${Math.floor((r / n) * dk)},${Math.floor((g / n) * dk)},${Math.floor((b / n) * dk)}`,
          );
        }
      } catch {
        /* CORS */
      }
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);
  return rgb;
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
  const [deleting, setDeleting] = useState(false);

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
  const isAlbum = playlist?.type === "album";
  const rgb = useDominantColor(playlist?.coverUrl);

  const isCurrentPlaylist =
    currentSong && songs.some((s) => s.id === currentSong.id);

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    if (isCurrentPlaylist) togglePlay();
    else playSong(songs[0], songs);
  };

  const shufflePlay = () => {
    if (songs.length === 0) return;
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled);
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

  const handleDelete = async () => {
    if (!playlist) return;
    const ok = confirm(
      `"${playlist.title}" ${isAlbum ? "albümünü" : "listesini"} silmek istediğine emin misin? Bu işlem geri alınamaz.`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/playlists/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/playlists");
      else alert("Silinemedi — tekrar dene");
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
      if (prev.songs?.some((s) => s.id === song.id)) return prev;
      return {
        ...prev,
        songs: [...(prev.songs ?? []), song],
        songCount: (prev.songCount ?? 0) + 1,
        coverUrl: prev.coverUrl ?? song.imageUrl,
      };
    });
  };

  /* ── Loading ── */
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

  return (
    <div className="min-h-full bg-[#0a0a0a]">
      {/* ══ Hero — Spotify native ══ */}
      <div
        className="relative pb-6"
        style={{
          background: `linear-gradient(180deg, rgb(${rgb}) 0%, rgba(${rgb},0.3) 65%, #0a0a0a 100%)`,
        }}
      >
        {/* Geri butonu */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white pressable"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Kapak resmi — ortada */}
        <div className="pt-14 flex justify-center">
          <div className="w-[180px] h-[180px] rounded-md overflow-hidden shadow-2xl">
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
                  <Disc3 size={56} className="text-white/80" />
                ) : (
                  <Music2 size={56} className="text-white/80" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bilgi */}
        <div className="px-5 mt-5">
          <h1 className="text-white text-2xl font-black leading-tight">
            {playlist.title}
          </h1>
          {playlist.description && (
            <p className="text-white/60 text-[13px] mt-1 leading-snug">
              {playlist.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <div className="w-5 h-5 rounded-full bg-[#1db954] flex items-center justify-center">
              <Music2 size={10} className="text-black" />
            </div>
            <span className="text-white text-[13px] font-semibold">
              {playlist.owner?.displayName ?? "Hubeya"}
            </span>
          </div>
        </div>
      </div>

      {/* ══ Aksiyon bar — Spotify native layout ══ */}
      <div className="px-5 py-3 flex items-center">
        {/* Sol: like + share + edit */}
        <div className="flex items-center gap-3">
          <button className="text-[#a7a7a7] hover:text-white pressable active:scale-95 transition-all">
            <Heart size={24} />
          </button>
          <button className="text-[#a7a7a7] hover:text-white pressable active:scale-95 transition-all">
            <Share2 size={22} />
          </button>
          {isOwner && (
            <button
              onClick={openEdit}
              className="text-[#a7a7a7] hover:text-white pressable active:scale-95 transition-all"
            >
              <MoreHorizontal size={24} />
            </button>
          )}
        </div>

        {/* Sağ: shuffle + play */}
        <div className="ml-auto flex items-center gap-4">
          <button
            onClick={shufflePlay}
            className="text-[#a7a7a7] hover:text-[#1db954] pressable active:scale-95 transition-all"
          >
            <Shuffle size={24} />
          </button>
          {songs.length > 0 && (
            <button
              onClick={handlePlayAll}
              className="w-12 h-12 rounded-full bg-[#1db954] flex items-center justify-center pressable active:scale-95 transition-transform shadow-lg"
            >
              {isCurrentPlaylist && playing ? (
                <Pause size={22} fill="black" className="text-black" />
              ) : (
                <Play size={22} fill="black" className="text-black ml-0.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* ══ Add song butonu (owner) ══ */}
      {isOwner && (
        <div className="px-5 mb-2">
          <button
            onClick={() => setAddOpen(!addOpen)}
            className="flex items-center gap-2 text-[#a7a7a7] hover:text-white text-sm font-semibold pressable"
          >
            <Plus size={18} />
            Şarkı ekle
          </button>
        </div>
      )}

      {/* ══ Add song panel ══ */}
      {addOpen && (
        <div className="mx-5 mb-4 bg-[#161616] rounded-xl p-4">
          <p className="text-white font-semibold text-sm mb-3">Şarkı ekle</p>
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto scroll-area">
            {allSongs
              .filter((s) => !songs.some((ps) => ps.id === s.id))
              .map((song) => (
                <button
                  key={song.id}
                  onClick={() => addSong(song)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#222] transition-colors text-left pressable"
                >
                  <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-[#222]">
                    {song.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={song.imageUrl}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 size={14} className="text-[#444]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">
                      {song.title}
                    </p>
                    <p className="text-[#888] text-xs truncate">
                      {song.creator?.name || "Hubeya"}
                    </p>
                  </div>
                  <Plus size={16} className="text-[#1db954] flex-shrink-0" />
                </button>
              ))}
          </div>
        </div>
      )}

      {/* ══ Şarkı listesi — Spotify native ══ */}
      <div className="px-5 pb-8">
        {songs.length === 0 ? (
          <div className="py-16 text-center">
            <Music2 size={40} className="text-[#333] mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">Henüz şarkı yok</p>
            <p className="text-[#888] text-sm">
              &quot;Şarkı ekle&quot; butonuyla içerik ekle
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {songs.map((song) => {
              const isActive = currentSong?.id === song.id;
              return (
                <div
                  key={song.id}
                  className={`flex items-center gap-3 py-2.5 rounded-lg group transition-colors ${
                    isActive ? "bg-[#ffffff08]" : ""
                  }`}
                >
                  {/* Kapak */}
                  <button
                    onClick={() =>
                      isActive ? togglePlay() : playSong(song, songs)
                    }
                    className="w-12 h-12 rounded flex-shrink-0 overflow-hidden bg-[#1a1a1a] relative pressable"
                  >
                    {song.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={song.imageUrl}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 size={16} className="text-[#444]" />
                      </div>
                    )}
                    {/* Wave / play overlay */}
                    {isActive && playing && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="flex items-end justify-center gap-[2px] h-3.5">
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
                      </div>
                    )}
                  </button>

                  {/* Başlık + sanatçı */}
                  <button
                    onClick={() =>
                      isActive ? togglePlay() : playSong(song, songs)
                    }
                    className="flex-1 min-w-0 text-left pressable"
                  >
                    <p
                      className={`text-[15px] font-semibold truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
                    >
                      {song.title}
                    </p>
                    <p className="text-[#888] text-[13px] truncate mt-0.5">
                      {song.creator ? (
                        <Link
                          href={`/profile/${song.creator.username}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline"
                        >
                          {song.creator.name}
                        </Link>
                      ) : (
                        song.style?.split(",")[0] || "Hubeya"
                      )}
                    </p>
                  </button>

                  {/* Sağ aksiyonlar */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isOwner && (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setMenuSong(menuSong === song.id ? null : song.id)
                          }
                          className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-white pressable"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {menuSong === song.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-[#1a1a1a] rounded-xl shadow-2xl z-20 overflow-hidden border border-[#222]">
                            <button
                              onClick={() => removeSong(song.id)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-[#222] transition-colors text-left"
                            >
                              <Trash2 size={15} />
                              Listeden çıkar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ Edit modal — native sheet ══ */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setEditOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm backdrop-enter" />
          <div
            className="relative z-10 w-full bg-[#0c0c0c] rounded-t-[28px] p-6 sheet-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div className="w-9 h-[5px] rounded-full bg-[#333]" />
            </div>

            <h2 className="text-white text-lg font-bold mb-5 text-center">
              {isAlbum ? "Albümü Düzenle" : "Listeyi Düzenle"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[#888] text-[11px] font-semibold uppercase tracking-widest block mb-2 pl-1">
                  {isAlbum ? "Albüm adı" : "Liste adı"}
                </label>
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                  maxLength={80}
                  className="w-full bg-[#161616] text-white rounded-2xl px-4 py-3.5 text-[15px] outline-none focus:ring-1 focus:ring-[#1db954] transition-shadow"
                />
              </div>
              <div>
                <label className="text-[#888] text-[11px] font-semibold uppercase tracking-widest block mb-2 pl-1">
                  Açıklama
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  maxLength={200}
                  rows={3}
                  placeholder="İsteğe bağlı"
                  className="w-full bg-[#161616] text-white placeholder-[#444] rounded-2xl px-4 py-3.5 text-[15px] outline-none focus:ring-1 focus:ring-[#1db954] resize-none transition-shadow"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 border border-[#333] text-white font-semibold rounded-full py-3.5 text-sm pressable active:scale-95"
              >
                İptal
              </button>
              <button
                onClick={saveEdit}
                disabled={saving || !editTitle.trim()}
                className="flex-1 bg-[#1db954] text-black font-bold rounded-full py-3.5 text-sm pressable active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Kaydet
              </button>
            </div>

            {/* Sil */}
            <div className="mt-6 pt-5 border-t border-[#1a1a1a]">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full flex items-center justify-center gap-2 text-red-400 py-3 text-sm font-semibold pressable active:scale-95 disabled:opacity-30"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                {isAlbum ? "Albümü" : "Listeyi"} kalıcı olarak sil
              </button>
            </div>

            {/* Safe area */}
            <div className="h-[env(safe-area-inset-bottom,0px)]" />
          </div>
        </div>
      )}
    </div>
  );
}
