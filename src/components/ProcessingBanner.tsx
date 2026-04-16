"use client";

import { Loader2, AlertTriangle, RotateCcw } from "lucide-react";

export interface ProcessingTask {
  taskId: string;
  title: string;
  startedAt: string;
  attempts?: number;
  failed?: boolean;
  imageUrl?: string;
  errorTitle?: string;
  errorMessage?: string;
}

export default function ProcessingBanner({
  tasks,
  onDismissFailed,
  onRetry,
  retryingTaskId,
}: {
  tasks: ProcessingTask[];
  onDismissFailed?: (taskId: string) => void;
  onRetry?: (taskId: string) => void;
  retryingTaskId?: string | null;
}) {
  if (tasks.length === 0) return null;

  const activeTasks = tasks.filter((t) => !t.failed);
  const failedTasks = tasks.filter((t) => t.failed);

  return (
    <div className="flex flex-col gap-3">
      {activeTasks.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-[#1db954]/30 bg-gradient-to-br from-[#0d1f14] via-[#0a1810] to-[#0a0a0a] shadow-[0_0_40px_rgba(29,185,84,0.12)]">
          {/* Glowing top bar */}
          <div
            className="h-1 w-full"
            style={{
              background:
                "linear-gradient(90deg, #1db954 0%, #17a349 50%, #1db954 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2s linear infinite",
            }}
          />

          <div className="px-4 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1db954]/15 flex items-center justify-center">
                <Loader2 size={16} className="text-[#1db954] animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-bold">
                  {activeTasks.length === 1
                    ? "Şarkın yapay zeka ile üretiliyor"
                    : `${activeTasks.length} şarkı üretiliyor`}
                </p>
                <p className="text-[#1db954]/80 text-xs mt-0.5">
                  Sayfa yenilenirse devam eder · ~1–3 dk
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {activeTasks.map((t) => (
                <div
                  key={t.taskId}
                  className="flex items-center gap-3 bg-black/30 border border-white/5 rounded-xl p-2.5"
                >
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#1db954]/20 to-[#0d1f14]">
                    {t.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{
                          filter: "blur(6px) saturate(1.2)",
                          transform: "scale(1.2)",
                        }}
                      />
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(29,185,84,0.4), rgba(13,31,20,0.8))",
                          backgroundSize: "200% 200%",
                          animation: "shimmer 3s ease-in-out infinite",
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2
                        size={20}
                        className="text-white/90 animate-spin"
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">
                      {t.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-end gap-[2px] h-3 flex-shrink-0">
                        {[0, 0.2, 0.1, 0.3, 0.05].map((d, i) => (
                          <span
                            key={i}
                            className="wave-bar rounded-sm"
                            style={{
                              width: "2px",
                              height: "100%",
                              background: "#1db954",
                              animationDelay: `${d}s`,
                            }}
                          />
                        ))}
                      </span>
                      <span className="text-[#1db954]/80 text-xs">
                        {t.attempts != null
                          ? `${t.attempts}. deneme`
                          : "Üretiliyor..."}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {failedTasks.map((t) => (
        <div
          key={t.taskId}
          className="rounded-2xl border border-red-500/40 bg-gradient-to-br from-[#2a0d0d] to-[#1a0808] shadow-[0_0_30px_rgba(239,68,68,0.15)] overflow-hidden"
        >
          <div className="h-1 w-full bg-gradient-to-r from-red-500 via-red-400 to-red-500" />
          <div className="px-4 py-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold">
                {t.errorTitle || "Şarkı oluşturulamadı"}
              </p>
              <p className="text-red-200/80 text-xs mt-1 leading-relaxed">
                {t.errorMessage ||
                  "Şarkı üretimi tamamlanamadı. Kredilerin iade edildi, lütfen tekrar dene."}
              </p>
              {t.title && (
                <p className="text-[#7a7a7a] text-[11px] mt-2 italic truncate">
                  &ldquo;{t.title}&rdquo;
                </p>
              )}
              <div className="flex items-center gap-2 mt-3">
                {onRetry && (
                  <button
                    onClick={() => onRetry(t.taskId)}
                    disabled={retryingTaskId === t.taskId}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] hover:scale-105 rounded-full px-3.5 py-1.5 transition-all pressable disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {retryingTaskId === t.taskId ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Yeniden başlatılıyor...
                      </>
                    ) : (
                      <>
                        <RotateCcw size={12} />
                        Tekrar Dene
                      </>
                    )}
                  </button>
                )}
                {onDismissFailed && (
                  <button
                    onClick={() => onDismissFailed(t.taskId)}
                    className="text-xs font-semibold text-red-300 hover:text-white border border-red-500/40 hover:border-red-500 hover:bg-red-500/10 rounded-full px-3 py-1.5 transition-colors pressable"
                  >
                    Kapat
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
