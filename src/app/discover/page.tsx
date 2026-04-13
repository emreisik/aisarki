"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Song } from "@/types";
import BottomNav from "@/components/BottomNav";
import SongCard from "@/components/SongCard";
import { usePlayer } from "@/contexts/PlayerContext";

export default function DiscoverPage() {
  const { playSong, currentSong } = usePlayer();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSongs = useCallback(async () => {
    try {
      const res = await fetch("/api/all-songs");
      const data: { songs: Song[] } = await res.json();
      setSongs(data.songs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSongs();
    const id = setInterval(fetchSongs, 15000);
    return () => clearInterval(id);
  }, [fetchSongs]);

  const bottomPadding = currentSong
    ? "pb-[calc(64px+64px+env(safe-area-inset-bottom,0px)+16px)]"
    : "pb-[calc(64px+env(safe-area-inset-bottom,0px)+8px)]";

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      <div className={`scroll-area flex-1 ${bottomPadding}`}>
        {/* Header */}
        <div className="px-5 pt-14 pb-4 flex items-end justify-between">
          <div>
            <h1 className="text-white text-3xl font-black tracking-tight">
              Keşfet
            </h1>
            <p className="text-[#535353] text-sm mt-1">
              {songs.length > 0 ? `${songs.length} şarkı` : "Henüz şarkı yok"}
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchSongs();
            }}
            className="pressable p-2 rounded-full bg-[#1a1a1a]"
          >
            <RefreshCw
              size={18}
              className={`text-[#a7a7a7] ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {loading ? (
          <div className="px-5 grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-[#111]">
                <div className="aspect-square shimmer" />
                <div className="p-3 space-y-2">
                  <div className="h-3 rounded-full shimmer w-3/4" />
                  <div className="h-2.5 rounded-full shimmer w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 px-8 text-center">
            <p className="text-5xl mb-4">🎶</p>
            <p className="text-white font-bold text-lg mb-2">Henüz şarkı yok</p>
            <p className="text-[#535353] text-sm">
              Ana sayfadan şarkı oluşturmaya başla, burada görünür
            </p>
          </div>
        ) : (
          <div className="px-5 grid grid-cols-2 gap-3">
            {songs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onPlay={(s) => playSong(s, songs)}
                isPlaying={currentSong?.id === song.id}
                variant="grid"
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav active="discover" />
    </div>
  );
}
