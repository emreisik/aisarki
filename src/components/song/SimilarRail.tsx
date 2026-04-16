"use client";

import { useEffect, useState } from "react";
import { Music2, Play, Pause } from "lucide-react";
import Link from "next/link";
import { Song } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import { formatListenerCount } from "@/lib/formatNumber";

interface Props {
  songId: string;
  creatorName?: string;
}

export default function SimilarRail({ songId, creatorName }: Props) {
  const { playSong, currentSong, playing, togglePlay } = usePlayer();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/songs/${songId}/similar?limit=8`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setSongs(d.songs ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [songId]);

  if (loading) {
    return (
      <div className="py-6 flex justify-center">
        <div className="w-5 h-5 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="text-[#6a6a6a] text-sm italic text-center py-6">
        Aynı sanatçıdan başka şarkı yok.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[#a7a7a7] text-xs font-bold uppercase tracking-widest">
          Benzer
        </p>
        {creatorName && (
          <span className="text-[#1db954] text-xs font-semibold">
            {creatorName}
          </span>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto scroll-area pb-2 -mx-1 px-1">
        {songs.map((s) => {
          const isActive = currentSong?.id === s.id;
          return (
            <div key={s.id} className="flex-shrink-0 w-[140px]">
              <button
                onClick={() => (isActive ? togglePlay() : playSong(s, songs))}
                className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#282828] group pressable"
              >
                {s.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.imageUrl}
                    alt={s.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music2 size={24} className="text-[#535353]" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  {isActive && playing ? (
                    <Pause size={20} fill="white" className="text-white" />
                  ) : (
                    <Play
                      size={20}
                      fill="white"
                      className="text-white ml-0.5"
                    />
                  )}
                </div>
                {isActive && playing && (
                  <div className="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-full bg-[#1db954] flex items-center justify-center">
                    <span className="block w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                  </div>
                )}
              </button>
              <Link href={`/song/${s.id}`} className="block mt-2">
                <p
                  className={`text-sm font-semibold truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
                >
                  {s.title}
                </p>
                <p className="text-[#6a6a6a] text-xs truncate mt-0.5">
                  {s.style?.split(",")[0] || "Hubeya"}
                  {s.playCount != null && s.playCount > 0 && (
                    <> · {formatListenerCount(s.playCount)}</>
                  )}
                </p>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
