"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronDown,
  MoreHorizontal,
  Heart,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Repeat,
  Repeat1,
  Music2,
  Radio,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/contexts/PlayerContext";

function fmt(s: number) {
  if (!s || isNaN(s) || !isFinite(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/* ── Albüm görselinden dominant renk çıkar (RGBA tuple) ── */
function useDominantColor(imageUrl?: string) {
  const [rgb, setRgb] = useState("20,20,30");

  useEffect(() => {
    if (!imageUrl) {
      setRgb("20,20,30");
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 60;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const d = ctx.getImageData(0, 0, size, size).data;
        let r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (let i = 0; i < d.length; i += 8) {
          const br = (d[i] + d[i + 1] + d[i + 2]) / 3;
          if (br > 15 && br < 245) {
            r += d[i];
            g += d[i + 1];
            b += d[i + 2];
            n++;
          }
        }
        if (n > 0 && !cancelled) {
          // Neon renkler: açık ton
          const neonR = Math.floor((r / n) * 0.65 + 35);
          const neonG = Math.floor((g / n) * 0.65 + 35);
          const neonB = Math.floor((b / n) * 0.65 + 40);
          setRgb(`${neonR},${neonG},${neonB}`);
        }
      } catch {
        /* CORS — fallback renk kullan */
      }
    };
    img.onerror = () => {
      if (!cancelled) setRgb("20,20,30");
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return rgb;
}

/* ── Progress bar ── */
function ProgressBar({
  currentTime,
  duration,
  seek,
}: {
  currentTime: number;
  duration: number;
  seek: (v: number) => void;
}) {
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const [dragging, setDragging] = useState(false);
  const [dragPct, setDragPct] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  const getPos = (e: React.PointerEvent) => {
    const rect = barRef.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  };

  return (
    <div className="px-6 select-none">
      {/* Touch/click area */}
      <div
        ref={barRef}
        className="relative h-10 flex items-center cursor-pointer"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const pos = getPos(e);
          setDragging(true);
          setDragPct(pos * 100);
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          setDragPct(getPos(e) * 100);
        }}
        onPointerUp={(e) => {
          if (!dragging) return;
          const pos = getPos(e);
          seek(pos * duration);
          setDragging(false);
        }}
      >
        {/* Track */}
        <div className="w-full h-1 rounded-full bg-white/20 overflow-visible relative">
          {/* Fill */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-white transition-none"
            style={{ width: `${dragging ? dragPct : pct}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md transition-none"
            style={{
              left: `calc(${dragging ? dragPct : pct}% - 6px)`,
              opacity: dragging ? 1 : 0,
            }}
          />
        </div>
      </div>
      <div className="flex justify-between -mt-2">
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

/* ── Ana Component ── */
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
    setShowGate,
    shuffle,
    toggleShuffle,
    repeat,
    toggleRepeat,
  } = usePlayer();
  const { data: session } = useSession();

  const [liked, setLiked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const rgb = useDominantColor(currentSong?.imageUrl);
  const router = useRouter();

  if (!currentSong) return null;

  const handleLike = useCallback(() => {
    if (!session?.user) {
      setShowGate(true);
      return;
    }
    setLiked((v) => !v);
  }, [session?.user, setShowGate]);

  const seek = (v: number) => {
    if (audioRef.current) audioRef.current.currentTime = v;
  };

  const handleShare = async () => {
    if (!currentSong) return;
    const url = `${window.location.origin}/song/${currentSong.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: currentSong.title, url });
      } catch {
        /* iptal */
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
      style={{
        background: `linear-gradient(135deg, rgb(${rgb}), rgba(20,20,30,0.2))`,
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* ── Blurred background image overlay ── */}
      {currentSong.imageUrl && (
        <div className="absolute inset-0 pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentSong.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{
              filter: "blur(120px) saturate(1.6)",
              transform: "scale(1.4)",
              opacity: 0.35,
            }}
          />
        </div>
      )}
      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 100%)`,
        }}
      />

      {/* ── İçerik ── */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2 flex-shrink-0">
          <button
            onClick={() => setPlayerOpen(false)}
            className="w-10 h-10 flex items-center justify-center pressable rounded-full"
          >
            <ChevronDown size={28} className="text-white" />
          </button>

          <div className="text-center">
            <p className="text-white/50 text-[11px] font-semibold uppercase tracking-widest leading-none">
              Şimdi Çalıyor
            </p>
          </div>

          <button
            onClick={() => setShowMenu(true)}
            className="w-10 h-10 flex items-center justify-center pressable rounded-full"
          >
            <MoreHorizontal size={24} className="text-white" />
          </button>
        </div>

        {/* Album Cover */}
        <div className="flex-1 flex items-center justify-center px-6 py-2 min-h-0">
          <div
            className="w-full rounded-2xl overflow-hidden"
            style={{
              aspectRatio: "1",
              maxHeight: "min(calc(100vw - 48px), 340px)",
              maxWidth: "340px",
              boxShadow:
                "0 32px 80px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.5)",
            }}
          >
            {currentSong.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentSong.imageUrl}
                alt={currentSong.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: `rgb(${rgb})` }}
              >
                <Music2 size={80} className="text-white/30" />
              </div>
            )}
          </div>
        </div>

        {/* Song Info + Like */}
        <div className="flex items-center px-6 mb-4 flex-shrink-0">
          <div className="flex-1 min-w-0 mr-4">
            <p className="text-white text-xl font-bold truncate leading-tight">
              {currentSong.title || "İsimsiz"}
            </p>
            <p className="text-white/60 text-sm truncate mt-0.5">
              {currentSong.creator?.name ||
                currentSong.style?.split(",")[0] ||
                "Hubeya"}
            </p>
          </div>
          <button
            onClick={handleLike}
            className="pressable flex-shrink-0 w-10 h-10 flex items-center justify-center"
          >
            <Heart
              size={24}
              className={liked ? "text-[#1db954]" : "text-white/50"}
              fill={liked ? "#1db954" : "none"}
            />
          </button>
        </div>

        {/* Progress */}
        <div className="mb-3 flex-shrink-0">
          <ProgressBar
            currentTime={currentTime}
            duration={duration}
            seek={seek}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-8 mb-5 flex-shrink-0">
          <button
            onClick={toggleShuffle}
            className="pressable w-10 h-10 flex items-center justify-center relative"
          >
            <Shuffle
              size={20}
              className={shuffle ? "text-[#1db954]" : "text-white/50"}
            />
            {shuffle && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1db954]" />
            )}
          </button>
          <button
            onClick={playPrev}
            className="pressable w-10 h-10 flex items-center justify-center"
          >
            <SkipBack size={30} fill="white" className="text-white" />
          </button>
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center pressable shadow-2xl active:scale-95 transition-transform"
          >
            {playing ? (
              <Pause size={26} fill="black" className="text-black" />
            ) : (
              <Play size={26} fill="black" className="text-black ml-0.5" />
            )}
          </button>
          <button
            onClick={playNext}
            className="pressable w-10 h-10 flex items-center justify-center"
          >
            <SkipForward size={30} fill="white" className="text-white" />
          </button>
          <button
            onClick={toggleRepeat}
            className="pressable w-10 h-10 flex items-center justify-center relative"
          >
            {repeat === "one" ? (
              <Repeat1 size={20} className="text-[#1db954]" />
            ) : (
              <Repeat
                size={20}
                className={
                  repeat === "all" ? "text-[#1db954]" : "text-white/50"
                }
              />
            )}
            {repeat !== "none" && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1db954]" />
            )}
          </button>
        </div>

        {/* Alt alan — paylaş */}
        <div className="flex items-center justify-end px-6 mb-4 flex-shrink-0">
          <button
            onClick={handleShare}
            className="pressable flex items-center gap-1.5 text-white/50 hover:text-white transition-colors"
          >
            <Share2 size={18} />
            <span className="text-xs font-medium">Paylaş</span>
          </button>
        </div>
      </div>

      {/* ── More Options Bottom Sheet ── */}
      {showMenu && (
        <div className="absolute inset-0 z-20 flex flex-col">
          {/* Blurred album art background */}
          {currentSong.imageUrl && (
            <div className="absolute inset-0 pointer-events-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentSong.imageUrl}
                alt=""
                className="w-full h-full object-cover"
                style={{
                  filter: "blur(80px) saturate(1.4)",
                  transform: "scale(1.3)",
                  opacity: 0.25,
                }}
              />
            </div>
          )}
          <div className="absolute inset-0 bg-black/70 pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2 flex-shrink-0">
              <button
                onClick={() => setShowMenu(false)}
                className="w-10 h-10 flex items-center justify-center pressable rounded-full"
              >
                <ChevronDown size={28} className="text-white" />
              </button>
              <p className="text-white text-sm font-semibold truncate max-w-[160px]">
                {currentSong.title}
              </p>
              <div className="w-10" />
            </div>

            {/* Song card */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-white/10 flex-shrink-0">
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[#282828]">
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
              <div className="min-w-0">
                <p className="text-white font-bold text-base truncate">
                  {currentSong.title}
                </p>
                <p className="text-white/60 text-sm truncate">
                  {currentSong.creator?.name ||
                    currentSong.style?.split(",")[0] ||
                    "Hubeya"}
                </p>
              </div>
            </div>

            {/* Menu items */}
            <div className="flex-1 overflow-y-auto">
              <MenuItem
                icon={
                  <Heart
                    size={22}
                    fill={liked ? "#1db954" : "none"}
                    className={liked ? "text-[#1db954]" : "text-white"}
                  />
                }
                label="Beğen"
                onPress={() => {
                  handleLike();
                  setShowMenu(false);
                }}
              />
              <MenuItem
                icon={<Share2 size={22} className="text-white" />}
                label="Paylaş"
                onPress={() => {
                  handleShare();
                  setShowMenu(false);
                }}
              />
              <MenuItem
                icon={<Radio size={22} className="text-white" />}
                label="Şarkıya git"
                onPress={() => {
                  setShowMenu(false);
                  setPlayerOpen(false);
                  router.push(`/song/${currentSong.id}`);
                }}
              />
              {currentSong.creator?.username && (
                <MenuItem
                  icon={<Music2 size={22} className="text-white" />}
                  label={`${currentSong.creator.name} profiline git`}
                  onPress={() => {
                    setShowMenu(false);
                    setPlayerOpen(false);
                    router.push(`/profile/${currentSong.creator!.username}`);
                  }}
                />
              )}
            </div>

            {/* Close */}
            <div
              className="flex-shrink-0 pb-[env(safe-area-inset-bottom,0px)]"
              style={{
                paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)",
              }}
            >
              <button
                onClick={() => setShowMenu(false)}
                className="w-full py-4 text-white font-bold text-base pressable border-t border-white/10"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-5 px-6 py-4 hover:bg-white/5 pressable text-left transition-colors"
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="text-white text-base font-medium">{label}</span>
    </button>
  );
}
