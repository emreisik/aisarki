"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePlayer } from "@/contexts/PlayerContext";
import { Music2, AlertCircle } from "lucide-react";

interface TaskInfo {
  taskId: string;
  failed: boolean;
}

/**
 * Minimal ikonik üretim göstergesi — sayfa değişse de kaybolmaz.
 * Tıklanınca /create'e gider, detaylı panel orada.
 */
export default function GlobalProcessingBanner() {
  const { data: session } = useSession();
  const { currentSong } = usePlayer();
  const pathname = usePathname();
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskInfo[]>([]);

  const hideOnCreate = pathname === "/create";

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
        const list: Array<{ taskId: string; status?: string }> =
          data.processing ?? [];
        setTasks(
          list.map((t) => ({
            taskId: t.taskId,
            failed: t.status === "failed",
          })),
        );
      } catch {
        /* sessizce */
      }
    };
    fetchTasks();
    const id = setInterval(fetchTasks, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session?.user]);

  if (hideOnCreate) return null;
  if (tasks.length === 0) return null;

  const failed = tasks.filter((t) => t.failed);
  const processing = tasks.filter((t) => !t.failed);
  const hasFailure = failed.length > 0;
  const allFailed = processing.length === 0 && failed.length > 0;

  // Mobil: MiniPlayer ve BottomNav'ın üstünde; desktop: alt player bar üstünde
  const mobileBottom = currentSong
    ? "calc(76px + env(safe-area-inset-bottom, 0px) + 8px + 70px)"
    : "calc(76px + env(safe-area-inset-bottom, 0px) + 16px)";

  const label = allFailed
    ? `${failed.length} şarkı başarısız — kontrol et`
    : hasFailure
      ? `${processing.length} üretiliyor, ${failed.length} başarısız`
      : `${processing.length} şarkı üretiliyor`;

  return (
    <div className="fixed right-4 z-40" style={{ bottom: mobileBottom }}>
      <button
        type="button"
        onClick={() => router.push("/create")}
        aria-label={label}
        title={label}
        className={`group relative flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/40 ${
          allFailed
            ? "bg-red-500/90 hover:bg-red-500"
            : "bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400"
        }`}
      >
        {/* Pulse halka — sadece aktif üretim varsa */}
        {!allFailed && (
          <span className="absolute inset-0 rounded-full bg-violet-500 animate-ping opacity-40" />
        )}

        {allFailed ? (
          <AlertCircle size={20} className="relative text-white" />
        ) : (
          <Music2 size={20} className="relative text-white animate-pulse" />
        )}

        {/* Sayı rozeti (1'den fazla veya karışık durum) */}
        {tasks.length > 1 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full text-xs font-bold flex items-center justify-center px-1 border border-black/40 ${
              hasFailure && !allFailed
                ? "bg-red-500 text-white"
                : "bg-white text-black"
            }`}
          >
            {tasks.length}
          </span>
        )}
      </button>
    </div>
  );
}
