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
      <p className="text-[#a7a7a7] text-xs font-bold uppercase tracking-widest mb-3">
        Benzer
      </p>
      {creatorName && (
        <Link
          href="#"
          className="block text-[#1db954] text-sm font-semibold mb-3 hover:underline"
        >
          {creatorName} tarafından
        </Link>
      )}
      <div className="flex flex-col">
        {songs.map((s) => {
          const isActive = currentSong?.id === s.id;
          return (
            <div
              key={s.id}
              className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <button
                onClick={() => (isActive ? togglePlay() : playSong(s, songs))}
                className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-[#282828] pressable"
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
                    <Music2 size={16} className="text-[#535353]" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  {isActive && playing ? (
                    <Pause size={16} fill="white" className="text-white" />
                  ) : (
                    <Play
                      size={16}
                      fill="white"
                      className="text-white ml-0.5"
                    />
                  )}
                </div>
              </button>
              <Link href={`/song/${s.id}`} className="flex-1 min-w-0 block">
                <p
                  className={`text-sm font-semibold truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
                >
                  {s.title}
                </p>
                <p className="text-[#6a6a6a] text-xs truncate mt-0.5">
                  {s.style?.split(",")[0] || "Hubeya"}
                  {s.playCount != null && s.playCount > 0 && (
                    <> · {formatListenerCount(s.playCount)} dinlenme</>
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
