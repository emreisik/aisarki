"use client";

import { useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  ChevronDown,
  MoreHorizontal,
  Music2,
  Heart,
  Share2,
} from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";

function fmt(s: number) {
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function AudioPlayer() {
  const {
    currentSong,
    playing,
    currentTime,
    duration,
    togglePlay,
    playPrev,
    playNext,
    setPlayerOpen,
    audioRef,
  } = usePlayer();

  const [liked, setLiked] = useState(false);
  const [volume, setVolume] = useState(0.8);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  if (!currentSong) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{
        background: "linear-gradient(180deg, #1a1a2e 0%, #0a0a0a 60%)",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <button onClick={() => setPlayerOpen(false)} className="pressable p-1">
          <ChevronDown size={28} className="text-white" />
        </button>
        <div className="text-center">
          <p className="text-[11px] font-semibold text-[#a7a7a7] uppercase tracking-widest">
            Şimdi Çalıyor
          </p>
        </div>
        <button className="pressable p-1">
          <MoreHorizontal size={24} className="text-white" />
        </button>
      </div>

      {/* Cover art */}
      <div className="flex-1 flex items-center justify-center px-8 py-6">
        <div
          className="w-full rounded-2xl overflow-hidden shadow-2xl"
          style={{ aspectRatio: "1", maxHeight: "340px" }}
        >
          {currentSong.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentSong.imageUrl}
              alt={currentSong.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#222] flex items-center justify-center">
              <Music2 size={80} className="text-[#535353]" />
            </div>
          )}
        </div>
      </div>

      {/* Song info + like */}
      <div className="px-6 flex items-center justify-between mb-4">
        <div className="min-w-0 flex-1">
          <p className="text-white text-xl font-bold truncate">
            {currentSong.title || "İsimsiz"}
          </p>
          <p className="text-[#a7a7a7] text-sm truncate mt-0.5">
            {currentSong.style?.split(",")[0] || "AI Müzik"}
          </p>
        </div>
        <button onClick={() => setLiked(!liked)} className="pressable ml-4 p-1">
          <Heart
            size={24}
            className={liked ? "text-[#1db954]" : "text-[#a7a7a7]"}
            fill={liked ? "#1db954" : "none"}
          />
        </button>
      </div>

      {/* Progress */}
      <div className="px-6 mb-3">
        <div className="relative">
          <div className="h-1 rounded-full bg-[#333] overflow-hidden">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={seek}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[#a7a7a7] text-[11px] tabular-nums">
            {fmt(currentTime)}
          </span>
          <span className="text-[#a7a7a7] text-[11px] tabular-nums">
            {fmt(duration)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-8 mb-6">
        <button onClick={playPrev} className="pressable">
          <SkipBack size={32} fill="white" className="text-white" />
        </button>
        <button
          onClick={togglePlay}
          className="w-16 h-16 rounded-full bg-white flex items-center justify-center pressable shadow-lg"
        >
          {playing ? (
            <Pause size={28} fill="black" className="text-black" />
          ) : (
            <Play size={28} fill="black" className="text-black ml-1" />
          )}
        </button>
        <button onClick={playNext} className="pressable">
          <SkipForward size={32} fill="white" className="text-white" />
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3 px-6 mb-8">
        <Volume2 size={16} className="text-[#a7a7a7] flex-shrink-0" />
        <div className="relative flex-1">
          <div className="h-1 rounded-full bg-[#333] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#a7a7a7]"
              style={{ width: `${volume * 100}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolume}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
        <Volume2 size={20} className="text-[#a7a7a7] flex-shrink-0" />
      </div>

      {/* Share */}
      <div className="flex justify-center mb-6">
        <button className="flex items-center gap-2 pressable">
          <Share2 size={16} className="text-[#a7a7a7]" />
          <span className="text-[#a7a7a7] text-sm">Paylaş</span>
        </button>
      </div>
    </div>
  );
}
