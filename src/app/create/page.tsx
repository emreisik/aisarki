"use client";

import { useState, useCallback } from "react";
import { Song } from "@/types";
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

  const mobilePad = currentSong
    ? "pb-[calc(144px+env(safe-area-inset-bottom,0px))]"
    : "pb-[calc(72px+env(safe-area-inset-bottom,0px))]";

  return (
    <div className={`min-h-full bg-[#121212] ${mobilePad} md:pb-0`}>
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#1a3a2a] to-[#121212] pt-16 md:pt-20 px-6 pb-6">
        <h1 className="text-white text-3xl font-black tracking-tight">
          Oluştur
        </h1>
        <p className="text-[#a7a7a7] text-sm mt-1">AI ile özgün şarkılar yap</p>
      </div>

      {/* Two-column layout on desktop */}
      <div className="px-6 py-6 flex flex-col md:flex-row gap-8 items-start">
        {/* Generator form */}
        <div className="w-full md:max-w-lg md:flex-shrink-0">
          <MusicGenerator onSongsAdded={handleSongsAdded} />
        </div>

        {/* Generated songs — right column on desktop, below on mobile */}
        {songs.length > 0 && (
          <div className="w-full md:flex-1 md:min-w-0">
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
    </div>
  );
}
