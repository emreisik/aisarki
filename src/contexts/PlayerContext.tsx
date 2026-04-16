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
import { saveRecentSong } from "@/lib/idb";
import { useSession } from "next-auth/react";

type RepeatMode = "none" | "all" | "one";

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
  showGate: boolean;
  setShowGate: (v: boolean) => void;
  shuffle: boolean;
  toggleShuffle: () => void;
  repeat: RepeatMode;
  toggleRepeat: () => void;
}

const PlayerContext = createContext<PlayerCtx | null>(null);

const STORAGE_KEY = "hubeya_player";

function saveState(
  song: Song,
  pl: Song[],
  idx: number,
  time: number,
  isOpen: boolean,
) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ song, playlist: pl, index: idx, time, isOpen }),
    );
  } catch {}
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showGate, setShowGate] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("none");
  const gateTriggeredRef = useRef(false); // şarkı başına bir kez göster
  const shuffleRef = useRef(false);
  const repeatRef = useRef<RepeatMode>("none");
  const playerOpenRef = useRef(false); // playerOpen state'i saveState'de kullanmak için
  shuffleRef.current = shuffle;
  repeatRef.current = repeat;
  playerOpenRef.current = playerOpen;

  // ── Stream tracking (Spotify: 30sn+ = 1 stream) ──
  const streamAccumMsRef = useRef(0);
  const streamLastTickRef = useRef<number | null>(null);
  const streamSentRef = useRef<string | null>(null); // song.id — aynı şarkıda 2. kez gönderme
  const anonSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const KEY = "hubeya_sid";
      let sid = localStorage.getItem(KEY);
      if (!sid) {
        sid =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(KEY, sid);
      }
      anonSessionIdRef.current = sid;
    } catch {
      /* storage erişimi yoksa null kalır */
    }
  }, []);

  // Sayfa yenilendiğinde çalındığı yerden geri yüklemek için
  const restoreTimeRef = useRef(0);
  const playlistRef = useRef<Song[]>([]);
  const currentIndexRef = useRef(-1);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSongRef = useRef<Song | null>(null);

  playlistRef.current = playlist;
  currentIndexRef.current = currentIndex;
  currentSongRef.current = currentSong;

  // ── Mount: localStorage'dan geri yükle ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const { song, playlist: pl, index, time, isOpen } = JSON.parse(raw);
      // Sadece kalıcı audioUrl (Bunny CDN) varsa oynatabilir
      if (!song?.audioUrl) return;

      restoreTimeRef.current = time ?? 0;
      setCurrentSong(song);
      setPlaylist(pl || [song]);
      setCurrentIndex(index ?? 0);
      setPlayerOpen(isOpen ?? true); // Kaydedilmiş durumu geri yükle
      // playing = false kalır (autoplay politikası)
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Şarkı değişince yükle ──
  useEffect(() => {
    if (!audioRef.current) return;
    // Sadece kalıcı audioUrl (Bunny CDN) — stream URL fallback yok (duration sorununu önler)
    const playableUrl = currentSong?.audioUrl;
    if (!playableUrl) return;

    const savedTime = restoreTimeRef.current;
    restoreTimeRef.current = 0; // bir sonraki normal çalma etkilenmesin

    // Yeni şarkı — retry sayacını sıfırla
    retryCountRef.current = 0;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    // Duration'ı hemen metadata'dan göster (audio yüklenmeden önce)
    setCurrentTime(0);
    setDuration(currentSong?.duration ?? 0);

    audioRef.current.src = playableUrl;
    audioRef.current.load();

    if (savedTime > 1) {
      // Geri yükleme: pozisyona seek et, ama çalma
      const onCanPlay = () => {
        if (audioRef.current) {
          audioRef.current.currentTime = savedTime;
        }
        audioRef.current?.removeEventListener("canplay", onCanPlay);
      };
      audioRef.current.addEventListener("canplay", onCanPlay);
      setPlaying(false);
    } else {
      // Normal çalma: otomatik başlat
      audioRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  }, [currentSong?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Şarkı değişince stream counter sıfırla ──
  useEffect(() => {
    streamAccumMsRef.current = 0;
    streamLastTickRef.current = null;
    streamSentRef.current = null;
  }, [currentSong?.id]);

  // ── playing state → tick mantığı ──
  // Çalarken her saniye birikimi artır; 30sn eşiğinde /api/plays'e gönder.
  useEffect(() => {
    if (!currentSong?.id) return;
    if (!playing) {
      // Duraklatıldı: son tick'i hesaba kat ve bırak
      if (streamLastTickRef.current != null) {
        streamAccumMsRef.current += Date.now() - streamLastTickRef.current;
        streamLastTickRef.current = null;
      }
      return;
    }
    streamLastTickRef.current = Date.now();
    const id = setInterval(() => {
      if (!currentSong?.id) return;
      const now = Date.now();
      const last = streamLastTickRef.current ?? now;
      streamAccumMsRef.current += now - last;
      streamLastTickRef.current = now;

      // 30sn eşiği aşıldıysa ve henüz gönderilmediyse POST et
      if (
        streamAccumMsRef.current >= 30_000 &&
        streamSentRef.current !== currentSong.id
      ) {
        streamSentRef.current = currentSong.id;
        const payload = {
          songId: currentSong.id,
          durationListened: Math.floor(streamAccumMsRef.current / 1000),
          sessionId: anonSessionIdRef.current,
        };
        fetch("/api/plays", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {
          /* sessizce geç */
        });
      }
    }, 1000);
    return () => {
      clearInterval(id);
      // Unmount/change: birikimi sonlandır
      if (streamLastTickRef.current != null) {
        streamAccumMsRef.current += Date.now() - streamLastTickRef.current;
        streamLastTickRef.current = null;
      }
    };
  }, [playing, currentSong?.id]);

  // ── Audio error handler: stream henüz hazır değilse retry ──
  const handleAudioError = useCallback(() => {
    const song = currentSong;
    if (!song) return;
    const url = song.audioUrl;
    if (!url) return;

    const MAX_RETRIES = 4;
    if (retryCountRef.current >= MAX_RETRIES) {
      console.warn("[player] Max retry aşıldı, şarkı oynatılamıyor:", song.id);
      setPlaying(false);
      return;
    }

    retryCountRef.current += 1;
    const delay = 1500 * retryCountRef.current; // 1.5s, 3s, 4.5s, 6s
    console.log(
      `[player] Audio hata, ${delay}ms sonra retry #${retryCountRef.current}`,
    );

    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(async () => {
      if (!audioRef.current) return;
      // Önce API'den taze URL'i çek (Bunny audio_key güncellenmiş olabilir)
      try {
        const res = await fetch(`/api/song/${song.id}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const fresh = data?.song?.audioUrl;
          if (fresh && fresh !== audioRef.current.src) {
            audioRef.current.src = fresh;
          }
        }
      } catch {
        /* yoksa eski src ile devam */
      }
      audioRef.current.load();
      audioRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => {
          /* onError tekrar tetiklenir */
        });
    }, delay);
  }, [currentSong]);

  // ── 5 saniyede bir pozisyonu localStorage'a kaydet ──
  useEffect(() => {
    if (!currentSong) return;
    const id = setInterval(() => {
      const t = audioRef.current?.currentTime ?? 0;
      saveState(
        currentSong,
        playlistRef.current,
        currentIndexRef.current,
        t,
        playerOpenRef.current,
      );
    }, 5000);
    return () => clearInterval(id);
  }, [currentSong]);

  // ── Şarkı değişince hemen kaydet ──
  useEffect(() => {
    if (currentSong) {
      saveState(
        currentSong,
        playlistRef.current,
        currentIndexRef.current,
        audioRef.current?.currentTime ?? 0,
        playerOpenRef.current,
      );
    }
  }, [currentSong]);

  // ── Badge API — çalıyor göstergesi ──
  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;
    if (playing && currentSong) {
      (navigator as Navigator & { setAppBadge: (n?: number) => Promise<void> })
        .setAppBadge()
        .catch(() => {});
    } else {
      (navigator as Navigator & { clearAppBadge: () => Promise<void> })
        .clearAppBadge?.()
        .catch(() => {});
    }
  }, [playing, currentSong]);

  // ── Media Session API — kilit ekranı / bildirim kontrolleri ──
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentSong) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title || "Hubeya",
      artist: "Hubeya",
      album: currentSong.style?.split(",")[0] || "Hubeya",
      artwork: currentSong.imageUrl
        ? [{ src: currentSong.imageUrl, sizes: "512x512", type: "image/jpeg" }]
        : [],
    });
  }, [currentSong]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, [playing]);

  const playSong = useCallback((song: Song, pl: Song[]) => {
    const idx = pl.findIndex((s) => s.id === song.id);
    setPlaylist(pl);
    setCurrentIndex(idx >= 0 ? idx : 0);
    setCurrentSong(song);
    gateTriggeredRef.current = false; // yeni şarkıda gate sıfırla
    setShowGate(false);
    saveRecentSong(song).catch((e) => {
      console.error("[player] saveRecentSong error:", e);
    });
    if ("vibrate" in navigator) navigator.vibrate(30);
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      if ("vibrate" in navigator) navigator.vibrate(15);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setPlaying(true);
          if ("vibrate" in navigator) navigator.vibrate(15);
        })
        .catch(() => {});
    }
  }, [playing]);

  const toggleShuffle = useCallback(() => setShuffle((v) => !v), []);
  const toggleRepeat = useCallback(
    () =>
      setRepeat((v) => (v === "none" ? "all" : v === "all" ? "one" : "none")),
    [],
  );

  const playNext = useCallback(() => {
    const pl = playlistRef.current;
    if (pl.length === 0) return;
    setCurrentIndex((prev) => {
      if (shuffleRef.current) {
        // Mevcut hariç rastgele
        const candidates = pl
          .map((s, i) => ({ s, i }))
          .filter(({ s, i }) => i !== prev && s.status === "complete");
        if (candidates.length === 0) return prev;
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        setCurrentSong(pick.s);
        return pick.i;
      }
      const next = prev + 1;
      if (next >= pl.length) {
        // Repeat all: başa dön
        if (repeatRef.current === "all") {
          const first = pl.find((s) => s.status === "complete");
          if (first) setCurrentSong(first);
          return pl.findIndex((s) => s.status === "complete");
        }
        return prev;
      }
      const s = pl[next];
      if (s?.status === "complete") {
        setCurrentSong(s);
        return next;
      }
      return prev;
    });
  }, []);

  const playPrev = useCallback(() => {
    // İlk 3 saniyedeyse önceki şarkıya geç, değilse başa al
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    setCurrentIndex((prev) => {
      const p = prev - 1;
      if (p < 0) return prev;
      const s = playlistRef.current[p];
      if (s?.status === "complete") {
        setCurrentSong(s);
        return p;
      }
      return prev;
    });
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const t = audioRef.current?.currentTime ?? 0;
    const audioD = audioRef.current?.duration ?? 0;
    // Stream URL'de duration Infinity veya NaN olabilir — song metadata'sına düş
    const d =
      Number.isFinite(audioD) && audioD > 0
        ? audioD
        : (currentSongRef.current?.duration ?? 0);
    setCurrentTime(t);
    setDuration(d);

    // Kilit ekranı ilerleme çubuğunu güncelle
    if ("mediaSession" in navigator && d > 0 && Number.isFinite(d)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: d,
          playbackRate: 1,
          position: t,
        });
      } catch {}
    }
  }, []);

  const handleEnded = useCallback(() => {
    // Repeat one: aynı şarkıyı baştan çal
    if (repeatRef.current === "one" && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
      return;
    }
    setPlaying(false);
    const pl = playlistRef.current;
    setCurrentIndex((prev) => {
      if (shuffleRef.current) {
        const candidates = pl
          .map((s, i) => ({ s, i }))
          .filter(({ s, i }) => i !== prev && s.status === "complete");
        if (candidates.length === 0) return prev;
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        setCurrentSong(pick.s);
        return pick.i;
      }
      const next = prev + 1;
      if (next >= pl.length) {
        if (repeatRef.current === "all") {
          const firstIdx = pl.findIndex((s) => s.status === "complete");
          if (firstIdx >= 0) setCurrentSong(pl[firstIdx]);
          return firstIdx >= 0 ? firstIdx : prev;
        }
        return prev;
      }
      const s = pl[next];
      if (s?.status === "complete") {
        setCurrentSong(s);
        return next;
      }
      return prev;
    });
  }, []);

  // ── Media Session action handler'ları — playNext/playPrev tanımlandıktan sonra ──
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => {
      audioRef.current
        ?.play()
        .then(() => setPlaying(true))
        .catch(() => {});
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      audioRef.current?.pause();
      setPlaying(false);
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => playNext());
    navigator.mediaSession.setActionHandler("previoustrack", () => playPrev());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (audioRef.current && details.seekTime !== undefined) {
        audioRef.current.currentTime = details.seekTime;
      }
    });
    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(
          0,
          audioRef.current.currentTime - (details.seekOffset ?? 10),
        );
      }
    });
    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(
          audioRef.current.duration || 0,
          audioRef.current.currentTime + (details.seekOffset ?? 10),
        );
      }
    });
  }, [playNext, playPrev]);

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
        showGate,
        setShowGate,
        shuffle,
        toggleShuffle,
        repeat,
        toggleRepeat,
      }}
    >
      {/* Kalıcı audio element — hiç unmount olmaz */}
      {/* playsInline: iOS Safari'de arka plan oynatma için zorunlu */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleAudioError}
        playsInline
        preload="metadata"
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
