"use client";

import { useState, useRef } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Wand2,
  Maximize2,
  RotateCw,
  Loader2,
  Music2,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCredits } from "@/contexts/CreditsContext";

const STYLE_SUGGESTIONS = [
  "pulsing rhythms",
  "raï",
  "sarcastic",
  "slow metal",
  "gospel music",
  "dark trap",
  "synthwave",
  "dreamy indie",
  "arabesk",
  "türk pop",
  "anatolian rock",
  "lo-fi chill",
];

function sampleStyles(n = 5): string[] {
  const day = Math.floor(Date.now() / 86400000);
  return [...STYLE_SUGGESTIONS]
    .sort(
      (a, b) =>
        Math.sin((a.charCodeAt(0) + day) * 13) -
        Math.sin((b.charCodeAt(0) + day) * 13),
    )
    .slice(0, n);
}

type Props = {
  model: string;
  onTaskStarted: (taskId: string, prompt: string, title: string) => void;
};

export default function AdvancedCreateForm({ model, onTaskStarted }: Props) {
  const router = useRouter();
  const { credits, costs, refresh: refreshCredits } = useCredits();
  const [lyrics, setLyrics] = useState("");
  const [style, setStyle] = useState("");
  const [title, setTitle] = useState("");
  const [instrumental] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(true);
  const [stylesOpen, setStylesOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioChipName, setAudioChipName] = useState<string | null>(null);
  const [voiceChipName] = useState<string | null>(null);
  const [inspoChipName] = useState<string | null>(null);
  const [styleTags, setStyleTags] = useState<string[]>(sampleStyles(5));
  const audioInputRef = useRef<HTMLInputElement>(null);

  const generateCost = costs.generate ?? 10;
  const hasEnoughCredits = (credits?.balance ?? 0) >= generateCost;
  const canCreate =
    style.trim().length > 0 &&
    (instrumental || lyrics.trim().length > 0) &&
    !loading &&
    hasEnoughCredits;

  const handleCreate = async () => {
    if (!hasEnoughCredits) {
      router.push("/pricing");
      return;
    }
    if (style.trim().length === 0) return;
    if (!instrumental && lyrics.trim().length === 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: lyrics.trim(),
          style: style.trim(),
          title: title.trim() || undefined,
          instrumental,
          customMode: true,
          model,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setError(data.error || "Kredi yetersiz");
        router.push("/pricing");
        return;
      }
      if (!res.ok) {
        setError(data.error || "Hata oluştu");
        return;
      }
      const taskId = data?.data?.taskId;
      if (!taskId) {
        setError(data.error || data.msg || "Görev başlatılamadı");
        return;
      }
      onTaskStarted(taskId, style.trim(), (title || style).trim().slice(0, 40));
      setLyrics("");
      setStyle("");
      setTitle("");
      refreshCredits();
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  const pickStyleTag = (t: string) => {
    setStyle((prev) => (prev.includes(t) ? prev : prev ? `${prev}, ${t}` : t));
  };

  return (
    <div>
      {/* Audio / Voice / Inspo row */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => audioInputRef.current?.click()}
          className="flex-1 h-12 rounded-full bg-[#141414] border border-[#1f1f1f] hover:bg-[#1a1a1a] flex items-center justify-center gap-2 text-[13px] font-medium text-white transition-colors"
        >
          <Plus size={14} />
          {audioChipName ? "Ses •" : "Ses"}
        </button>
        <button className="flex-1 h-12 rounded-full bg-[#141414] border border-[#1f1f1f] hover:bg-[#1a1a1a] flex items-center justify-center gap-2 text-[13px] font-medium text-white transition-colors relative">
          <Plus size={14} />
          Vokal
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#ec4899] text-white ml-1">
            YENİ
          </span>
        </button>
        <button className="flex-1 h-12 rounded-full bg-[#141414] border border-[#1f1f1f] hover:bg-[#1a1a1a] flex items-center justify-center gap-2 text-[13px] font-medium text-white transition-colors">
          <Plus size={14} />
          İlham
        </button>
      </div>

      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setAudioChipName(f.name);
          e.target.value = "";
        }}
      />

      {/* Lyrics card */}
      <div className="bg-[#141414] rounded-[20px] border border-[#1f1f1f] overflow-hidden mb-3">
        <button
          onClick={() => setLyricsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-2">
            <ChevronDown
              size={16}
              className={`text-white transition-transform ${lyricsOpen ? "" : "-rotate-90"}`}
            />
            <span className="text-white text-[15px] font-semibold">Sözler</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#232323] flex items-center justify-center">
            <Wand2 size={13} className="text-white" />
          </div>
        </button>
        {lyricsOpen && (
          <div className="px-5 pb-4">
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Sözleri buraya yaz veya enstrümantal için boş bırak"
              rows={5}
              className="w-full bg-transparent text-white text-[14px] placeholder-[#555] focus:outline-none resize-none leading-[22px]"
            />
            <div className="flex items-center justify-between mt-2">
              <button
                className="w-7 h-7 flex items-center justify-center text-[#666] hover:text-white"
                title="Bölüm ekle"
              >
                {"|||\\"}
              </button>
              <button
                className="w-8 h-8 rounded-full bg-[#232323] hover:bg-[#2e2e2e] flex items-center justify-center"
                title="Büyüt"
              >
                <Maximize2 size={12} className="text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Styles card */}
      <div className="bg-[#141414] rounded-[20px] border border-[#1f1f1f] overflow-hidden mb-3">
        <button
          onClick={() => setStylesOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-2">
            <ChevronDown
              size={16}
              className={`text-white transition-transform ${stylesOpen ? "" : "-rotate-90"}`}
            />
            <span className="text-white text-[15px] font-semibold">
              Tarzlar
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center">
            <Wand2 size={13} className="text-white" />
          </div>
        </button>
        {stylesOpen && (
          <div className="px-5 pb-4">
            <textarea
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Örn: pulsing rhythms, raï, sarcastic, slow metal"
              rows={3}
              className="w-full bg-transparent text-white text-[14px] placeholder-[#555] focus:outline-none resize-none leading-[22px]"
            />
            <div className="flex items-center gap-2 mt-2 overflow-x-auto scrollbar-hide -mx-5 px-5">
              <button
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-[#666] hover:text-white"
                title="Bölüm"
              >
                {"|||\\"}
              </button>
              <button
                onClick={() => setStyleTags(sampleStyles(5))}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-[#232323] hover:bg-[#2e2e2e] flex items-center justify-center"
                title="Yenile"
              >
                <RotateCw size={12} className="text-white" />
              </button>
              {styleTags.map((t) => (
                <button
                  key={t}
                  onClick={() => pickStyleTag(t)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#232323] hover:bg-[#2e2e2e] text-white text-[13px] transition-colors whitespace-nowrap"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* More Options */}
      <div className="bg-[#141414] rounded-[20px] border border-[#1f1f1f] overflow-hidden mb-3">
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-5 py-4"
        >
          <ChevronRight
            size={16}
            className={`text-white transition-transform ${moreOpen ? "rotate-90" : ""}`}
          />
          <span className="text-white text-[15px] font-semibold">
            Diğer Ayarlar
          </span>
        </button>
        {moreOpen && (
          <div className="px-5 pb-4 text-[#888] text-[13px]">
            (Persona, hız, anahtar, vokal cinsiyeti — yakında)
          </div>
        )}
      </div>

      {/* Song Title */}
      <div className="bg-[#141414] rounded-[20px] border border-[#1f1f1f] overflow-hidden mb-3">
        <div className="flex items-center gap-2 px-5 py-3">
          <Music2 size={14} className="text-[#666]" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Şarkı Başlığı (Opsiyonel)"
            className="flex-1 bg-transparent text-white text-[14px] placeholder-[#555] focus:outline-none"
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-[13px] mt-3 px-1">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={loading || (!canCreate && hasEnoughCredits)}
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

      {/* Unused chip state silencer */}
      <span className="hidden">
        {voiceChipName}
        {inspoChipName}
      </span>
    </div>
  );
}
