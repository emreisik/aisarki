"use client";

import Link from "next/link";
import { Music2, X } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";

export default function GateModal() {
  const { currentSong, showGate, setShowGate } = usePlayer();

  if (!showGate) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setShowGate(false)}
      />

      {/* Card */}
      <div className="relative w-full max-w-sm mx-4 mb-6 md:mb-0 bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl">
        {/* Kapat */}
        <button
          onClick={() => setShowGate(false)}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 pressable"
        >
          <X size={16} className="text-white" />
        </button>

        {/* İçerik */}
        <div className="flex flex-col items-center px-8 pt-10 pb-8 text-center">
          {/* Albüm kapağı */}
          <div className="w-28 h-28 rounded-xl overflow-hidden mb-6 shadow-xl flex-shrink-0">
            {currentSong?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentSong.imageUrl}
                alt={currentSong?.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                <Music2 size={40} className="text-[#535353]" />
              </div>
            )}
          </div>

          <h2 className="text-white text-xl font-black mb-1 leading-tight">
            Dinlemeye devam et
          </h2>
          <p className="text-[#a7a7a7] text-sm mb-6 leading-relaxed">
            Tüm şarkıları sınırsız dinlemek için
            <br />
            ücretsiz kayıt ol
          </p>

          {/* Kayıt ol */}
          <Link
            href="/auth/signup"
            onClick={() => setShowGate(false)}
            className="w-full bg-[#1db954] hover:bg-[#1ed760] text-black font-bold rounded-full py-3.5 text-sm transition-colors pressable text-center block mb-3"
          >
            Ücretsiz kayıt ol
          </Link>

          {/* Giriş yap */}
          <Link
            href="/auth/signin"
            onClick={() => setShowGate(false)}
            className="w-full border border-white/20 hover:border-white/50 text-white font-bold rounded-full py-3.5 text-sm transition-colors pressable text-center block"
          >
            Giriş yap
          </Link>
        </div>

        {/* Kapat linki */}
        <div className="border-t border-white/10 py-4 text-center">
          <button
            onClick={() => setShowGate(false)}
            className="text-white/50 text-sm font-semibold hover:text-white transition-colors pressable"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
