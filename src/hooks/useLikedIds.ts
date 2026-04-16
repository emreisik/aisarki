"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Song } from "@/types";

/**
 * Session varsa kullanıcının beğendiği song ID'lerini çeker.
 * `toggle` ile local set'i senkronlar (SongCard.onToggleLike callback'i).
 */
export function useLikedIds() {
  const { data: session } = useSession();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    fetch("/api/likes/ids")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d.ids)) {
          setIds(new Set(d.ids as string[]));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  const toggle = useCallback((_song: Song, nextLiked: boolean) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (nextLiked) next.add(_song.id);
      else next.delete(_song.id);
      return next;
    });
  }, []);

  return { likedIds: ids, toggleLiked: toggle, hasSession: !!session?.user };
}
