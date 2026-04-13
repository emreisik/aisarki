"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Search,
  Library,
  Plus,
  Music2,
  ListMusic,
  LogIn,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Song, Playlist } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";

export default function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { playSong, currentSong } = usePlayer();
  const { data: session } = useSession();

  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/all-songs")
      .then((r) => r.json())
      .then((d) => setSongs((d.songs || []).slice(0, 100)));
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/playlists")
      .then((r) => r.json())
      .then((d) => setPlaylists(d.playlists || []));
  }, [session]);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const createPlaylist = async () => {
    const title = newTitle.trim() || `Çalma listesi #${playlists.length + 1}`;
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const data = await res.json();
      setPlaylists((prev) => [data.playlist, ...prev]);
      router.push(`/playlist/${data.playlist.id}`);
    }
    setCreating(false);
    setNewTitle("");
  };

  return (
    <aside className="hidden md:flex flex-col gap-2 w-[280px] fixed left-0 top-0 bottom-[90px] z-30 p-2 select-none">
      {/* ── Nav card ── */}
      <div className="bg-[#121212] rounded-lg px-3 py-4 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3 pb-5">
          <Music2 size={28} className="text-[#1db954]" fill="#1db954" />
          <span className="text-white font-black text-xl tracking-tight">
            AI Şarkı
          </span>
        </div>

        <nav className="flex flex-col gap-0.5">
          <Link
            href="/"
            className={`flex items-center gap-4 px-3 py-2.5 rounded-md text-[15px] font-semibold transition-colors pressable ${
              pathname === "/"
                ? "text-white"
                : "text-[#b3b3b3] hover:text-white"
            }`}
          >
            <Home
              size={24}
              fill={pathname === "/" ? "white" : "none"}
              strokeWidth={pathname === "/" ? 0 : 2}
            />
            Ana Sayfa
          </Link>
          <Link
            href="/discover"
            className={`flex items-center gap-4 px-3 py-2.5 rounded-md text-[15px] font-semibold transition-colors pressable ${
              pathname === "/discover"
                ? "text-white"
                : "text-[#b3b3b3] hover:text-white"
            }`}
          >
            <Search
              size={24}
              strokeWidth={pathname === "/discover" ? 2.5 : 2}
            />
            Keşfet
          </Link>
        </nav>
      </div>

      {/* ── Library card ── */}
      <div className="bg-[#121212] rounded-lg flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
          <button className="flex items-center gap-3 text-[#b3b3b3] hover:text-white transition-colors pressable group">
            <Library size={24} />
            <span className="text-[15px] font-bold">Kitaplık</span>
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (!session?.user) {
                  router.push("/auth/signin");
                  return;
                }
                setCreating(true);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-[#1a1a1a] transition-colors pressable"
              title="Çalma listesi oluştur"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Create playlist inline form */}
        {creating && (
          <div className="px-3 pb-2 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createPlaylist();
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewTitle("");
                }
              }}
              onBlur={createPlaylist}
              placeholder="Çalma listesi adı"
              className="w-full bg-[#2a2a2a] text-white text-sm rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
        )}

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto scroll-area px-2 pb-2">
          {/* Giriş yapılmamışsa CTA */}
          {!session?.user && (
            <div className="mx-2 my-2 bg-[#1a1a1a] rounded-lg p-4">
              <p className="text-white text-sm font-bold mb-1">
                Çalma listesi oluştur
              </p>
              <p className="text-[#a7a7a7] text-xs mb-3">
                Favori şarkılarını bir araya topla.
              </p>
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-1.5 bg-white text-black text-xs font-bold rounded-full px-4 py-2 hover:scale-105 transition-transform pressable"
              >
                <LogIn size={12} />
                Giriş yap
              </Link>
            </div>
          )}

          {/* Playlists */}
          {playlists.map((pl) => (
            <Link
              key={pl.id}
              href={`/playlist/${pl.id}`}
              className={`flex items-center gap-3 px-2 py-2 rounded-md transition-colors pressable ${
                pathname === `/playlist/${pl.id}`
                  ? "bg-[#2a2a2a]"
                  : "hover:bg-[#1a1a1a]"
              }`}
            >
              <div className="w-10 h-10 rounded flex-shrink-0 bg-[#282828] overflow-hidden">
                {pl.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pl.coverUrl}
                    alt={pl.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#282828]">
                    <ListMusic size={18} className="text-[#535353]" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {pl.title}
                </p>
                <p className="text-[#a7a7a7] text-xs truncate">
                  Çalma listesi · {pl.songCount ?? 0} şarkı
                </p>
              </div>
            </Link>
          ))}

          {/* Divider */}
          {playlists.length > 0 && songs.length > 0 && (
            <div className="h-px bg-[#282828] mx-2 my-2" />
          )}

          {/* Songs */}
          {songs.map((song) => {
            const isActive = currentSong?.id === song.id;
            return (
              <button
                key={song.id}
                onClick={() => playSong(song, songs)}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors pressable ${
                  isActive ? "bg-[#2a2a2a]" : "hover:bg-[#1a1a1a]"
                }`}
              >
                <div className="relative w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-[#282828]">
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
                  {isActive && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="flex items-end gap-[2px] h-3">
                        {[0, 0.15, 0.3].map((delay, i) => (
                          <span
                            key={i}
                            className="wave-bar rounded-sm"
                            style={{
                              width: "2px",
                              height: "100%",
                              animationDelay: `${delay}s`,
                            }}
                          />
                        ))}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
                  >
                    {song.title}
                  </p>
                  <p className="text-[#a7a7a7] text-xs truncate">
                    {song.style?.split(",")[0] || "AI Müzik"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
