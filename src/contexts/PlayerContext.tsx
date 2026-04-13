"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  RefObject,
} from "react";
import { Song } from "@/types";

interface PlayerCtx {
  currentSong: Song | null;
  playing: boolean;
  playerOpen: boolean;
  currentTime: number;
  duration: number;
  audioRef: RefObject<HTMLAudioElement | null>;
  playSong: (song: Song, pl: Song[]) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrev: () => void;
  setPlaying: (v: boolean) => void;
  setPlayerOpen: (v: boolean) => void;
}

const PlayerContext = createContext<PlayerCtx | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Şarkı değişince yükle ve çal
  useEffect(() => {
    if (!audioRef.current || !currentSong?.audioUrl) return;
    audioRef.current.src = currentSong.audioUrl;
    audioRef.current.load();
    audioRef.current
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, [currentSong?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const playSong = useCallback((song: Song, pl: Song[]) => {
    const idx = pl.findIndex((s) => s.id === song.id);
    setPlaylist(pl);
    setCurrentIndex(idx >= 0 ? idx : 0);
    setCurrentSong(song);
    setPlayerOpen(true);
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => {});
    }
  }, [playing]);

  const playNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next >= playlist.length) return prev;
      const s = playlist[next];
      if (s?.status === "complete") {
        setCurrentSong(s);
        return next;
      }
      return prev;
    });
  }, [playlist]);

  const playPrev = useCallback(() => {
    setCurrentIndex((prev) => {
      const p = prev - 1;
      if (p < 0) return prev;
      const s = playlist[p];
      if (s?.status === "complete") {
        setCurrentSong(s);
        return p;
      }
      return prev;
    });
  }, [playlist]);

  const handleTimeUpdate = useCallback(() => {
    const t = audioRef.current?.currentTime ?? 0;
    const d = audioRef.current?.duration ?? 0;
    setCurrentTime(t);
    setDuration(d);
  }, []);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    // playNext'i doğrudan çağırabilmek için ref kullan
    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next >= playlist.length) return prev;
      const s = playlist[next];
      if (s?.status === "complete") {
        setCurrentSong(s);
        return next;
      }
      return prev;
    });
  }, [playlist]);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        playing,
        playerOpen,
        currentTime,
        duration,
        audioRef,
        playSong,
        togglePlay,
        playNext,
        playPrev,
        setPlaying,
        setPlayerOpen,
      }}
    >
      {/* Kalıcı audio element — hiç unmount olmaz */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleTimeUpdate}
        onEnded={handleEnded}
      />
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
