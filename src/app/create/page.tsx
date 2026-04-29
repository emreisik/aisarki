"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  Suspense,
} from "react";
import { Song } from "@/types";
import { GenerationRowSkeleton } from "@/components/GenerationRow";
import CreateHeader, {
  type CreateMode,
} from "@/components/create/CreateHeader";
import SimpleCreateForm from "@/components/create/SimpleCreateForm";
import AdvancedCreateForm from "@/components/create/AdvancedCreateForm";
import WizardCreateForm from "@/components/create/WizardCreateForm";
import DerivationModal from "@/components/create/DerivationModal";
import StemsModal from "@/components/create/StemsModal";
import SoundsGenerator from "@/components/SoundsGenerator";
import WorkspaceToolbar, {
  type SortKey,
  type FilterToggle,
} from "@/components/workspace/WorkspaceToolbar";
import WorkspaceRow from "@/components/workspace/WorkspaceRow";
import { type MenuAction } from "@/components/workspace/RowContextMenu";
import { usePlayer } from "@/contexts/PlayerContext";
import { useUpload } from "@/contexts/UploadContext";
import { useToast } from "@/contexts/ToastContext";
import { localizeApiError } from "@/lib/sunoErrors";
import { useRouter, useSearchParams } from "next/navigation";

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

export default function CreatePageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center" />
      }
    >
      <CreatePage />
    </Suspense>
  );
}

