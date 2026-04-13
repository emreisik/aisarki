"use client";

import { useState, useCallback } from "react";
import { Song } from "@/types";
import BottomNav from "@/components/BottomNav";
import SongCard from "@/components/SongCard";
import { usePlayer } from "@/contexts/PlayerContext";

const recentPrompts = [
  "Yaz akşamı sahilde neşeli pop",
  "Hüzünlü bir ayrılık şarkısı",
  "Enerjik sabah motivasyon müziği",
  "Lo-fi çalışma müziği",
];

export default function HomePage() {
  const { playSong, currentSong } = usePlayer();
  const [songs, setSongs] = useState<Song[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const handleGenerate = async (p: string) => {
    if (!p.trim() || loading) return;
    setError("");
    setLoading(true);
    const tempSongs: Song[] = [1, 2].map((i) => ({
      id: `temp-${Date.now()}-${i}`,
      title: p.slice(0, 40),
      status: "processing" as const,
      createdAt: new Date().toISOString(),
    }));
    handleSongsAdded(tempSongs);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: p.trim(),
          customMode: false,
          instrumental: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.data?.taskId) {
        setError(data.error || data.msg || "Hata oluştu");
        handleSongsAdded([]);
        return;
      }
      pollForSongs(
        data.data.taskId,
        tempSongs.map((s) => s.id),
      );
    } catch {
      setError("Bağlantı hatası");
      handleSongsAdded([]);
    } finally {
      setLoading(false);
      setPrompt("");
    }
  };

  const pollForSongs = async (taskId: string, tempIds: string[]) => {
    let attempts = 0;
    const poll = async () => {
      if (attempts++ >= 40) return;
      try {
        const res = await fetch(`/api/songs?taskId=${taskId}`);
        const data = await res.json();
        if (data.status === "complete" && data.songs.length > 0) {
          handleSongsAdded(
            data.songs.map((s: Song, i: number) => ({
              ...s,
              id: tempIds[i] || s.id,
            })),
          );
        } else setTimeout(poll, 5000);
      } catch {
        setTimeout(poll, 8000);
      }
    };
    setTimeout(poll, 10000);
  };

  const bottomPadding = currentSong
    ? "pb-[calc(64px+64px+env(safe-area-inset-bottom,0px)+16px)]"
    : "pb-[calc(64px+env(safe-area-inset-bottom,0px)+8px)]";

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      <div className={`scroll-area flex-1 ${bottomPadding}`}>
        {/* Header */}
        <div className="px-5 pt-14 pb-4">
          <p className="text-[#a7a7a7] text-sm font-semibold">Hoş geldin 👋</p>
          <h1 className="text-white text-3xl font-black mt-1 tracking-tight">
            AI Şarkı
          </h1>
          <p className="text-[#535353] text-sm mt-1">aisarki.com</p>
        </div>

        {/* Quick generate bar */}
        <div className="px-5 mb-6">
          <div className="flex gap-2 items-end">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate(prompt);
                }
              }}
              placeholder="Bir şarkı hayal et..."
              rows={2}
              maxLength={500}
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-4 py-3.5 text-white text-sm placeholder-[#535353] resize-none focus:outline-none focus:border-[#535353] transition-colors"
            />
            <button
              onClick={() => handleGenerate(prompt)}
              disabled={loading || !prompt.trim()}
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 pressable disabled:opacity-40 transition-colors"
              style={{ background: "#1db954" }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" fill="black" className="w-5 h-5">
                  <path d="M2 12l20-10-10 20v-8H2z" />
                </svg>
              )}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-2 px-1">{error}</p>}
        </div>

        {/* Quick prompts */}
        <div className="px-5 mb-6">
          <p className="text-[#a7a7a7] text-xs font-bold uppercase tracking-widest mb-3">
            Hızlı Fikirler
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scroll-area">
            {recentPrompts.map((p) => (
              <button
                key={p}
                onClick={() => handleGenerate(p)}
                className="flex-shrink-0 px-4 py-2 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#a7a7a7] text-xs font-medium pressable hover:border-[#535353] hover:text-white transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Songs */}
        {songs.length > 0 && (
          <div className="px-5">
            <p className="text-[#a7a7a7] text-xs font-bold uppercase tracking-widest mb-3">
              Oluşturulanlar
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

        {/* Empty state */}
        {songs.length === 0 && (
          <div className="px-5 mt-4">
            <div className="rounded-2xl bg-[#111] p-6 text-center">
              <p className="text-4xl mb-3">🎵</p>
              <p className="text-white font-bold mb-1">İlk şarkını oluştur</p>
              <p className="text-[#535353] text-sm">
                Yukarıya bir fikir yaz, AI senin için şarkı üretsin
              </p>
            </div>
          </div>
        )}
      </div>

      <BottomNav active="home" />
    </div>
  );
}
