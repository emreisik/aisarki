"use client";

import { Play, Pause, SkipForward, Music2 } from "lucide-react";
import { useState, useEffect } from "react";
import { usePlayer } from "@/contexts/PlayerContext";

function useDominantColor(imageUrl?: string) {
  const [gradient, setGradient] = useState(
    "radial-gradient(ellipse at 30% 30%, rgb(40,40,50), rgba(20,20,30,0.15))",
  );

  useEffect(() => {
    if (!imageUrl) {
      setGradient(
        "radial-gradient(ellipse at 30% 30%, rgb(30,30,40), rgb(20,20,30))",
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
        // Açık ton → koyu ton gradient (light opacity'siz, dark biraz opacity)
        const lightR = Math.floor(r * 0.65 + 35);
        const lightG = Math.floor(g * 0.65 + 35);
        const lightB = Math.floor(b * 0.65 + 40);
        const darkR = Math.floor(r * 0.35 + 15);
        const darkG = Math.floor(g * 0.35 + 15);
        const darkB = Math.floor(b * 0.35 + 25);
        setGradient(
          `radial-gradient(ellipse at 30% 30%, rgb(${lightR},${lightG},${lightB}), rgba(${darkR},${darkG},${darkB},0.15))`,
        );
      }
    };
    img.onerror = () =>
      setGradient(
        "radial-gradient(ellipse at 30% 30%, rgb(30,30,40), rgb(20,20,30))",
      );
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
      className="fixed left-2 right-2 z-40 rounded-xl overflow-hidden pressable"
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
