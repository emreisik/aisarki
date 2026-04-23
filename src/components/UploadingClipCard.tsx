"use client";

import { Music2 } from "lucide-react";

type Props = {
  filename: string;
  progress: number;
  status: "uploading" | "processing" | "error";
  errorMessage?: string;
  onCancel: () => void;
};

export default function UploadingClipCard({
  filename,
  progress,
  status,
  errorMessage,
  onCancel,
}: Props) {
  const label =
    status === "uploading"
      ? "Yükleniyor"
      : status === "processing"
        ? "İşleniyor"
        : errorMessage || "Yükleme başarısız";

  const displayName =
    filename.length > 22 ? `${filename.slice(0, 22)}...` : filename;

  return (
    <div className="mb-4 bg-[#1a1a1a] rounded-[16px] p-4 flex items-center gap-3">
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-[10px] bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600 flex items-center justify-center flex-shrink-0">
        <Music2 size={22} className="text-white/90" strokeWidth={2.2} />
      </div>

      {/* Middle — name + label + progress */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-[14px] font-semibold truncate leading-tight">
          {displayName}
        </p>
        <p
          className={`text-[12px] mt-0.5 ${
            status === "error" ? "text-red-400" : "text-[#888]"
          }`}
        >
          {label}
        </p>

        {status !== "error" && (
          <div className="mt-2 h-[6px] w-full rounded-full bg-[#2a2a2a] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#ec4899] transition-[width] duration-200"
              style={{
                width: `${Math.max(4, Math.min(100, progress))}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="px-4 py-2 rounded-full bg-[#2a2a2a] hover:bg-[#333] text-white text-[13px] font-semibold pressable transition-colors flex-shrink-0"
      >
        {status === "error" ? "Kapat" : "İptal"}
      </button>
    </div>
  );
}
