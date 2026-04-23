"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Song } from "@/types";
import { GenerationRowSkeleton } from "@/components/GenerationRow";
import CreateHeader, {
  type CreateMode,
} from "@/components/create/CreateHeader";
import SimpleCreateForm from "@/components/create/SimpleCreateForm";
import AdvancedCreateForm from "@/components/create/AdvancedCreateForm";
import WorkspaceToolbar, {
  type SortKey,
  type FilterToggle,
} from "@/components/workspace/WorkspaceToolbar";
import WorkspaceRow from "@/components/workspace/WorkspaceRow";
import { type MenuAction } from "@/components/workspace/RowContextMenu";
import { usePlayer } from "@/contexts/PlayerContext";
import { useRouter } from "next/navigation";

interface ProcessingTaskState {
  taskId: string;
  title: string;
  startedAt: string;
  imageUrl?: string;
  failed?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  attempts?: number;
}

const PAGE_SIZE = 10;
const VARIANT_COUNT = 2;

export default function CreatePage() {
  const { playSong, currentSong } = usePlayer();
  const router = useRouter();

  // Create form state
  const [mode, setMode] = useState<CreateMode>("simple");
  const [model, setModel] = useState<string>("V4_5ALL");

  // Workspace state
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [toggles, setToggles] = useState<Record<FilterToggle, boolean>>({
    liked: false,
    public: false,
    uploads: false,
  });
  const [page, setPage] = useState(1);

  // Feed state
  const [processingTasks, setProcessingTasks] = useState<ProcessingTaskState[]>(
    [],
  );
  const [songs, setSongs] = useState<Song[]>([]);
  const pollingRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const mountedRef = useRef(true);
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollingRef.current.forEach((t) => clearTimeout(t));
      pollingRef.current.clear();
    };
  }, []);

  const startPolling = useCallback((taskId: string) => {
    if (pollingRef.current.has(taskId)) return;
    let attempts = 0;
    let errorCount = 0;
    const MAX_ATTEMPTS = 300;
    const MAX_ERRORS = 10;
    const POLL_INTERVAL = 2000;
    const ERROR_RETRY_INTERVAL = 3000;

    const poll = async () => {
      if (!mountedRef.current) return;
      const n = ++attempts;
      if (n > MAX_ATTEMPTS) {
        pollingRef.current.delete(taskId);
        setProcessingTasks((prev) =>
          prev.map((t) => (t.taskId === taskId ? { ...t, failed: true } : t)),
        );
        return;
      }
      if (n % 10 === 0) {
        setProcessingTasks((prev) =>
          prev.map((t) => (t.taskId === taskId ? { ...t, attempts: n } : t)),
        );
      }
      try {
        const res = await fetch(`/api/songs?taskId=${taskId}`);
        const data: { status: string; songs: Song[] } = await res.json();
        const previewImage = data.songs?.find((s) => s.imageUrl)?.imageUrl;
        if (previewImage) {
          setProcessingTasks((prev) =>
            prev.map((t) =>
              t.taskId === taskId && !t.imageUrl
                ? { ...t, imageUrl: previewImage }
                : t,
            ),
          );
        }
        if (data.status === "failed" || data.status === "error") {
          pollingRef.current.delete(taskId);
          setProcessingTasks((prev) =>
            prev.map((t) =>
              t.taskId === taskId
                ? {
                    ...t,
                    failed: true,
                    errorTitle:
                      ((data as Record<string, unknown>)
                        .errorTitle as string) || "Üretim başarısız",
                    errorMessage:
                      ((data as Record<string, unknown>)
                        .errorMessage as string) || "Tekrar deneyebilirsin",
                  }
                : t,
            ),
          );
          return;
        }
        const playableSongs = (data.songs ?? []).filter(
          (s) => s.audioUrl || s.streamUrl,
        );
        if (data.status === "complete" && playableSongs.length > 0) {
          pollingRef.current.delete(taskId);
          setProcessingTasks((prev) => prev.filter((t) => t.taskId !== taskId));
          setSongs((prev) => {
            const ids = new Set(prev.map((s) => s.id));
            const fresh = playableSongs.filter((s) => !ids.has(s.id));
            return [...fresh, ...prev].slice(0, 80);
          });
          return;
        }
        errorCount = 0;
        const timer = setTimeout(poll, POLL_INTERVAL);
        pollingRef.current.set(taskId, timer);
      } catch {
        errorCount++;
        if (errorCount > MAX_ERRORS) {
          pollingRef.current.delete(taskId);
          setProcessingTasks((prev) =>
            prev.map((t) => (t.taskId === taskId ? { ...t, failed: true } : t)),
          );
          return;
        }
        const timer = setTimeout(poll, ERROR_RETRY_INTERVAL);
        pollingRef.current.set(taskId, timer);
      }
    };
    const timer = setTimeout(poll, POLL_INTERVAL);
    pollingRef.current.set(taskId, timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchFeed = async () => {
      try {
        const res = await fetch("/api/all-songs?limit=40", {
          cache: "no-store",
        });
        const d = await res.json();
        if (cancelled || !mountedRef.current) return;

        const tasks: Array<{
          taskId: string;
          prompt: string;
          startedAt: string;
          status?: "processing" | "failed";
          imageUrl?: string;
          title?: string;
          errorTitle?: string;
          errorMessage?: string;
        }> = d.processing ?? [];

        setProcessingTasks((prev) =>
          tasks.map((t) => ({
            taskId: t.taskId,
            title: t.title || t.prompt?.slice(0, 50) || "Şarkı",
            startedAt: t.startedAt,
            imageUrl: t.imageUrl,
            failed: t.status === "failed",
            errorTitle: t.errorTitle,
            errorMessage: t.errorMessage,
            attempts: prev.find((p) => p.taskId === t.taskId)?.attempts,
          })),
        );

        if (Array.isArray(d.songs)) {
          setSongs((prev) => {
            const byId = new Map<string, Song>();
            for (const s of prev) byId.set(s.id, s);
            for (const s of d.songs as Song[]) byId.set(s.id, s);
            const merged = Array.from(byId.values()).sort((a, b) =>
              (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
            );
            return merged.slice(0, 80);
          });
        }
      } catch {
        /* sessizce */
      }
    };
    fetchFeed();
    const id = setInterval(fetchFeed, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    processingTasks.forEach((t) => {
      if (!t.failed) startPolling(t.taskId);
    });
  }, [processingTasks, startPolling]);

  const handleTaskStarted = useCallback(
    (taskId: string, prompt: string, title: string) => {
      const newTask: ProcessingTaskState = {
        taskId,
        title: title || prompt.slice(0, 50),
        startedAt: new Date().toISOString(),
      };
      setProcessingTasks((prev) => {
        if (prev.some((t) => t.taskId === taskId)) return prev;
        return [newTask, ...prev];
      });
    },
    [],
  );

  const handlePlay = useCallback(
    (song: Song, list: Song[]) => {
      playSong(song, list);
    },
    [playSong],
  );

  const handleShare = useCallback(async (song: Song) => {
    const url = `${window.location.origin}/song/${song.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: song.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* iptal */
    }
  }, []);

  const handleDismissFailed = useCallback(async (taskId: string) => {
    setProcessingTasks((prev) => prev.filter((t) => t.taskId !== taskId));
    try {
      await fetch(`/api/processing-tasks/${taskId}`, { method: "DELETE" });
    } catch {
      /* sessizce */
    }
  }, []);

  const handleRetry = useCallback(
    async (taskId: string) => {
      if (retryingTaskId) return;
      setRetryingTaskId(taskId);
      try {
        const res = await fetch(`/api/tasks/${taskId}/retry`, {
          method: "POST",
        });
        const data = await res.json();
        if (res.ok) {
          setProcessingTasks((prev) => prev.filter((t) => t.taskId !== taskId));
        } else {
          alert(data.error || "Yeniden başlatılamadı");
        }
      } catch {
        alert("Bağlantı hatası");
      } finally {
        setRetryingTaskId(null);
      }
    },
    [retryingTaskId],
  );

  const handleRowAction = useCallback(
    async (action: MenuAction, song: Song) => {
      if (action === "reuse_prompt") {
        setMode("advanced");
        // Advanced form kendi state'ini yönetiyor — query param ile iletmek isterseniz
        // gelecekte ek bir event bus düşünülebilir. Şimdilik sadece kullanıcıyı yönlendir.
        return;
      }
      if (action === "extend") {
        const defaultAt = Math.max(1, Math.floor(song.duration ?? 60));
        const ans = window.prompt(
          "Hangi saniyeden itibaren uzatılsın?",
          String(defaultAt),
        );
        if (ans == null) return;
        const continueAt = Number(ans);
        if (!Number.isFinite(continueAt) || continueAt <= 0) {
          alert("Geçerli bir saniye gir (ör. 60)");
          return;
        }
        try {
          const res = await fetch("/api/extend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              songId: song.id,
              continueAt,
              model,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            alert(data.error || "Uzatma başarısız");
            return;
          }
          const taskId = data?.data?.taskId;
          if (taskId) {
            handleTaskStarted(
              taskId,
              song.prompt || song.style || song.title,
              `Uzatma — ${song.title}`,
            );
          }
        } catch {
          alert("Bağlantı hatası");
        }
        return;
      }
      if (action === "cover") {
        const uploadUrl = song.audioUrl || song.streamUrl;
        if (!uploadUrl) {
          alert("Şarkının ses dosyası henüz hazır değil");
          return;
        }
        try {
          const res = await fetch("/api/upload-cover", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uploadUrl,
              model,
              ...(song.style ? { style: song.style } : {}),
              ...(song.title ? { title: song.title } : {}),
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            alert(data.error || "Cover başarısız");
            return;
          }
          const taskId = data?.data?.taskId;
          if (taskId) {
            handleTaskStarted(
              taskId,
              song.style || song.title,
              `Cover — ${song.title}`,
            );
          }
        } catch {
          alert("Bağlantı hatası");
        }
        return;
      }
      if (action === "mashup") {
        alert("Mashup için ikinci bir şarkı seç — yakında panel açılacak");
        return;
      }
      alert("Bu özellik yakında");
    },
    [handleTaskStarted, model],
  );

  // Filtered / sorted / paginated songs
  const filteredSongs = useMemo(() => {
    let list = songs;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.style?.toLowerCase().includes(q) ||
          s.prompt?.toLowerCase().includes(q),
      );
    }
    if (toggles.liked) list = list.filter((s) => s.liked);
    if (toggles.uploads) {
      list = list.filter((s) => {
        const e = s as unknown as { sourceType?: string; isUpload?: boolean };
        return (
          e.isUpload ||
          e.sourceType === "upload" ||
          e.sourceType === "upload-extend"
        );
      });
    }
    if (toggles.public) {
      list = list.filter(
        (s) => (s as unknown as { isPublic?: boolean }).isPublic !== false,
      );
    }
    const sorted = [...list].sort((a, b) => {
      if (sort === "newest") {
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      }
      if (sort === "oldest") {
        return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
      }
      return (b.playCount ?? 0) - (a.playCount ?? 0);
    });
    return sorted;
  }, [songs, query, toggles, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredSongs.length / PAGE_SIZE));
  const pageSongs = filteredSongs.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const activeFilterCount =
    (toggles.liked ? 1 : 0) +
    (toggles.public ? 1 : 0) +
    (toggles.uploads ? 1 : 0);

  const hasActivity = processingTasks.length > 0 || filteredSongs.length > 0;

  return (
    <div className="min-h-full bg-[#0a0a0a]">
      <div className="mx-auto max-w-[1600px] px-4 lg:px-6 pt-4 pb-28 flex flex-col lg:flex-row lg:gap-6">
        {/* LEFT — Create */}
        <div className="w-full lg:w-[440px] lg:flex-shrink-0 lg:sticky lg:top-0 lg:self-start lg:max-h-[calc(100vh-90px)] lg:overflow-y-auto scrollbar-hide">
          <CreateHeader
            mode={mode}
            onModeChange={setMode}
            model={model}
            onModelChange={setModel}
          />
          <div className="h-px bg-[#1a1a1a] mb-4" />
          {mode === "simple" ? (
            <SimpleCreateForm model={model} onTaskStarted={handleTaskStarted} />
          ) : (
            <AdvancedCreateForm
              model={model}
              onTaskStarted={handleTaskStarted}
            />
          )}
        </div>

        {/* RIGHT — Workspace */}
        <div className="flex-1 min-w-0 mt-8 lg:mt-0 lg:pl-6 lg:border-l lg:border-[#141414]">
          <WorkspaceToolbar
            query={query}
            onQueryChange={setQuery}
            activeFilterCount={activeFilterCount}
            sort={sort}
            onSortChange={setSort}
            toggles={toggles}
            onToggle={(t) => setToggles((prev) => ({ ...prev, [t]: !prev[t] }))}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />

          <div className="mt-4 flex flex-col gap-0.5">
            {processingTasks.map((task) =>
              task.failed ? (
                <GenerationRowSkeleton
                  key={task.taskId}
                  failed
                  errorTitle={task.errorTitle}
                  errorMessage={task.errorMessage}
                  onCancel={() => handleDismissFailed(task.taskId)}
                  onRetry={() => handleRetry(task.taskId)}
                  retrying={retryingTaskId === task.taskId}
                />
              ) : (
                Array.from({ length: VARIANT_COUNT }).map((_, i) => (
                  <GenerationRowSkeleton
                    key={`${task.taskId}:${i}`}
                    imageHint={task.imageUrl}
                    onCancel={
                      i === 0
                        ? () => handleDismissFailed(task.taskId)
                        : undefined
                    }
                  />
                ))
              ),
            )}

            {pageSongs.map((song) => (
              <WorkspaceRow
                key={song.id}
                song={song}
                isPlaying={currentSong?.id === song.id}
                onPlay={() => handlePlay(song, pageSongs)}
                onOpenDetail={() => router.push(`/song/${song.id}`)}
                onShare={() => handleShare(song)}
                onAction={handleRowAction}
              />
            ))}
          </div>

          {!hasActivity && (
            <div className="flex flex-col items-center py-24 text-center">
              <p className="text-[#444] text-sm">
                Oluşturduğun şarkılar burada görünür
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
