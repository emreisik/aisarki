"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dice5,
  Check,
  Music2,
  Loader2,
  Plus,
  Lock,
  Mic,
  Upload,
} from "lucide-react";
import InspirationTags from "./InspirationTags";
import UploadingClipCard from "@/components/UploadingClipCard";
import { useUpload } from "@/contexts/UploadContext";
import { useCredits } from "@/contexts/CreditsContext";
import { useToast } from "@/contexts/ToastContext";
import { localizeApiError } from "@/lib/sunoErrors";
import { useRouter } from "next/navigation";

const DESCRIPTION_EXAMPLES = [
  "Gece yarısı sahilde yürüyüş, lo-fi chill hop",
  "Hüzünlü arabesk, yağmurlu İstanbul akşamı",
  "Enerjik türk rap, dostluk teması",
  "Akustik gitar ve vokal, dağ kampı",
  "Synthwave 80'ler, neon şehir gece sürüşü",
  "Neşeli pop, plajda yaz kutlaması",
  "Epic sinematik, fantastik destan",
];

type Props = {
  model: string;
  onTaskStarted: (taskId: string, prompt: string, title: string) => void;
  remixFromSourceId?: string;
};

type HeroUpload = {
  filename: string;
  phase: "uploading" | "processing" | "error";
  progress: number;
  errorMessage?: string;
  xhr?: XMLHttpRequest;
} | null;

