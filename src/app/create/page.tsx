"use client";

import { useState, useCallback } from "react";
import { Song } from "@/types";
import BottomNav from "@/components/BottomNav";
import MusicGenerator from "@/components/MusicGenerator";
import SongCard from "@/components/SongCard";
import { usePlayer } from "@/contexts/PlayerContext";

export default function CreatePage() {
  const { playSong, currentSong } = usePlayer();
  const [songs, setSongs] = useState<Song[]>([]);

  const handleSongsAdded = useCallback((newSongs: Song[]) => {
    if (newSongs.length === 0) {
      setSongs((prev) => prev.filter((s) => !s.id.startsWith("temp-")));
      return;
    }
    setSongs((prev) => {
      const updated = [...prev];
      newSongs.forEach((ns) => {
        const idx = updated.findIndex((s) => s.id === ns.id);
        if (idx >= 0) updated[idx] = ns;
        else updated.unshift(ns);
      });
      return updated;
    });
  }, []);

  const bottomPadding = currentSong
    ? "pb-[calc(64px+64px+env(safe-area-inset-bottom,0px)+16px)]"
    : "pb-[calc(64px+env(safe-area-inset-bottom,0px)+8px)]";

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      <div className={`scroll-area flex-1 ${bottomPadding}`}>
        {/* Header */}
        <div className="px-5 pt-14 pb-6">
          <h1 className="text-white text-3xl font-black tracking-tight">
            Oluştur
          </h1>
          <p className="text-[#535353] text-sm mt-1">AI ile şarkı yap</p>
        </div>

        {/* Generator form */}
        <div className="px-5 mb-8">
          <MusicGenerator onSongsAdded={handleSongsAdded} />
        </div>

        {/* Created songs */}
        {songs.length > 0 && (
          <div className="px-5">
            <p className="text-[#a7a7a7] text-xs font-bold uppercase tracking-widest mb-3">
              Bu Oturumda
            </p>
            <div className="flex flex-col gap-1">
              {songs.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  onPlay={(s) => playSong(s, songs)}
                  isPlaying={currentSong?.id === song.id}
                  variant="row"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav active="create" />
    </div>
  );
}
