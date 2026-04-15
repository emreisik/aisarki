"use client";

import { Play, Pause, SkipForward, Music2 } from "lucide-react";
import { useState, useEffect } from "react";
import { usePlayer } from "@/contexts/PlayerContext";

const FALLBACK_GRADIENT = `
  radial-gradient(ellipse 55% 140% at 22% 50%, rgba(78, 52, 40, 0.5), transparent 65%),
  radial-gradient(ellipse 55% 140% at 78% 50%, rgba(62, 42, 82, 0.45), transparent 65%),
  linear-gradient(90deg, #0a0809 0%, #0d0a0d 50%, #0a090b 100%)
`;

function useDominantColor(imageUrl?: string) {
  const [gradient, setGradient] = useState(FALLBACK_GRADIENT);

  useEffect(() => {
    if (!imageUrl) {
      setGradient(FALLBACK_GRADIENT);
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
      if (!ctx) return;
      try {
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        setGradient(`
          radial-gradient(ellipse 55% 140% at 22% 50%, rgba(${r},${g},${b},0.5), transparent 65%),
          radial-gradient(ellipse 55% 140% at 78% 50%, rgba(${Math.floor(b * 0.8 + 30)},${Math.floor(r * 0.4 + 20)},${Math.floor(g * 0.8 + 40)},0.45), transparent 65%),
          linear-gradient(90deg, #0a0809 0%, #0d0a0d 50%, #0a090b 100%)
        `);
      } catch {
        setGradient(FALLBACK_GRADIENT);
      }
    };
    img.onerror = () => setGradient(FALLBACK_GRADIENT);
  }, [imageUrl]);

  return gradient;
}

export default function MiniPlayer() {
  const {
    currentSong,
    playing,
    currentTime,
    duration,
    togglePlay,
    playNext,
    setPlayerOpen,
  } = usePlayer();

  const gradient = useDominantColor(currentSong?.imageUrl);

  if (!currentSong) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed left-2 right-2 z-40 rounded-xl overflow-hidden cursor-pointer"
      style={{
        bottom: "calc(64px + env(safe-area-inset-bottom, 0px) + 8px)",
        background: gradient,
      }}
      onClick={() => setPlayerOpen(true)}
    >
      {/* Progress line at top */}
      <div className="h-[2px] bg-[#333]">
        <div
          className="h-full bg-[#1db954] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Cover */}
        <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-[#333]">
          {currentSong.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentSong.imageUrl}
              alt={currentSong.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music2 size={16} className="text-[#a7a7a7]" />
            </div>
          )}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">
            {currentSong.title}
          </p>
          <p className="text-[#a7a7a7] text-xs truncate">
            {currentSong.style?.split(",")[0] || "Hubeya"}
          </p>
        </div>

        {/* Controls */}
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={togglePlay}
            className="w-9 h-9 flex items-center justify-center pressable"
          >
            {playing ? (
              <Pause size={22} fill="white" className="text-white" />
            ) : (
              <Play size={22} fill="white" className="text-white ml-0.5" />
            )}
          </button>
          <button
            onClick={playNext}
            className="w-9 h-9 flex items-center justify-center pressable"
          >
            <SkipForward size={22} fill="white" className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
