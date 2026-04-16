"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePlayer } from "@/contexts/PlayerContext";
import ProcessingBanner, { ProcessingTask } from "./ProcessingBanner";

/**
 * Global üretim banner'ı — sayfa değişse de kaybolmaz.
 * /api/all-songs'tan her 5 saniyede bir processing tasks çeker.
 * Mobile'da MiniPlayer ve BottomNav'ın üstünde, desktop'ta Sidebar yanında üstte.
 */
export default function GlobalProcessingBanner() {
  const { data: session } = useSession();
  const { currentSong } = usePlayer();
  const [tasks, setTasks] = useState<ProcessingTask[]>([]);

  useEffect(() => {
    if (!session?.user) {
      setTasks([]);
      return;
    }
    let cancelled = false;
    const fetchTasks = async () => {
      try {
        const res = await fetch("/api/all-songs", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        const list: Array<{
          taskId: string;
          prompt: string;
          startedAt: string;
          imageUrl?: string;
          title?: string;
        }> = data.processing ?? [];
        setTasks(
          list.map((t) => ({
            taskId: t.taskId,
            title: t.title || t.prompt?.slice(0, 50) || "Şarkı",
            startedAt: t.startedAt,
            imageUrl: t.imageUrl,
          })),
        );
      } catch {
        /* sessizce geç */
      }
    };
    fetchTasks();
    const id = setInterval(fetchTasks, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session?.user]);

  if (tasks.length === 0) return null;

  // Mobil: MiniPlayer ve BottomNav'ın üstünde; desktop: alt player bar üstünde
  const mobileBottom = currentSong
    ? "calc(76px + env(safe-area-inset-bottom, 0px) + 8px + 70px)" // bottom nav + mini player
    : "calc(76px + env(safe-area-inset-bottom, 0px) + 12px)"; // sadece bottom nav

  return (
    <div
      className="fixed left-2 right-2 md:left-auto md:right-4 md:w-[380px] z-40 pointer-events-none"
      style={{ bottom: mobileBottom }}
    >
      <div className="pointer-events-auto">
        <ProcessingBanner tasks={tasks} />
      </div>
    </div>
  );
}
