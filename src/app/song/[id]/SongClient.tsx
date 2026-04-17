"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Music2, Scissors, Layers, Disc3, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Song } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import { useGoBack } from "@/hooks/useGoBack";
import SongHero from "@/components/song/SongHero";
import LyricsBlock from "@/components/song/LyricsBlock";
import CommentsSection from "@/components/song/CommentsSection";
import SimilarRail from "@/components/song/SimilarRail";

function useDominantColor(imageUrl?: string | null) {
  const [rgb, setRgb] = useState("30,30,40");
  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 80;
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
          if (br > 20 && br < 235) {
            r += d[i];
            g += d[i + 1];
            b += d[i + 2];
            n++;
          }
        }
        if (n > 0 && !cancelled) {
          const dk = 0.55;
          setRgb(
            `${Math.floor((r / n) * dk)},${Math.floor((g / n) * dk)},${Math.floor((b / n) * dk)}`,
          );
        }
      } catch {
        /* CORS */
      }
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);
  return rgb;
}

export default function SongClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const goBack = useGoBack();
  const { data: session } = useSession();
  const { playSong, currentSong, playing, togglePlay } = usePlayer();

  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Like state
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  // Comment count (hero badge'de göstermek için)
  const [commentCount, setCommentCount] = useState(0);

  // Dominant renk — hero gradient
  const rgb = useDominantColor(song?.imageUrl);

  // Şarkı fetch
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/song/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const s: Song | null = d.song ?? null;
        setSong(s);
        setLikeCount(s?.likeCount ?? 0);
        setCommentCount(s?.commentCount ?? 0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Liked durumu (login varsa)
  useEffect(() => {
    if (!session?.user?.id || !song?.id) return;
    let cancelled = false;
    fetch(`/api/likes/ids`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const ids: string[] = d.ids ?? [];
        setLiked(ids.includes(song.id));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, song?.id]);

  // Follow durumu
  useEffect(() => {
    if (!session?.user?.id || !song?.creator?.username) return;
    if (session.user.id === song.creator.id) return;
    let cancelled = false;
    fetch(`/api/profile/${song.creator.username}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setIsFollowing(Boolean(d.isFollowing));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, song?.creator?.id, song?.creator?.username]);

  const isActive = currentSong?.id === song?.id;

  const handlePlay = () => {
    if (!song || song.status !== "complete") return;
    if (isActive) togglePlay();
    else playSong(song, [song]);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/song/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: song?.title ?? "Hubeya",
          text: song?.creator
            ? `${song.title} — ${song.creator.name} • Hubeya`
            : song?.title,
          url,
        });
      } catch {
        /* kullanıcı iptal etti */
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleLike = async () => {
    if (!song?.id || likeBusy) return;
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    setLikeBusy(true);
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: song.id }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setLiked(!!d.liked);
      if (typeof d.likeCount === "number") setLikeCount(d.likeCount);
    } catch {
      // revert
      setLiked(!nextLiked);
      setLikeCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
    } finally {
      setLikeBusy(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!song?.creator?.id || followBusy) return;
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }
    setFollowBusy(true);
    try {
      const res = await fetch(`/api/follow/${song.creator.id}`, {
        method: "POST",
      });
      if (res.ok) {
        const d = await res.json();
        setIsFollowing(Boolean(d.following));
      }
    } finally {
      setFollowBusy(false);
    }
  };

  const handleRemix = useCallback(() => {
    if (!song?.id) return;
    router.push(`/create?remixFrom=${song.id}`);
  }, [router, song?.id]);

  // ── Extend / Cover / Mashup state ──
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [mashupTarget, setMashupTarget] = useState(false);
  const [mashupUrl, setMashupUrl] = useState("");

  const getAudioUrl = () => song?.audioUrl || song?.streamUrl || "";

  const handleExtend = async () => {
    if (!song?.id || actionLoading) return;
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }
    setActionLoading("extend");
    setActionError("");
    try {
      const duration = song.duration || 60;
      const res = await fetch("/api/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId: song.id,
          continueAt: Math.max(1, Math.floor(duration - 5)),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Uzatma başarısız");
        return;
      }
      router.push("/create");
    } catch {
      setActionError("Bağlantı hatası");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCover = async () => {
    if (!song?.id || actionLoading) return;
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }
    const audioUrl = getAudioUrl();
    if (!audioUrl) {
      setActionError("Audio bulunamadı");
      return;
    }
    setActionLoading("cover");
    setActionError("");
    try {
      const res = await fetch("/api/upload-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadUrl: audioUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Cover başarısız");
        return;
      }
      router.push("/create");
    } catch {
      setActionError("Bağlantı hatası");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMashup = async () => {
    if (!song?.id || actionLoading || !mashupUrl.trim()) return;
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }
    const audioUrl = getAudioUrl();
    if (!audioUrl) {
      setActionError("Audio bulunamadı");
      return;
    }
    setActionLoading("mashup");
    setActionError("");
    try {
      const res = await fetch("/api/mashup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadUrlList: [audioUrl, mashupUrl.trim()] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Mashup başarısız");
        return;
      }
      setMashupTarget(false);
      setMashupUrl("");
      router.push("/create");
    } catch {
      setActionError("Bağlantı hatası");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] gap-3">
        <Music2 size={48} className="text-[#535353]" />
        <p className="text-white font-bold">Şarkı bulunamadı</p>
        <button
          onClick={() => goBack()}
          className="text-[#1db954] text-sm pressable"
        >
          Geri dön
        </button>
      </div>
    );
  }

  const canFollow = !!song.creator && song.creator.id !== session?.user?.id;

  return (
    <div className="min-h-full bg-[#0a0a0a]">
      {/* Arka plan gradient */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px] -z-10 opacity-80"
        style={{
          background: `linear-gradient(180deg, rgb(${rgb}) 0%, rgba(${rgb},0.3) 50%, rgba(10,10,10,0) 100%)`,
        }}
      />

      {/* Tek kolon — app layout */}
      <div className="mx-auto max-w-[640px] px-4 pb-28">
        <SongHero
          song={song}
          isActive={isActive}
          playing={playing}
          onPlay={handlePlay}
          onShare={handleShare}
          onBack={() => goBack()}
          onRemix={handleRemix}
          copied={copied}
          liked={liked}
          likeBusy={likeBusy}
          likeCount={likeCount}
          onToggleLike={handleToggleLike}
          isFollowing={isFollowing}
          followBusy={followBusy}
          onToggleFollow={handleToggleFollow}
          canFollow={canFollow}
          commentCount={commentCount}
          rgb={rgb}
        />

        {/* Sözler */}
        <div className="mt-8 pt-8 border-t border-white/5">
          <p className="text-[#a7a7a7] text-xs font-bold uppercase tracking-widest mb-4">
            Sözler
          </p>
          <LyricsBlock text={song.prompt} />
        </div>

        {/* Aksiyonlar: Extend / Cover / Mashup */}
        {song.status === "complete" && (
          <div className="mt-8 pt-8 border-t border-white/5">
            <p className="text-[#a7a7a7] text-xs font-bold uppercase tracking-widest mb-4">
              Aksiyonlar
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExtend}
                disabled={!!actionLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-[#222] transition-colors pressable disabled:opacity-40"
              >
                {actionLoading === "extend" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Scissors size={15} />
                )}
                Uzat
              </button>
              <button
                onClick={handleCover}
                disabled={!!actionLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-[#222] transition-colors pressable disabled:opacity-40"
              >
                {actionLoading === "cover" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Disc3 size={15} />
                )}
                Cover
              </button>
              <button
                onClick={() => setMashupTarget(!mashupTarget)}
                disabled={!!actionLoading}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors pressable disabled:opacity-40 ${
                  mashupTarget
                    ? "bg-[#1db954] text-black"
                    : "bg-[#1a1a1a] text-white hover:bg-[#222]"
                }`}
              >
                {actionLoading === "mashup" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Layers size={15} />
                )}
                Mashup
              </button>
            </div>

            {/* Mashup URL girişi */}
            {mashupTarget && (
              <div className="mt-3 flex gap-2">
                <input
                  type="url"
                  value={mashupUrl}
                  onChange={(e) => setMashupUrl(e.target.value)}
                  placeholder="2. şarkının audio URL'sini yapıştır..."
                  className="flex-1 bg-[#141414] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#444] focus:outline-none focus:ring-1 focus:ring-[#1db954]/50"
                />
                <button
                  onClick={handleMashup}
                  disabled={!mashupUrl.trim() || !!actionLoading}
                  className="px-4 py-2.5 rounded-xl bg-[#1db954] text-black text-sm font-bold hover:bg-[#1ed760] transition-colors pressable disabled:opacity-40"
                >
                  Birleştir
                </button>
              </div>
            )}

            {actionError && (
              <p className="text-red-400 text-sm mt-2">{actionError}</p>
            )}
          </div>
        )}

        {/* Benzer şarkılar */}
        <div className="mt-10 pt-8 border-t border-white/5">
          <SimilarRail songId={id} creatorName={song.creator?.name} />
        </div>

        {/* Yorumlar */}
        <div className="mt-10 pt-8 border-t border-white/5">
          <CommentsSection
            songId={id}
            songOwnerId={song.creator?.id}
            onCountChange={setCommentCount}
          />
        </div>
      </div>
    </div>
  );
}
