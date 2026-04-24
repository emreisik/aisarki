"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Music2, ShieldOff, Pencil } from "lucide-react";
import { Song } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import { useGoBack } from "@/hooks/useGoBack";

import ProfileHero from "@/components/profile/ProfileHero";
import ProfileStatsPills, {
  type CircleTab,
} from "@/components/profile/ProfileStatsPills";
import ProfileMoreMenu from "@/components/profile/ProfileMoreMenu";
import ProfileAbout from "@/components/profile/ProfileAbout";
import CircleModal from "@/components/profile/CircleModal";
import SongCardMedium from "@/components/profile/SongCardMedium";
import { type SongMenuAction } from "@/components/profile/SongContextMenu";
import ShareModal from "@/components/ShareModal";
import ReportModal from "@/components/ReportModal";

interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface UserStats {
  songCount?: number;
  monthlyListeners: number;
  totalStreams: number;
}

interface ProfileData {
  user: PublicUser;
  songs: Song[];
  songCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  stats: UserStats;
  bio: string | null;
  bannerUrl: string | null;
  genreTags: string[];
  genreTagsAuto: boolean;
  remixesInspiredCount: number;
  isBlocked: boolean;
  sort: "recent" | "top";
}

type SortKey = "recent" | "top";

export default function ArtistPage() {
  const params = useParams();
  const username = params.username as string;
  const router = useRouter();
  const goBack = useGoBack();
  const { data: session } = useSession();
  const { playSong, currentSong, playing, togglePlay, addToQueue } =
    usePlayer();

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [sort, setSort] = useState<SortKey>("recent");

  const [circleOpen, setCircleOpen] = useState(false);
  const [circleTab, setCircleTab] = useState<CircleTab>("followers");
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: "song" | "user";
    id: string;
    label: string;
  } | null>(null);
  const [toast, setToast] = useState<string>("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchProfile = useCallback(
    async (opts?: { sort?: SortKey }) => {
      try {
        const qs = opts?.sort ? `?sort=${opts.sort}` : "";
        const res = await fetch(`/api/profile/${username}${qs}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) return;
        setData(await res.json());
      } finally {
        setLoading(false);
      }
    },
    [username],
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const changeSort = async (next: SortKey) => {
    if (next === sort) return;
    setSort(next);
    await fetchProfile({ sort: next });
  };

  const handleFollow = async () => {
    if (!session?.user || !data) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/follow/${data.user.id}`, {
        method: "POST",
      });
      if (res.ok) {
        const json = await res.json();
        setData((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: json.following,
                followerCount: json.followerCount,
              }
            : prev,
        );
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const toggleBlock = async () => {
    if (!data) return;
    const wasBlocked = data.isBlocked;
    try {
      const res = await fetch(`/api/block/${data.user.id}`, {
        method: wasBlocked ? "DELETE" : "POST",
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                isBlocked: !wasBlocked,
                isFollowing: wasBlocked ? prev.isFollowing : false,
              }
            : prev,
        );
        setToast(wasBlocked ? "Engel kaldırıldı" : "Kullanıcı engellendi");
      }
    } catch {
      setToast("İşlem başarısız");
    }
  };

  const hideFromFeed = async () => {
    if (!data) return;
    try {
      await fetch(`/api/hide/${data.user.id}`, { method: "POST" });
      setToast("Feed'den gizlendi");
    } catch {
      setToast("İşlem başarısız");
    }
  };

  const songs = useMemo(() => data?.songs ?? [], [data?.songs]);

  const isThisArtistPlaying = useMemo(
    () =>
      !!currentSong && songs.some((s) => s.id === currentSong.id) && playing,
    [currentSong, playing, songs],
  );

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    if (currentSong && songs.some((s) => s.id === currentSong.id)) togglePlay();
    else playSong(songs[0], songs);
  };

  const shareTarget = useMemo(
    () => ({
      url:
        typeof window !== "undefined"
          ? `${window.location.origin}/profile/${username}`
          : `/profile/${username}`,
      title: data?.user.displayName || `@${username}`,
      text: `${data?.user.displayName ?? "@" + username} — Rifmo`,
    }),
    [data?.user.displayName, username],
  );

  const onSongAction = useCallback(
    (song: Song, action: SongMenuAction) => {
      switch (action.type) {
        case "remix":
          router.push(`/create?remixFrom=${song.id}`);
          break;
        case "create":
          router.push(
            `/create?prompt=${encodeURIComponent(song.style ?? song.title)}`,
          );
          break;
        case "add_to_queue":
          addToQueue(song);
          setToast(`Sıraya eklendi: ${song.title}`);
          break;
        case "add_to_playlist":
          setToast("Çalma listesine eklendi");
          break;
        case "share":
          // Şarkı için paylaşım URL'i
          (async () => {
            const url =
              typeof window !== "undefined"
                ? `${window.location.origin}/song/${song.id}`
                : `/song/${song.id}`;
            const { shareOrCopy } = await import("@/lib/shareUtils");
            const res = await shareOrCopy({ url, title: song.title });
            if (res === "copied") setToast("Bağlantı kopyalandı");
          })();
          break;
        case "report":
          setReportTarget({ type: "song", id: song.id, label: song.title });
          setReportOpen(true);
          break;
      }
    },
    [router, addToQueue],
  );

  const openCircle = (tab: CircleTab) => {
    setCircleTab(tab);
    setCircleOpen(true);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-full bg-[#0a0a0a]">
        <div className="mx-auto max-w-[1200px] px-4 md:px-6 pt-4">
          <div className="h-[280px] md:h-[340px] rounded-[18px] shimmer" />
          <div className="mt-5 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-28 rounded-full shimmer" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (notFound || !data) {
    return (
      <div className="min-h-full bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 pt-20">
        <Music2 size={48} className="text-[#333]" />
        <p className="text-white font-bold text-xl">Kullanıcı bulunamadı</p>
        <p className="text-[#888] text-sm">@{username} mevcut değil</p>
      </div>
    );
  }

  const { user, followerCount, followingCount, isFollowing } = data;
  const isOwnProfile = session?.user?.id === user.id;

  const totalPlays = data.stats.totalStreams || 0;
  const totalLikes = songs.reduce((sum, s) => sum + (s.likeCount ?? 0), 0);

  return (
    <div className="min-h-full bg-[#0a0a0a]">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6 pt-4 pb-24">
        {/* Back */}
        <button
          onClick={() => goBack()}
          className="mb-3 w-9 h-9 rounded-full bg-[#1a1a1a] hover:bg-[#222] flex items-center justify-center pressable transition-colors md:hidden"
          aria-label="Geri"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>

        {/* Hero */}
        <ProfileHero
          displayName={user.displayName}
          username={user.username}
          avatarUrl={user.avatarUrl}
          bannerUrl={data.bannerUrl}
          totalPlays={totalPlays}
          totalLikes={totalLikes}
          isFollowing={isFollowing}
          isOwnProfile={isOwnProfile}
          isPlayingAll={isThisArtistPlaying}
          canPlay={songs.length > 0}
          onFollow={handleFollow}
          onPlayAll={handlePlayAll}
          followLoading={followLoading}
        />

        {/* Stats row + More menu */}
        <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
          <ProfileStatsPills
            songCount={data.songCount}
            followerCount={followerCount}
            followingCount={followingCount}
            remixesInspiredCount={data.remixesInspiredCount}
            onOpenCircle={openCircle}
          />
          <div className="flex items-center gap-2">
            {isOwnProfile && (
              <Link
                href="/settings/account"
                className="h-10 px-4 rounded-full border border-[#2a2a2a] hover:bg-[#1a1a1a] flex items-center gap-1.5 text-[13px] font-semibold text-white pressable transition-colors"
              >
                <Pencil size={13} />
                Düzenle
              </Link>
            )}
            <ProfileMoreMenu
              onShare={() => setShareOpen(true)}
              onToggleBlock={toggleBlock}
              onHide={hideFromFeed}
              onReport={() => {
                setReportTarget({
                  type: "user",
                  id: user.id,
                  label: `@${user.username}`,
                });
                setReportOpen(true);
              }}
              isBlocked={data.isBlocked}
              isOwnProfile={isOwnProfile}
            />
          </div>
        </div>

        {data.isBlocked && !isOwnProfile && (
          <div className="mt-5 rounded-2xl bg-red-500/10 border border-red-500/30 p-5 flex items-center gap-4">
            <ShieldOff size={20} className="text-red-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-[14px] font-semibold">
                Bu kullanıcıyı engelledin
              </p>
              <p className="text-[#aaa] text-[12px] mt-0.5">
                Şarkıları feed&apos;inde, önerilerde veya aramalarda görünmez.
              </p>
            </div>
            <button
              onClick={toggleBlock}
              className="h-9 px-4 rounded-full bg-white text-black text-[13px] font-bold pressable"
            >
              Engeli kaldır
            </button>
          </div>
        )}

        {/* Songs */}
        {songs.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-white text-[20px] md:text-[22px] font-bold">
                Şarkılar
              </h2>
              <div className="flex items-center gap-1 p-1 rounded-full bg-[#1a1a1a] border border-[#222]">
                <SortPill
                  label="Yeni"
                  active={sort === "recent"}
                  onClick={() => changeSort("recent")}
                />
                <SortPill
                  label="Popüler"
                  active={sort === "top"}
                  onClick={() => changeSort("top")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {songs.map((song) => (
                <SongCardMedium
                  key={song.id}
                  song={song}
                  isActive={currentSong?.id === song.id}
                  isPlaying={currentSong?.id === song.id && playing}
                  onPlay={() =>
                    currentSong?.id === song.id
                      ? togglePlay()
                      : playSong(song, songs)
                  }
                  onAction={(action) => onSongAction(song, action)}
                />
              ))}
            </div>
          </section>
        )}

        {/* About */}
        <ProfileAbout
          displayName={user.displayName}
          username={user.username}
          avatarUrl={user.avatarUrl}
          bio={data.bio}
          genreTags={data.genreTags}
          genreTagsAuto={data.genreTagsAuto}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          onFollow={handleFollow}
          followLoading={followLoading}
        />

        {/* Empty */}
        {songs.length === 0 && !data.isBlocked && (
          <div className="py-24 text-center">
            <Music2 size={48} className="text-[#333] mx-auto mb-4" />
            <p className="text-white font-bold text-lg mb-2">Henüz şarkı yok</p>
            <p className="text-[#888] text-sm">
              Bu sanatçı henüz şarkı oluşturmamış
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <CircleModal
        open={circleOpen}
        onClose={() => setCircleOpen(false)}
        initialTab={circleTab}
        userId={user.id}
        displayName={user.displayName}
      />
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        target={shareTarget}
      />
      {reportTarget && (
        <ReportModal
          open={reportOpen}
          onClose={() => {
            setReportOpen(false);
            setTimeout(() => setReportTarget(null), 200);
          }}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetLabel={reportTarget.label}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 z-[70] bg-[#1c1c1c] border border-[#2a2a2a] rounded-full px-5 py-2.5 text-white text-[13px] font-medium shadow-2xl animate-toast-in">
          {toast}
        </div>
      )}
    </div>
  );
}

function SortPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-4 rounded-full text-[12px] font-semibold transition-all pressable ${
        active ? "bg-white text-black" : "text-[#aaa] hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
