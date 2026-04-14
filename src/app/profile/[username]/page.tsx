"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Song } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import { Music2, Play, Pause } from "lucide-react";

function fmt(s?: number) {
  if (!s || isNaN(s)) return "--:--";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { playSong, currentSong, playing, togglePlay } = usePlayer();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorName, setCreatorName] = useState<string>("");
  const [creatorImage, setCreatorImage] = useState<string | undefined>();

  useEffect(() => {
    fetch("/api/all-songs")
      .then((r) => r.json())
      .then((d) => {
        const all: Song[] = d.songs || [];
        const userSongs = all.filter((s) => s.creator?.username === username);
        setSongs(userSongs);
        if (userSongs.length > 0 && userSongs[0].creator) {
          setCreatorName(userSongs[0].creator.name);
          setCreatorImage(userSongs[0].creator.image);
        }
      })
      .finally(() => setLoading(false));
  }, [username]);

  const isPlaying =
    currentSong && songs.some((s) => s.id === currentSong.id) && playing;

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    if (currentSong && songs.some((s) => s.id === currentSong.id)) {
      togglePlay();
    } else {
      playSong(songs[0], songs);
    }
  };

  return (
    <div className="min-h-full pb-8">
      {/* Header */}
      <div
        className="pt-16 md:pt-20 px-6 pb-8"
        style={{
          background: "linear-gradient(180deg, #1a1a2e 0%, #121212 100%)",
        }}
      >
        <div className="flex items-end gap-6">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden flex-shrink-0 shadow-2xl bg-[#282828] flex items-center justify-center">
            {creatorImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creatorImage}
                alt={creatorName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-4xl font-black">
                {creatorName?.[0]?.toUpperCase() ||
                  username?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#a7a7a7] mb-1">
              Profil
            </p>
            <h1 className="text-white text-4xl md:text-5xl font-black leading-none mb-2">
              {creatorName || username}
            </h1>
            <p className="text-[#a7a7a7] text-sm">
              {loading ? "Yükleniyor..." : `${songs.length} şarkı`}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      {songs.length > 0 && (
        <div className="px-6 py-4 bg-[#121212]">
          <button
            onClick={handlePlayAll}
            className="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center hover:scale-105 transition-transform shadow-xl pressable"
          >
            {isPlaying ? (
              <Pause size={26} fill="black" className="text-black" />
            ) : (
              <Play size={26} fill="black" className="text-black ml-1" />
            )}
          </button>
        </div>
      )}

      {/* Song list */}
      <div className="px-6 bg-[#121212]">
        {loading ? (
          <div className="flex flex-col gap-2 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-2">
                <div className="w-10 h-10 rounded shimmer flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-3 w-1/3 rounded-full shimmer" />
                  <div className="h-2.5 w-1/5 rounded-full shimmer" />
                </div>
                <div className="w-10 h-3 rounded-full shimmer" />
              </div>
            ))}
          </div>
        ) : songs.length === 0 ? (
          <div className="py-20 text-center">
            <Music2 size={48} className="text-[#535353] mx-auto mb-4" />
            <p className="text-white font-bold text-xl mb-2">Henüz şarkı yok</p>
            <p className="text-[#535353] text-sm">
              Bu kullanıcı henüz şarkı oluşturmamış
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 px-4 pb-2 border-b border-[#282828] mb-1 text-[#a7a7a7] text-xs uppercase tracking-widest">
              <span className="w-8 text-center">#</span>
              <span className="w-10 flex-shrink-0" />
              <span className="flex-1">Başlık</span>
              <span className="hidden md:block w-32">Stil</span>
              <span className="tabular-nums">Süre</span>
            </div>

            {songs.map((song, i) => {
              const isActive = currentSong?.id === song.id;
              return (
                <div
                  key={song.id}
                  className={`flex items-center gap-4 px-4 py-2 rounded-md transition-colors group ${
                    isActive ? "bg-[#ffffff12]" : "hover:bg-[#ffffff0d]"
                  }`}
                >
                  <div className="w-8 text-center flex-shrink-0">
                    {isActive ? (
                      <span className="flex items-end justify-center gap-[2px] h-4">
                        {[0, 0.15, 0.3].map((d, k) => (
                          <span
                            key={k}
                            className="wave-bar rounded-sm"
                            style={{
                              width: "2px",
                              height: "100%",
                              animationDelay: `${d}s`,
                            }}
                          />
                        ))}
                      </span>
                    ) : (
                      <>
                        <span className="text-[#a7a7a7] text-sm group-hover:hidden">
                          {i + 1}
                        </span>
                        <button
                          onClick={() => playSong(song, songs)}
                          className="hidden group-hover:flex items-center justify-center w-full pressable"
                        >
                          <Play size={14} fill="white" className="text-white" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-[#282828]">
                    {song.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={song.imageUrl}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 size={14} className="text-[#535353]" />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => playSong(song, songs)}
                    className="flex-1 min-w-0 text-left pressable"
                  >
                    <p
                      className={`text-sm font-medium truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
                    >
                      {song.title}
                    </p>
                    <p className="text-[#a7a7a7] text-xs truncate">
                      {song.style?.split(",")[0] || "AI Müzik"}
                    </p>
                  </button>

                  <p className="hidden md:block text-[#a7a7a7] text-sm truncate w-32 flex-shrink-0">
                    {song.style?.split(",")[0] || "AI Müzik"}
                  </p>

                  <span className="text-[#a7a7a7] text-sm tabular-nums flex-shrink-0">
                    {fmt(song.duration)}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
