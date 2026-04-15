"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Maximize2,
  Music2,
  Shuffle,
  Repeat,
} from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";

function fmt(s: number) {
  if (!s || isNaN(s) || !isFinite(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function useDominantColor(imageUrl?: string) {
  const [gradient, setGradient] = useState(
    "radial-gradient(ellipse at 30% 30%, rgba(30,30,40,0.5), rgba(20,20,30,0.3))",
  );

  useEffect(() => {
    if (!imageUrl) {
      setGradient(
        "radial-gradient(ellipse at 30% 30%, rgba(30,30,40,0.5), rgba(20,20,30,0.3))",
      );
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        // Neon gradient: açık merkez → koyu kenarlar
        const lightR = Math.floor(r * 0.65 + 35);
        const lightG = Math.floor(g * 0.65 + 35);
        const lightB = Math.floor(b * 0.65 + 40);
        const darkR = Math.floor(r * 0.35 + 15);
        const darkG = Math.floor(g * 0.35 + 15);
        const darkB = Math.floor(b * 0.35 + 25);
        setGradient(
          `radial-gradient(ellipse at 30% 30%, rgba(${lightR},${lightG},${lightB},0.5), rgba(${darkR},${darkG},${darkB},0.2))`,
        );
      }
    };
    img.onerror = () =>
      setGradient(
        "radial-gradient(ellipse at 30% 30%, rgba(30,30,40,0.5), rgba(20,20,30,0.3))",
      );
  }, [imageUrl]);

  return gradient;
}

export default function DesktopPlayerBar() {
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
  const [muted, setMuted] = useState(false);
  const gradient = useDominantColor(currentSong?.imageUrl);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) audioRef.current.currentTime = Number(e.target.value);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    setMuted(false);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const next = !muted;
    setMuted(next);
    audioRef.current.volume = next ? 0 : volume;
  };

  return (
    <div
      className="hidden md:flex fixed bottom-0 left-0 right-0 h-[90px] border-t border-[#282828] items-center px-4 z-40 gap-2"
      style={{
        background: gradient,
      }}
    >
      {/* Left: Song info */}
      <div className="flex items-center gap-3 min-w-0 w-[30%]">
        {currentSong ? (
          <>
            <div
              className="w-14 h-14 rounded flex-shrink-0 overflow-hidden bg-[#282828] cursor-pointer pressable shadow-lg"
              onClick={() => setPlayerOpen(true)}
            >
              {currentSong.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentSong.imageUrl}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music2 size={20} className="text-[#535353]" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className="text-white text-sm font-semibold truncate cursor-pointer hover:underline"
                onClick={() => setPlayerOpen(true)}
              >
                {currentSong.title}
              </p>
              {currentSong.creator ? (
                <Link
                  href={`/profile/${currentSong.creator.username}`}
                  className="text-[#b3b3b3] text-xs truncate mt-0.5 hover:text-white hover:underline transition-colors block"
                >
                  {currentSong.creator.name}
                </Link>
              ) : (
                <p className="text-[#b3b3b3] text-xs truncate mt-0.5">
                  {currentSong.style?.split(",")[0] || "Hubeya"}
                </p>
              )}
            </div>

            <button
              onClick={() => setLiked(!liked)}
              className="flex-shrink-0 p-1 pressable"
            >
              <Heart
                size={16}
                className={
                  liked ? "text-[#1db954]" : "text-[#b3b3b3] hover:text-white"
                }
                fill={liked ? "#1db954" : "none"}
              />
            </button>

            <button
              onClick={() => setPlayerOpen(true)}
              className="flex-shrink-0 p-1 pressable hidden lg:block"
            >
              <Maximize2
                size={14}
                className="text-[#b3b3b3] hover:text-white"
              />
            </button>
          </>
        ) : (
          <p className="text-[#535353] text-sm">Şarkı seçilmedi</p>
        )}
      </div>

      {/* Center: Controls + Progress */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4">
        {/* Control buttons */}
        <div className="flex items-center gap-5">
          <button className="pressable text-[#b3b3b3] hover:text-white transition-colors">
            <Shuffle size={16} />
          </button>

          <button
            onClick={playPrev}
            disabled={!currentSong}
            className="pressable text-[#b3b3b3] hover:text-white transition-colors disabled:opacity-30"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>

          <button
            onClick={togglePlay}
            disabled={!currentSong}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center pressable hover:scale-105 transition-transform disabled:opacity-30 shadow-md"
          >
            {playing ? (
              <Pause size={15} fill="black" className="text-black" />
            ) : (
              <Play size={15} fill="black" className="text-black ml-0.5" />
            )}
          </button>

          <button
            onClick={playNext}
            disabled={!currentSong}
            className="pressable text-[#b3b3b3] hover:text-white transition-colors disabled:opacity-30"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>

          <button className="pressable text-[#b3b3b3] hover:text-white transition-colors">
            <Repeat size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full flex items-center gap-2">
          <span className="text-[#b3b3b3] text-[10px] tabular-nums w-8 text-right flex-shrink-0">
            {fmt(currentTime)}
          </span>

          <div className="relative flex-1 h-4 flex items-center group cursor-pointer">
            <div className="w-full h-1 rounded-full bg-[#4d4d4d] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#b3b3b3] group-hover:bg-[#1db954] transition-colors"
                style={{ width: `${progress}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={seek}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            />
          </div>

          <span className="text-[#b3b3b3] text-[10px] tabular-nums w-8 flex-shrink-0">
            {fmt(duration)}
          </span>
        </div>
      </div>

      {/* Right: Volume */}
      <div className="flex items-center justify-end gap-2 w-[30%]">
        <button
          onClick={toggleMute}
          className="pressable text-[#b3b3b3] hover:text-white transition-colors"
        >
          {muted || volume === 0 ? (
            <VolumeX size={18} />
          ) : (
            <Volume2 size={18} />
          )}
        </button>

        <div className="relative w-24 h-4 flex items-center group cursor-pointer">
          <div className="w-full h-1 rounded-full bg-[#4d4d4d] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#b3b3b3] group-hover:bg-[#1db954] transition-colors"
              style={{ width: `${muted ? 0 : volume * 100}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={handleVolume}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
          />
        </div>
      </div>
    </div>
  );
}
