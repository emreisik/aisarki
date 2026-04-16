"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const [tasks, setTasks] = useState<ProcessingTask[]>([]);

  // /create sayfasında inline panel var, floating banner'ı gizle
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
        const list: Array<{
          taskId: string;
          prompt: string;
          startedAt: string;
          status?: "processing" | "failed";
          imageUrl?: string;
          title?: string;
          errorTitle?: string;
          errorMessage?: string;
        }> = data.processing ?? [];
        setTasks(
          list.map((t) => ({
            taskId: t.taskId,
            title: t.title || t.prompt?.slice(0, 50) || "Şarkı",
            startedAt: t.startedAt,
            imageUrl: t.imageUrl,
            failed: t.status === "failed",
            errorTitle: t.errorTitle,
            errorMessage: t.errorMessage,
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

  const handleDismissFailed = async (taskId: string) => {
    // UI'dan hemen kaldır
    setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
    // Backend'den de sil
    try {
      await fetch(`/api/processing-tasks/${taskId}`, { method: "DELETE" });
    } catch {
      /* sessizce geç */
    }
  };

  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);
  const handleRetry = async (taskId: string) => {
    if (retryingTaskId) return;
    setRetryingTaskId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        // Eski failed task'ı UI'dan kaldır
        setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
      } else {
        // Hata — kullanıcıya bildir (basit alert yeterli)
        alert(data.error || "Yeniden başlatılamadı");
      }
    } catch {
      alert("Bağlantı hatası");
    } finally {
      setRetryingTaskId(null);
    }
  };

  if (hideOnCreate) return null;
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
        <ProcessingBanner
          tasks={tasks}
          onDismissFailed={handleDismissFailed}
          onCancel={handleDismissFailed}
          onRetry={handleRetry}
          retryingTaskId={retryingTaskId}
        />
      </div>
    </div>
  );
}
