"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Music2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Song } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
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
          onClick={() => router.back()}
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
          onBack={() => router.back()}
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