function CreatePage() {
  const { playSong, currentSong } = usePlayer();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openRecord } = useUpload();
  const toast = useToast();
  const recordParamHandledRef = useRef(false);

  useEffect(() => {
    if (recordParamHandledRef.current) return;
    if (searchParams.get("mode") === "record") {
      recordParamHandledRef.current = true;
      openRecord();
      const url = new URL(window.location.href);
      url.searchParams.delete("mode");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, openRecord]);

  // Create form state
  const [mode, setMode] = useState<CreateMode>("simple");
  const [model, setModel] = useState<string>("V4_5ALL");
  const remixFromSourceId = searchParams.get("remixFrom") || undefined;
  // ?reuse=1 paramı varsa Advanced moda zorla — context menüsünden gelen flow
  // ?wizardAuto=1 paramı varsa Wizard moda zorla — anasayfa hero'sundan gelen flow
  useEffect(() => {
    if (searchParams.get("reuse") === "1") {
      setMode("advanced");
    } else if (searchParams.get("wizardAuto") === "1") {
      setMode("wizard");
    }
  }, [searchParams]);

  const [stemsModal, setStemsModal] = useState<{
    open: boolean;
    song: Song | null;
  }>({ open: false, song: null });
  const [wavGenerating, setWavGenerating] = useState<string | null>(null);
  const [loopsModalOpen, setLoopsModalOpen] = useState(false);

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
  const [derivation, setDerivation] = useState<{
    open: boolean;
    mode: "extend" | "cover" | "mashup";
    song: Song | null;
  }>({ open: false, mode: "extend", song: null });
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
          const e = localizeApiError(data, "Yeniden başlatılamadı");
          toast.error(e.title, e.message);
        }
      } catch {
        toast.error("Bağlantı hatası");
      } finally {
        setRetryingTaskId(null);
      }
    },
    [retryingTaskId, toast],
  );

  const downloadFile = useCallback(
    (url: string, title: string, ext: string) => {
      const safeTitle = (title || "song")
        .replace(/[^\p{L}\p{N}\s.-]+/gu, "")
        .trim()
        .slice(0, 60)
        .replace(/\s+/g, "_");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeTitle || "song"}.${ext}`;
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    [],
  );

  const handleRowAction = useCallback(
    async (action: MenuAction, song: Song) => {
      if (action === "studio") {
        router.push(`/studio/${song.id}`);
        return;
      }
      if (action === "sample") {
        // "Örnek olarak kullan" → Mashup modalını bu şarkı ile aç
        // Kullanıcı 2. şarkıyı seçip Mashup tetikleyecek
        const uploadUrl = song.audioUrl || song.streamUrl;
        if (!uploadUrl) {
          toast.error("Şarkının ses dosyası henüz hazır değil");
          return;
        }
        setDerivation({ open: true, mode: "mashup", song });
        return;
      }
      if (action === "reuse_prompt") {
        // Query param ile Advanced form'a prompt + style + title aktar
        const params = new URLSearchParams();
        params.set("reuse", "1");
        if (song.prompt) params.set("prompt", song.prompt);
        if (song.style) params.set("style", song.style);
        if (song.title) params.set("title", song.title);
        router.replace(`/create?${params.toString()}`);
        return;
      }
      if (action === "extend" || action === "cover" || action === "mashup") {
        if (action !== "extend") {
          const uploadUrl = song.audioUrl || song.streamUrl;
          if (!uploadUrl) {
            toast.error("Şarkının ses dosyası henüz hazır değil");
            return;
          }
        }
        setDerivation({ open: true, mode: action, song });
        return;
      }
      if (action === "stems") {
        setStemsModal({ open: true, song });
        return;
      }
      if (action === "add_vocals" || action === "add_instrumental") {
        const uploadUrl = song.audioUrl || song.streamUrl;
        if (!uploadUrl) {
          toast.error("Şarkının ses dosyası henüz hazır değil");
          return;
        }
        try {
          const endpoint =
            action === "add_vocals"
              ? "/api/add-vocals"
              : "/api/add-instrumental";
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uploadUrl,
              title:
                action === "add_vocals"
                  ? `${song.title} (vokal eklenmiş)`
                  : `${song.title} (enstrümantal eklenmiş)`,
              prompt: song.prompt,
              style: song.style,
              model: model || "V5_5",
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            const e = localizeApiError(data, "İşlem başlatılamadı");
            toast.error(e.title, e.message);
            return;
          }
          const taskId = data.data?.taskId;
          if (taskId) {
            handleTaskStarted(
              taskId,
              song.prompt || song.title,
              action === "add_vocals"
                ? `${song.title} (vokal)`
                : `${song.title} (enstrümantal)`,
            );
            toast.success(
              action === "add_vocals"
                ? "Vokal ekleniyor"
                : "Enstrümantal ekleniyor",
              "Workspace'te ilerlemeyi takip edebilirsin.",
            );
          }
        } catch {
          toast.error("Bağlantı hatası");
        }
        return;
      }
      if (action === "music_video") {
        try {
          // Önce cache GET
          const cached = await fetch(`/api/music-video?songId=${song.id}`).then(
            (r) => r.json(),
          );
          if (cached.mp4Url) {
            window.open(cached.mp4Url, "_blank");
            return;
          }
          const res = await fetch("/api/music-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ songId: song.id }),
          });
          const data = await res.json();
          if (!res.ok) {
            const e = localizeApiError(data, "Video başlatılamadı");
            toast.error(e.title, e.message);
            return;
          }
          if (data.cached && data.mp4Url) {
            window.open(data.mp4Url, "_blank");
            return;
          }
          toast.success(
            "Video üretiliyor",
            "Hazır olduğunda push bildirim gelecek.",
          );
        } catch {
          toast.error("Bağlantı hatası");
        }
        return;
      }
      if (action === "inspiration") {
        const seed = song.style || song.prompt || "";
        if (!seed) {
          toast.error("Bu şarkıdan ilham çıkarılamadı");
          return;
        }
        try {
          const res = await fetch("/api/inspiration", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: seed }),
          });
          const data = await res.json();
          if (!res.ok || !data.result) {
            const e = localizeApiError(data, "İlham üretilemedi");
            toast.error(e.title, e.message);
            return;
          }
          // Detaylı style metnini Advanced forma yolla
          const params = new URLSearchParams();
          params.set("reuse", "1");
          params.set("style", data.result);
          if (song.title) params.set("title", `${song.title} (ilham)`);
          router.replace(`/create?${params.toString()}`);
        } catch {
          toast.error("Bağlantı hatası");
        }
        return;
      }
      if (action === "download_mp3") {
        const url = song.audioUrl || song.streamUrl;
        if (!url) {
          toast.error("Şarkının ses dosyası henüz hazır değil");
          return;
        }
        downloadFile(url, song.title || "song", "mp3");
        return;
      }
      if (action === "download_wav") {
        if (wavGenerating) return;
        const songWithWav = song as Song & { wavUrl?: string };
        if (songWithWav.wavUrl) {
          downloadFile(songWithWav.wavUrl, song.title || "song", "wav");
          return;
        }
        // WAV yoksa cache GET dene, yoksa POST ile üretim başlat
        try {
          const cached = await fetch(`/api/wav?songId=${song.id}`).then((r) =>
            r.json(),
          );
          if (cached.wavUrl) {
            downloadFile(cached.wavUrl, song.title || "song", "wav");
            setSongs((prev) =>
              prev.map((s) =>
                s.id === song.id
                  ? ({ ...s, wavUrl: cached.wavUrl } as Song)
                  : s,
              ),
            );
            return;
          }
          setWavGenerating(song.id);
          const res = await fetch("/api/wav", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ songId: song.id }),
          });
          const data = await res.json();
          if (!res.ok) {
            const e = localizeApiError(data, "WAV üretimi başarısız");
            toast.error(e.title, e.message);
            setWavGenerating(null);
            return;
          }
          if (data.cached && data.wavUrl) {
            downloadFile(data.wavUrl, song.title || "song", "wav");
            setWavGenerating(null);
            return;
          }
          // Background polling — ~3-4 dk sürer
          toast.info(
            "WAV dönüşümü başlatıldı",
            "Hazır olunca otomatik indirilecek (~3-4 dk).",
          );
          // 5 dk polling — hazır olunca otomatik indirelim
          const startedAt = Date.now();
          const poll = async () => {
            if (Date.now() - startedAt > 5 * 60 * 1000) {
              setWavGenerating(null);
              return;
            }
            try {
              const r = await fetch(`/api/wav?songId=${song.id}`);
              const d = await r.json();
              if (d.wavUrl) {
                downloadFile(d.wavUrl, song.title || "song", "wav");
                setSongs((prev) =>
                  prev.map((s) =>
                    s.id === song.id ? ({ ...s, wavUrl: d.wavUrl } as Song) : s,
                  ),
                );
                setWavGenerating(null);
                return;
              }
            } catch {
              /* sessizce */
            }
            setTimeout(poll, 8000);
          };
          setTimeout(poll, 12000);
        } catch {
          toast.error("Bağlantı hatası");
          setWavGenerating(null);
        }
        return;
      }
      if (action === "toggle_visibility") {
        const nextPublic = song.isPublic === false ? true : false;
        // Optimistik güncelle
        setSongs((prev) =>
          prev.map((s) =>
            s.id === song.id ? { ...s, isPublic: nextPublic } : s,
          ),
        );
        try {
          const res = await fetch(`/api/song/${song.id}/visibility`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isPublic: nextPublic }),
          });
          if (!res.ok) {
            // Geri al
            setSongs((prev) =>
              prev.map((s) =>
                s.id === song.id ? { ...s, isPublic: !nextPublic } : s,
              ),
            );
            const data = await res.json().catch(() => ({}));
            const e = localizeApiError(data, "Görünürlük değiştirilemedi");
            toast.error(e.title, e.message);
          } else {
            toast.success(nextPublic ? "Yayımlandı" : "Yayından kaldırıldı");
          }
        } catch {
          setSongs((prev) =>
            prev.map((s) =>
              s.id === song.id ? { ...s, isPublic: !nextPublic } : s,
            ),
          );
          toast.error("Bağlantı hatası");
        }
      }
    },
    [router, downloadFile, wavGenerating, toast, handleTaskStarted, model],
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
            <SimpleCreateForm
              model={model}
              onTaskStarted={handleTaskStarted}
              remixFromSourceId={remixFromSourceId}
            />
          ) : mode === "wizard" ? (
            <WizardCreateForm model={model} onTaskStarted={handleTaskStarted} />
          ) : (
            <AdvancedCreateForm
              model={model}
              onTaskStarted={handleTaskStarted}
              remixFromSourceId={remixFromSourceId}
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
            onOpenLoops={() => setLoopsModalOpen(true)}
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
                    startedAt={i === 0 ? task.startedAt : undefined}
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

      <DerivationModal
        open={derivation.open}
        mode={derivation.mode}
        song={derivation.song}
        model={model}
        onClose={() => setDerivation((d) => ({ ...d, open: false }))}
        onTaskStarted={handleTaskStarted}
      />

      <StemsModal
        open={stemsModal.open}
        song={stemsModal.song}
        onClose={() => setStemsModal({ open: false, song: null })}
      />

      {/* Loop / Sound üretim modal */}
      {loopsModalOpen && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLoopsModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#0f0f0f] border border-[#222] rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a] flex-shrink-0">
              <div>
                <h2 className="text-white text-base font-semibold">
                  Loop / Ses Üret
                </h2>
                <p className="text-[#777] text-xs mt-0.5">
                  Kısa ses, drum loop, bassline, ambient pad…
                </p>
              </div>
              <button
                onClick={() => setLoopsModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#1a1a1a] flex items-center justify-center text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <SoundsGenerator
                onTaskStarted={(taskId, prompt, title) => {
                  handleTaskStarted(taskId, prompt, title);
                  setLoopsModalOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
