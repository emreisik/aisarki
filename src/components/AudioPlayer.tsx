"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronDown,
  Music2,
  Heart,
  Share2,
  Shuffle,
  Repeat,
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
  const [muted, setMuted] = useState(false);

  const handleShare = async () => {
    if (!currentSong) return;
    const shareData = {
      title: currentSong.title || "AI Şarkı",
      text: `"${currentSong.title}" — AI Şarkı ile oluşturuldu`,
      url: `${window.location.origin}/song/${currentSong.id}`,
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        // kullanıcı iptal etti
      }
    } else {
      await navigator.clipboard.writeText(shareData.url);
    }
  };

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

  if (!currentSong) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      {/* Blurred background — kapak görselinden renk atmosferi */}
      <div className="absolute inset-0">
        {currentSong.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentSong.imageUrl}
            alt=""
            className="w-full h-full object-cover scale-110"
            style={{ filter: "blur(80px) brightness(0.25) saturate(1.8)" }}
          />
        ) : (
          <div className="w-full h-full bg-[#1a1a2e]" />
        )}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Close button */}
      <button
        onClick={() => setPlayerOpen(false)}
        className="absolute top-4 left-4 md:top-6 md:left-6 z-20 pressable p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        style={{ paddingTop: "max(8px, env(safe-area-inset-top, 8px))" }}
      >
        <ChevronDown size={22} className="text-white" />
      </button>

      {/* ── MOBILE layout ── */}
      <div
        className="relative z-10 md:hidden flex flex-col h-full"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Mobile top bar label */}
        <div className="flex items-center justify-center pt-4 pb-2 px-14">
          <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">
            Şimdi Çalıyor
          </p>
        </div>

        {/* Cover */}
        <div className="flex-1 flex items-center justify-center px-8 py-4">
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
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                <Music2 size={80} className="text-white/30" />
              </div>
            )}
          </div>
        </div>

        {/* Info + like */}
        <div className="px-6 flex items-center justify-between mb-4">
          <div className="min-w-0 flex-1">
            <p className="text-white text-xl font-bold truncate">
              {currentSong.title || "İsimsiz"}
            </p>
            {currentSong.creator ? (
              <Link
                href={`/profile/${currentSong.creator.username}`}
                onClick={() => setPlayerOpen(false)}
                className="text-white/60 text-sm truncate mt-0.5 hover:text-white hover:underline transition-colors block"
              >
                {currentSong.creator.name}
              </Link>
            ) : (
              <p className="text-white/60 text-sm truncate mt-0.5">
                {currentSong.style?.split(",")[0] || "AI Müzik"}
              </p>
            )}
          </div>
          <button
            onClick={() => setLiked(!liked)}
            className="pressable ml-4 p-1"
          >
            <Heart
              size={24}
              className={liked ? "text-[#1db954]" : "text-white/60"}
              fill={liked ? "#1db954" : "none"}
            />
          </button>
        </div>

        {/* Progress */}
        <MobileProgress
          currentTime={currentTime}
          duration={duration}
          progress={progress}
          seek={seek}
        />

        {/* Controls */}
        <div className="flex items-center justify-between px-8 mb-5">
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

        {/* Volume + share */}
        <div className="px-6 mb-4 flex items-center gap-3">
          <Volume2 size={16} className="text-white/50 flex-shrink-0" />
          <div className="relative flex-1 h-4 flex items-center group">
            <div className="w-full h-1 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white/70"
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
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            />
          </div>
          <Volume2 size={20} className="text-white/50 flex-shrink-0" />
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={() => handleShare()}
            className="flex items-center gap-2 pressable"
          >
            <Share2 size={15} className="text-white/50" />
            <span className="text-white/50 text-sm">Paylaş</span>
          </button>
        </div>
      </div>

      {/* ── DESKTOP / TABLET layout ── */}
      <div className="relative z-10 hidden md:flex h-full items-center justify-center px-12 lg:px-20 gap-12 lg:gap-20">
        {/* Left: Cover art */}
        <div className="flex-shrink-0 w-[38%] max-w-[420px]">
          <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
            {currentSong.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentSong.imageUrl}
                alt={currentSong.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                <Music2 size={100} className="text-white/20" />
              </div>
            )}
          </div>
        </div>

        {/* Right: Info + controls */}
        <div className="flex-1 max-w-md flex flex-col gap-6">
          {/* Song info */}
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2">
              Şimdi Çalıyor
            </p>
            <h1 className="text-white text-3xl lg:text-4xl font-black leading-tight">
              {currentSong.title || "İsimsiz"}
            </h1>
            {currentSong.creator ? (
              <Link
                href={`/profile/${currentSong.creator.username}`}
                onClick={() => setPlayerOpen(false)}
                className="text-white/60 text-base mt-2 hover:text-white hover:underline transition-colors block"
              >
                {currentSong.creator.name}
              </Link>
            ) : (
              <p className="text-white/60 text-base mt-2">
                {currentSong.style?.split(",")[0] || "AI Müzik"}
              </p>
            )}
          </div>

          {/* Like + share */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLiked(!liked)}
              className="pressable flex items-center gap-2"
            >
              <Heart
                size={22}
                className={
                  liked ? "text-[#1db954]" : "text-white/50 hover:text-white"
                }
                fill={liked ? "#1db954" : "none"}
              />
              <span
                className={`text-sm font-medium ${liked ? "text-[#1db954]" : "text-white/50"}`}
              >
                {liked ? "Beğenildi" : "Beğen"}
              </span>
            </button>
            <button
              onClick={() => handleShare()}
              className="pressable flex items-center gap-2"
            >
              <Share2 size={18} className="text-white/50 hover:text-white" />
              <span className="text-white/50 text-sm hover:text-white">
                Paylaş
              </span>
            </button>
          </div>

          {/* Progress bar */}
          <div>
            <div className="relative h-5 flex items-center group cursor-pointer">
              <div className="w-full h-1 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white group-hover:bg-[#1db954] transition-colors"
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
            <div className="flex justify-between mt-1">
              <span className="text-white/50 text-xs tabular-nums">
                {fmt(currentTime)}
              </span>
              <span className="text-white/50 text-xs tabular-nums">
                {fmt(duration)}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <button className="pressable text-white/40 hover:text-white transition-colors">
              <Shuffle size={20} />
            </button>
            <button
              onClick={playPrev}
              className="pressable text-white hover:scale-110 transition-transform"
            >
              <SkipBack size={28} fill="white" className="text-white" />
            </button>
            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center pressable hover:scale-105 transition-transform shadow-xl"
            >
              {playing ? (
                <Pause size={26} fill="black" className="text-black" />
              ) : (
                <Play size={26} fill="black" className="text-black ml-1" />
              )}
            </button>
            <button
              onClick={playNext}
              className="pressable text-white hover:scale-110 transition-transform"
            >
              <SkipForward size={28} fill="white" className="text-white" />
            </button>
            <button className="pressable text-white/40 hover:text-white transition-colors">
              <Repeat size={20} />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMute}
              className="pressable text-white/50 hover:text-white transition-colors flex-shrink-0"
            >
              {muted || volume === 0 ? (
                <VolumeX size={20} />
              ) : (
                <Volume2 size={20} />
              )}
            </button>
            <div className="relative flex-1 h-5 flex items-center group cursor-pointer">
              <div className="w-full h-1 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/70 group-hover:bg-[#1db954] transition-colors"
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
      </div>
    </div>
  );
}

/* Progress bar — mobile only (extracted for readability) */
function MobileProgress({
  currentTime,
  duration,
  progress,
  seek,
}: {
  currentTime: number;
  duration: number;
  progress: number;
  seek: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="px-6 mb-4">
      <div className="relative h-5 flex items-center group cursor-pointer">
        <div className="w-full h-1 rounded-full bg-white/20 overflow-hidden">
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
          className="absolute inset-0 opacity-0 cursor-pointer w-full"
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-white/50 text-[11px] tabular-nums">
          {fmt(currentTime)}
        </span>
        <span className="text-white/50 text-[11px] tabular-nums">
          {fmt(duration)}
        </span>
      </div>
    </div>
  );
}
