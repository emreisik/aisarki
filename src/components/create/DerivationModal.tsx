"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Music2, Scissors, Disc3, Shuffle } from "lucide-react";
import { Song } from "@/types";

type Mode = "extend" | "cover" | "mashup";

type Props = {
  open: boolean;
  mode: Mode;
  song: Song | null;
  model: string;
  onClose: () => void;
  onTaskStarted: (taskId: string, prompt: string, title: string) => void;
};

const MODE_CONFIG: Record<
  Mode,
  { label: string; icon: typeof Music2; description: string; cta: string }
> = {
  extend: {
    label: "Şarkıyı Uzat",
    icon: Scissors,
    description:
      "Mevcut şarkıya devam edilecek bölüm üretilir. İsteğe bağlı olarak yeni sözler, tarz ve başlık verebilirsin.",
    cta: "Uzatmayı Başlat",
  },
  cover: {
    label: "Cover Oluştur",
    icon: Disc3,
    description:
      "Bu şarkıyı farklı bir tarzda yeniden ürettirir. Sözler aynı kalır; tarz ve duyguyu sen belirlersin.",
    cta: "Cover Başlat",
  },
  mashup: {
    label: "Mashup Yap",
    icon: Shuffle,
    description:
      "Bu şarkı + ikinci bir şarkıdan harman yapılır. Koleksiyonundan ikinci şarkıyı seç.",
    cta: "Mashup Başlat",
  },
};

