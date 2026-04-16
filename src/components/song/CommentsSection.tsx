"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessageCircle, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { SongComment } from "@/types";

interface Props {
  songId: string;
  songOwnerId?: string;
  /** Yorum sayısı güncellendiğinde parent'a bildir (hero badge için). */
  onCountChange?: (n: number) => void;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "az önce";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} gün önce`;
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CommentsSection({
  songId,
  songOwnerId,
  onCountChange,
}: Props) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<SongComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/songs/${songId}/comments`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      const list: SongComment[] = (data.comments ?? []).map(
        (c: {
          id: string;
          songId: string;
          userId: string;
          body: string;
          createdAt: string;
          user?: { id: string; name: string; username: string; image?: string };
        }) => ({
          id: c.id,
          songId: c.songId,
          userId: c.userId,
          body: c.body,
          createdAt: c.createdAt,
          user: c.user,
        }),
      );
      setComments(list);
      onCountChange?.(list.length);
    } finally {
      setLoading(false);
    }
  }, [songId, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    const text = body.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/songs/${songId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (res.ok) {
        setBody("");
        load();
      }
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) {
      setComments((prev) => {
        const next = prev.filter((c) => c.id !== id);
        onCountChange?.(next.length);
        return next;
      });
    }
  };

  const meId = session?.user?.id;
  const count = comments.length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle size={18} className="text-[#a7a7a7]" />
        <h3 className="text-white font-bold text-base">
          Yorumlar{" "}
          {count > 0 && <span className="text-[#a7a7a7]">({count})</span>}
        </h3>
      </div>

      {/* Yorum yazma kutusu */}
      {session?.user ? (
        <div className="mb-6">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 1000))}
            placeholder="Bu şarkı hakkında ne düşünüyorsun?"
            rows={2}
            className="w-full bg-[#181818] border border-white/10 focus:border-[#1db954] rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#6a6a6a] outline-none resize-none transition-colors"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[#6a6a6a] text-xs">{body.length}/1000</span>
            <button
              onClick={submit}
              disabled={posting || !body.trim()}
              className="text-sm font-bold text-black bg-[#1db954] hover:bg-[#1ed760] rounded-full px-4 py-1.5 transition-colors pressable disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {posting ? "Gönderiliyor..." : "Yorum Yap"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-xl bg-[#181818] border border-white/5 text-center">
          <p className="text-[#a7a7a7] text-sm">
            Yorum yapmak için{" "}
            <Link
              href="/auth/signin"
              className="text-[#1db954] font-semibold hover:underline"
            >
              giriş yap
            </Link>
          </p>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="py-8 flex justify-center">
          <div className="w-5 h-5 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : count === 0 ? (
        <div className="py-10 text-center">
          <p className="text-white font-bold text-lg">Henüz yorum yok</p>
          <p className="text-[#6a6a6a] text-sm mt-1">
            Bu şarkı hakkında ilk yorumu sen yaz.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map((c) => {
            const canDelete =
              meId && (c.userId === meId || songOwnerId === meId);
            return (
              <div key={c.id} className="flex items-start gap-3 group">
                <Link
                  href={c.user ? `/profile/${c.user.username}` : "#"}
                  className="w-9 h-9 rounded-full bg-[#282828] flex-shrink-0 overflow-hidden flex items-center justify-center"
                >
                  {c.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.user.image}
                      alt={c.user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-sm">
                      {c.user?.name?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {c.user ? (
                      <Link
                        href={`/profile/${c.user.username}`}
                        className="text-white text-sm font-bold hover:underline truncate"
                      >
                        {c.user.name}
                      </Link>
                    ) : (
                      <span className="text-[#a7a7a7] text-sm">Bilinmeyen</span>
                    )}
                    <span className="text-[#6a6a6a] text-xs">
                      {relTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-[#cfcfcf] text-sm mt-0.5 whitespace-pre-wrap break-words">
                    {c.body}
                  </p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => remove(c.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[#6a6a6a] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all pressable"
                    title="Sil"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
