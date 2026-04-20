"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { usePlayer } from "@/contexts/PlayerContext";
import { Loader2, ChevronDown } from "lucide-react";

interface SoundsGeneratorProps {
  onTaskStarted: (taskId: string, prompt: string, title: string) => void;
}

const SOUND_KEYS = [
  "Any",
  "A",
  "A#",
  "Am",
  "A#m",
  "B",
  "Bm",
  "C",
  "C#",
  "Cm",
  "C#m",
  "D",
  "D#",
  "Dm",
  "D#m",
  "E",
  "Em",
  "F",
  "F#",
  "Fm",
  "F#m",
  "G",
  "G#",
  "Gm",
  "G#m",
];

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer select-none">
      <span className="text-white text-[13px] font-semibold">{label}</span>
      <span
        className="relative w-[38px] h-[22px] rounded-full transition-colors flex-shrink-0"
        style={{ background: checked ? "#1db954" : "#333" }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span
          className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all"
          style={{ left: checked ? "17px" : "2px" }}
        />
      </span>
    </label>
  );
}

export default function SoundsGenerator({
  onTaskStarted,
}: SoundsGeneratorProps) {
  const { data: session } = useSession();
  const { setShowGate } = usePlayer();

  const [soundPrompt, setSoundPrompt] = useState("");
  const [soundKey, setSoundKey] = useState("Any");
  const [soundKeyOpen, setSoundKeyOpen] = useState(false);
  const [soundLoop, setSoundLoop] = useState(false);
  const [soundTempo, setSoundTempo] = useState("");
  const [grabLyrics, setGrabLyrics] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!session?.user) {
      setShowGate(true);
      return;
    }
    if (!soundPrompt.trim()) {
      setError("Prompt gereklidir");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const tempoNum = soundTempo.trim() ? Number(soundTempo) : undefined;
      const res = await fetch("/api/generate-sounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: soundPrompt.trim(),
          soundKey: soundKey !== "Any" ? soundKey : undefined,
          soundLoop,
          soundTempo: tempoNum,
          grabLyrics,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Hata oluştu");
        return;
      }
      const taskId = data.data?.taskId;
      if (!taskId) {
        setError(data.error || data.msg || "Görev başlatılamadı");
        return;
      }
      onTaskStarted(
        taskId,
        soundPrompt.trim(),
        soundPrompt.trim().slice(0, 40),
      );
      setSoundPrompt("");
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Prompt */}
      <div className="flex flex-col gap-1">
        <label className="text-[#666] text-[11px] font-semibold uppercase tracking-wider">
          Ne tür bir ses istiyorsun?
        </label>
        <textarea
          value={soundPrompt}
          onChange={(e) => setSoundPrompt(e.target.value)}
          placeholder="Nasıl bir ses olsun yaz..."
          rows={4}
          maxLength={500}
          className="w-full bg-[#141414] rounded-xl px-4 py-3 text-white text-sm placeholder-[#444] resize-none focus:outline-none focus:ring-1 focus:ring-[#1db954]/50 transition-all leading-relaxed"
        />
        <span className="text-[#444] text-[10px] tabular-nums self-end">
          {soundPrompt.length}/500
        </span>
      </div>

      <Toggle
        checked={grabLyrics}
        onChange={setGrabLyrics}
        label="Sözleri Al"
      />

      {/* Anahtar */}
      <div className="flex items-center justify-between py-2">
        <span className="text-white text-[13px] font-semibold">Anahtar</span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setSoundKeyOpen((v) => !v)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-white text-xs font-semibold pressable"
          >
            {soundKey}
            <ChevronDown
              size={12}
              className={`transition-transform ${soundKeyOpen ? "rotate-180" : ""}`}
            />
          </button>
          {soundKeyOpen && (
            <div className="absolute top-full right-0 mt-1 z-10 max-h-48 overflow-y-auto scroll-area bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-2xl py-1 min-w-[80px]">
              {SOUND_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setSoundKey(k);
                    setSoundKeyOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    k === soundKey
                      ? "bg-[#1db954] text-white"
                      : "text-[#888] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Toggle checked={soundLoop} onChange={setSoundLoop} label="Döngülü" />

      {/* Tempo */}
      <div className="flex items-center justify-between py-2">
        <span className="text-white text-[13px] font-semibold">Tempo</span>
        <input
          type="number"
          min={1}
          max={300}
          value={soundTempo}
          onChange={(e) => setSoundTempo(e.target.value)}
          placeholder="Otomatik"
          className="w-24 bg-[#1a1a1a] rounded-lg px-3 py-1.5 text-white text-xs text-right placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-[#1db954]/50 transition-all"
        />
      </div>

      {/* Hata */}
      {error && (
        <p className="text-red-400 text-sm text-center py-1">{error}</p>
      )}

      {/* Oluştur */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className={`w-full py-3.5 rounded-full font-bold text-[15px] transition-all pressable ${
          loading
            ? "bg-[#1a1a1a] text-[#555]"
            : "bg-[#1db954] hover:bg-[#1ed760] text-black active:scale-[0.98]"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Başlatılıyor...
          </span>
        ) : (
          "Ses Oluştur"
        )}
      </button>
    </div>
  );
}