export default function DerivationModal({
  open,
  mode,
  song,
  model,
  onClose,
  onTaskStarted,
}: Props) {
  const [continueAt, setContinueAt] = useState<number>(60);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [title, setTitle] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mySongs, setMySongs] = useState<Song[]>([]);
  const [secondSongId, setSecondSongId] = useState<string>("");
  const [songsLoading, setSongsLoading] = useState(false);

  const config = MODE_CONFIG[mode];
  const Icon = config.icon;
  const duration = Math.floor(song?.duration ?? 60);

  useEffect(() => {
    if (!open) return;
    setContinueAt(Math.max(1, Math.min(duration, 60)));
    setPrompt("");
    setStyle(song?.style ?? "");
    setTitle("");
    setInstrumental(false);
    setError("");
    setSecondSongId("");
  }, [open, song, duration]);

  // Mashup modunda kullanıcının şarkılarını çek
  useEffect(() => {
    if (!open || mode !== "mashup") return;
    let cancel = false;
    setSongsLoading(true);
    fetch("/api/all-songs?limit=50")
      .then((r) => r.json())
      .then((d) => {
        if (cancel) return;
        const other = (d.songs as Song[] | undefined)?.filter(
          (s) => s.id !== song?.id && (s.audioUrl || s.streamUrl),
        );
        setMySongs(other ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancel) setSongsLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [open, mode, song?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !song) return null;

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      let url = "";
      let body: Record<string, unknown> = {};
      const srcUrl = song.audioUrl || song.streamUrl;

      if (mode === "extend") {
        if (continueAt <= 0 || continueAt >= duration + 120) {
          setError("Geçersiz başlangıç noktası");
          return;
        }
        url = "/api/extend";
        body = {
          songId: song.id,
          continueAt,
          model,
          instrumental,
          ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
          ...(style.trim() ? { style: style.trim() } : {}),
          ...(title.trim() ? { title: title.trim() } : {}),
        };
      } else if (mode === "cover") {
        if (!srcUrl) {
          setError("Şarkının ses dosyası henüz hazır değil");
          return;
        }
        url = "/api/upload-cover";
        body = {
          uploadUrl: srcUrl,
          model,
          ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
          ...(style.trim() ? { style: style.trim() } : {}),
          ...(title.trim() ? { title: title.trim() } : {}),
        };
      } else if (mode === "mashup") {
        const second = mySongs.find((s) => s.id === secondSongId);
        const secondUrl = second?.audioUrl || second?.streamUrl;
        if (!srcUrl || !secondUrl) {
          setError("İkinci şarkıyı seç");
          return;
        }
        url = "/api/mashup";
        body = {
          uploadUrlList: [srcUrl, secondUrl],
          model,
          instrumental,
          ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
          ...(style.trim() ? { style: style.trim() } : {}),
          ...(title.trim() ? { title: title.trim() } : {}),
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "İşlem başarısız");
        return;
      }
      const taskId = data?.data?.taskId;
      if (!taskId) {
        setError(data.error || data.msg || "Task başlatılamadı");
        return;
      }
      onTaskStarted(
        taskId,
        prompt || style || song.title,
        `${config.label.split(" ")[0]} — ${song.title}`.slice(0, 50),
      );
      onClose();
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[560px] max-h-[92vh] overflow-y-auto bg-[#111] rounded-[24px] border border-[#222] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f1f1f] sticky top-0 bg-[#111] z-10">
          <div className="flex items-center gap-2">
            <Icon size={18} className="text-[#19b35c]" />
            <h2 className="text-white text-[17px] font-semibold">
              {config.label}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#1f1f1f] flex items-center justify-center text-[#888] hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Kaynak şarkı özeti */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
            <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-[#1a1a1a]">
              {song.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={song.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-semibold truncate">
                {song.title || "İsimsiz"}
              </p>
              <p className="text-[#666] text-[11px] truncate">
                {song.style || song.prompt?.slice(0, 60) || "—"}
              </p>
            </div>
            <span className="text-[#666] text-[11px] font-mono">
              {duration}s
            </span>
          </div>

          <p className="text-[#999] text-[12px] leading-[18px]">
            {config.description}
          </p>

          {/* Extend: continueAt slider */}
          {mode === "extend" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-white text-[12px] font-medium uppercase tracking-wide">
                  Başlangıç Noktası
                </label>
                <span className="text-[#19b35c] text-[13px] font-mono">
                  {continueAt}s
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={Math.max(duration, 60)}
                step={1}
                value={continueAt}
                onChange={(e) => setContinueAt(parseInt(e.target.value, 10))}
                className="w-full accent-[#19b35c]"
              />
              <p className="text-[11px] text-[#666] mt-1">
                Şarkının {continueAt}. saniyesinden sonrası yeniden üretilir.
              </p>
            </div>
          )}

          {/* Mashup: ikinci şarkı seçici */}
          {mode === "mashup" && (
            <div>
              <label className="block text-white text-[12px] font-medium mb-2 uppercase tracking-wide">
                İkinci Şarkı
              </label>
              {songsLoading ? (
                <div className="h-11 rounded-xl bg-[#0a0a0a] flex items-center justify-center">
                  <Loader2 size={14} className="animate-spin text-[#666]" />
                </div>
              ) : mySongs.length === 0 ? (
                <p className="text-[#666] text-[12px]">
                  Harman yapılacak ikinci şarkı bulunamadı.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1 border border-[#1a1a1a] rounded-xl p-1">
                  {mySongs.map((s) => (
                    <button
                      key={s.id}
                      onClick={() =>
                        setSecondSongId(secondSongId === s.id ? "" : s.id)
                      }
                      className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors ${
                        secondSongId === s.id
                          ? "bg-[#19b35c]/15"
                          : "hover:bg-[#1a1a1a]"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 bg-[#1a1a1a]">
                        {s.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[12px] font-medium truncate">
                          {s.title || "İsimsiz"}
                        </p>
                        <p className="text-[#666] text-[10px] truncate">
                          {s.style?.split(",")[0] || ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ortak: yeni prompt / style / title */}
          <div className="space-y-3">
            {mode !== "cover" && (
              <div>
                <label className="block text-white text-[12px] font-medium mb-1.5 uppercase tracking-wide">
                  Ek Sözler{" "}
                  <span className="text-[#666] normal-case">(opsiyonel)</span>
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Devam edecek sözler veya tematik yön"
                  rows={2}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-3 py-2 text-white text-[13px] placeholder-[#555] focus:outline-none focus:border-[#333] resize-none"
                />
              </div>
            )}
            <div>
              <label className="block text-white text-[12px] font-medium mb-1.5 uppercase tracking-wide">
                {mode === "cover" ? "Yeni Tarz" : "Tarz"}{" "}
                <span className="text-[#666] normal-case">
                  {mode === "cover" ? "" : "(opsiyonel)"}
                </span>
              </label>
              <input
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder={
                  mode === "cover"
                    ? "Örn: arabesk, dramatic strings"
                    : "Örn: türk pop, anatolian rock"
                }
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-3 py-2.5 text-white text-[13px] placeholder-[#555] focus:outline-none focus:border-[#333]"
              />
            </div>
            <div>
              <label className="block text-white text-[12px] font-medium mb-1.5 uppercase tracking-wide">
                Başlık{" "}
                <span className="text-[#666] normal-case">(opsiyonel)</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Yeni başlık"
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-3 py-2.5 text-white text-[13px] placeholder-[#555] focus:outline-none focus:border-[#333]"
              />
            </div>
            {mode !== "cover" && (
              <button
                onClick={() => setInstrumental((v) => !v)}
                className={`text-[12px] px-3 py-1.5 rounded-full ${
                  instrumental
                    ? "bg-white text-black"
                    : "bg-[#1a1a1a] text-white hover:bg-[#222]"
                }`}
              >
                {instrumental ? "✓ Enstrümantal" : "Enstrümantal"}
              </button>
            )}
          </div>

          {error && <p className="text-red-400 text-[13px]">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || (mode === "mashup" && !secondSongId)}
            className="w-full h-11 rounded-full bg-gradient-to-r from-[#082122] via-[#295b53] to-[#19b35c] text-white text-[14px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Başlatılıyor...
              </>
            ) : (
              <>
                <Icon size={14} />
                {config.cta}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