export default function SimpleCreateForm({
  model,
  onTaskStarted,
  remixFromSourceId,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const { credits, costs, refresh: refreshCredits } = useCredits();
  const [description, setDescription] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [lyrics, setLyrics] = useState("");
  const [showLyrics, setShowLyrics] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const audioInputRef = useRef<HTMLInputElement>(null);
  const { pending, setPending, openRecord } = useUpload();
  const [heroUpload, setHeroUpload] = useState<HeroUpload>(null);
  const heroStartedRef = useRef<number | null>(null);
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
  const audioMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!audioMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!audioMenuRef.current?.contains(e.target as Node)) {
        setAudioMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [audioMenuOpen]);

  const generateCost = costs.generate ?? 10;
  const hasEnoughCredits = (credits?.balance ?? 0) >= generateCost;

  const handleDice = () => {
    const i = Math.floor(Math.random() * DESCRIPTION_EXAMPLES.length);
    setDescription(DESCRIPTION_EXAMPLES[i]);
  };

  const handleAudioPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPending({ file: f, startedAt: Date.now() });
    e.target.value = "";
  };

  const startHeroUpload = useCallback(
    (file: File) => {
      const xhr = new XMLHttpRequest();
      setHeroUpload({
        filename: file.name,
        phase: "uploading",
        progress: 0,
        xhr,
      });
      const form = new FormData();
      form.append("file", file, file.name);
      xhr.open("POST", "/api/upload-audio");
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        setHeroUpload((p) => (p ? { ...p, progress: Math.min(99, pct) } : p));
      };
      xhr.onload = async () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          setHeroUpload((p) =>
            p ? { ...p, phase: "error", errorMessage: "Dosya yüklenemedi" } : p,
          );
          return;
        }
        let uploadUrl = "";
        try {
          uploadUrl = JSON.parse(xhr.responseText).url;
        } catch {
          /* parse error */
        }
        if (!uploadUrl) {
          setHeroUpload((p) =>
            p ? { ...p, phase: "error", errorMessage: "Geçersiz yanıt" } : p,
          );
          return;
        }
        setHeroUpload((p) =>
          p ? { ...p, progress: 100, phase: "processing" } : p,
        );
        try {
          const res = await fetch("/api/upload-extend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uploadUrl,
              model,
              ...(description.trim() ? { prompt: description.trim() } : {}),
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            setHeroUpload((p) =>
              p
                ? {
                    ...p,
                    phase: "error",
                    errorMessage: data.error || "Şarkı oluşturulamadı",
                  }
                : p,
            );
            return;
          }
          const taskId = data?.data?.taskId;
          if (taskId) {
            onTaskStarted(
              taskId,
              file.name,
              file.name.replace(/\.[^/.]+$/, ""),
            );
          }
          setHeroUpload(null);
          setPending(null);
        } catch {
          setHeroUpload((p) =>
            p ? { ...p, phase: "error", errorMessage: "Bağlantı hatası" } : p,
          );
        }
      };
      xhr.onerror = () =>
        setHeroUpload((p) =>
          p ? { ...p, phase: "error", errorMessage: "Bağlantı hatası" } : p,
        );
      xhr.onabort = () => {
        setHeroUpload(null);
        setPending(null);
      };
      xhr.send(form);
    },
    [description, model, onTaskStarted, setPending],
  );

  // pending -> start upload (useEffect — render sırasında setState yok)
  useEffect(() => {
    if (!pending) return;
    if (heroStartedRef.current === pending.startedAt) return;
    heroStartedRef.current = pending.startedAt;
    startHeroUpload(pending.file);
  }, [pending, startHeroUpload]);

  const cancelHeroUpload = () => {
    setHeroUpload((p) => {
      if (p?.xhr && p.phase === "uploading") {
        try {
          p.xhr.abort();
        } catch {
          /* already aborted */
        }
      }
      return null;
    });
    setPending(null);
    heroStartedRef.current = null;
  };

  const handleCreate = async () => {
    if (!description.trim()) return;
    if (!hasEnoughCredits) {
      router.push("/pricing");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: description.trim(),
          instrumental,
          customMode: false,
          model,
          ...(remixFromSourceId ? { remixFromSourceId } : {}),
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        const e = localizeApiError(data, "Kredi yetersiz");
        setError(`${e.title}${e.message ? `: ${e.message}` : ""}`);
        toast.error(e.title, e.message);
        router.push("/pricing");
        return;
      }
      if (!res.ok) {
        const e = localizeApiError(data, "Hata oluştu");
        setError(`${e.title}${e.message ? `: ${e.message}` : ""}`);
        toast.error(e.title, e.message);
        return;
      }
      const taskId = data?.data?.taskId;
      if (!taskId) {
        const e = localizeApiError(data, "Görev başlatılamadı");
        setError(`${e.title}${e.message ? `: ${e.message}` : ""}`);
        toast.error(e.title, e.message);
        return;
      }
      onTaskStarted(
        taskId,
        description.trim(),
        description.trim().slice(0, 40),
      );
      setDescription("");
      setLyrics("");
      // Kredi bakiyesini hemen güncelle
      refreshCredits();
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  const canCreate =
    description.trim().length > 0 && !loading && hasEnoughCredits;

  return (
    <div>
      {heroUpload && (
        <UploadingClipCard
          filename={heroUpload.filename}
          progress={heroUpload.progress}
          status={heroUpload.phase}
          errorMessage={heroUpload.errorMessage}
          onCancel={cancelHeroUpload}
        />
      )}

      {/* Main description card */}
      <div className="bg-[#141414] rounded-[20px] p-5 border border-[#1f1f1f]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white text-[15px] font-semibold">
            Şarkı Açıklaması
          </span>
          <button
            onClick={handleDice}
            title="Rastgele"
            className="w-9 h-9 rounded-full bg-[#232323] hover:bg-[#2e2e2e] flex items-center justify-center transition-colors"
          >
            <Dice5 size={15} className="text-white" />
          </button>
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Nasıl bir şarkı istiyorsun?"
          rows={4}
          className="w-full bg-transparent text-white text-[15px] placeholder-[#555] focus:outline-none resize-none leading-[22px]"
        />

        {showLyrics && (
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Sözleri buraya yaz (opsiyonel)"
            rows={4}
            className="w-full mt-2 pt-3 border-t border-[#2a2a2a] bg-transparent text-white text-[14px] placeholder-[#555] focus:outline-none resize-none leading-[22px]"
          />
        )}

        {/* Action row */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-2">
            <div className="relative" ref={audioMenuRef}>
              <button
                onClick={() => setAudioMenuOpen((v) => !v)}
                className="h-9 px-3.5 rounded-full bg-[#232323] hover:bg-[#2e2e2e] text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
              >
                <Plus size={14} />
                Ses
              </button>
              {audioMenuOpen && (
                <div className="absolute bottom-[44px] left-0 bg-[#2a2a2a] rounded-[12px] py-[6px] shadow-2xl shadow-black/60 z-50 min-w-[180px] border border-[#3a3a3a]">
                  <button
                    onClick={() => {
                      setAudioMenuOpen(false);
                      openRecord();
                    }}
                    className="flex items-center gap-[10px] px-[14px] py-[10px] hover:bg-[#333] transition-colors w-full text-left pressable"
                  >
                    <Mic size={15} className="text-[#ccc]" />
                    <span className="text-white text-[13px] font-medium">
                      Mikrofon ile kaydet
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setAudioMenuOpen(false);
                      audioInputRef.current?.click();
                    }}
                    className="flex items-center gap-[10px] px-[14px] py-[10px] hover:bg-[#333] transition-colors w-full text-left pressable"
                  >
                    <Upload size={15} className="text-[#ccc]" />
                    <span className="text-white text-[13px] font-medium">
                      Cihazdan yükle
                    </span>
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowLyrics((v) => !v)}
              className={`h-9 px-3.5 rounded-full text-[13px] font-medium flex items-center gap-1.5 transition-colors ${
                showLyrics
                  ? "bg-white text-black"
                  : "bg-[#232323] hover:bg-[#2e2e2e] text-white"
              }`}
            >
              <Plus size={14} />
              Sözler
            </button>
          </div>

          <button
            onClick={() => setInstrumental((v) => !v)}
            className={`h-9 px-3.5 rounded-full border text-[13px] font-medium flex items-center gap-1.5 transition-colors ${
              instrumental
                ? "border-[#1db954] text-[#1db954]"
                : "border-[#2a2a2a] text-[#aaa] hover:text-white"
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center ${
                instrumental ? "bg-[#1db954]" : "border border-[#444]"
              }`}
            >
              {instrumental && <Check size={10} className="text-black" />}
            </span>
            Enstrümantal
          </button>
        </div>

        <InspirationTags
          onPick={(tag) => {
            setDescription((prev) => (prev ? `${prev}, ${tag}` : tag));
          }}
        />
      </div>

      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioPick}
      />

      {error && <p className="text-red-400 text-[13px] mt-3 px-1">{error}</p>}

      <button
        onClick={() => {
          if (!hasEnoughCredits) router.push("/pricing");
          else handleCreate();
        }}
        disabled={
          loading || (description.trim().length === 0 && hasEnoughCredits)
        }
        className={`mt-4 w-full h-12 rounded-full flex items-center justify-center gap-2 text-[14px] font-semibold transition-all ${
          !hasEnoughCredits
            ? "bg-[#2a2a2a] text-white hover:bg-[#333]"
            : canCreate
              ? "text-white hover:opacity-90"
              : "bg-[#1f1f1f] text-[#666] cursor-not-allowed"
        }`}
        style={
          canCreate && hasEnoughCredits
            ? {
                background:
                  "linear-gradient(45deg, #082122 0%, #295b53 40%, #19b35c 75%, #fcff9a 100%)",
              }
            : undefined
        }
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : !hasEnoughCredits ? (
          <>
            <Lock size={14} />
            Krediyi Yükselt ({generateCost} kredi gerekli)
          </>
        ) : (
          <>
            <Music2 size={15} />
            Oluştur · {generateCost} kredi
          </>
        )}
      </button>
    </div>
  );
}
