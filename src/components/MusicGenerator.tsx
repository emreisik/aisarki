"use client";

import { useState } from "react";
import {
  Sparkles,
  Music2,
  Mic2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { GenerateRequest, Song, SunoApiResponse } from "@/types";

interface MusicGeneratorProps {
  onSongsAdded: (songs: Song[]) => void;
}

const stylePresets = [
  "Türk Pop",
  "R&B",
  "Hip-Hop",
  "Lo-Fi",
  "Electronic",
  "Rock",
  "Jazz",
  "Klasik",
  "Arabesque",
  "Folk",
  "Metal",
  "Ambient",
];

export default function MusicGenerator({ onSongsAdded }: MusicGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [title, setTitle] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Bir açıklama veya söz gir");
      return;
    }
    if (!customMode && prompt.trim().length > 500) {
      setError(`Çok uzun (${prompt.trim().length}/500 karakter)`);
      return;
    }
    setError("");
    setLoading(true);

    const tempSongs: Song[] = [1, 2].map((i) => ({
      id: `temp-${Date.now()}-${i}`,
      title: title || prompt.slice(0, 40) || "Yeni Şarkı",
      style: style || undefined,
      prompt,
      status: "processing",
      createdAt: new Date().toISOString(),
    }));
    onSongsAdded(tempSongs);

    try {
      const payload: GenerateRequest = {
        prompt: prompt.trim(),
        style: style.trim() || undefined,
        title: title.trim() || undefined,
        instrumental,
        customMode,
      };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: SunoApiResponse = await res.json();

      if (!res.ok) {
        setError((data as { error?: string }).error || "Hata oluştu");
        onSongsAdded([]);
        return;
      }

      const taskId = data.data?.taskId;
      if (!taskId) {
        const msg =
          (data as { error?: string }).error ||
          data.msg ||
          "Görev başlatılamadı";
        setError(msg);
        onSongsAdded([]);
        return;
      }

      pollForSongs(
        taskId,
        tempSongs.map((s) => s.id),
      );
    } catch {
      setError("Bağlantı hatası");
      onSongsAdded([]);
    } finally {
      setLoading(false);
      setPrompt("");
      setTitle("");
    }
  };

  const pollForSongs = async (taskId: string, tempIds: string[]) => {
    let attempts = 0;
    const poll = async () => {
      if (attempts++ >= 40) return;
      try {
        const res = await fetch(`/api/songs?taskId=${taskId}`);
        const data: { status: string; songs: Song[] } = await res.json();
        if (data.status === "complete" && data.songs.length > 0) {
          onSongsAdded(
            data.songs.map((s, i) => ({ ...s, id: tempIds[i] || s.id })),
          );
        } else {
          setTimeout(poll, 5000);
        }
      } catch {
        setTimeout(poll, 8000);
      }
    };
    setTimeout(poll, 10000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Mode tabs */}
      <div className="flex rounded-xl overflow-hidden bg-[#1a1a1a] p-1 gap-1">
        <button
          onClick={() => setCustomMode(false)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            !customMode ? "bg-[#2a2a2a] text-white" : "text-[#a7a7a7]"
          }`}
        >
          <Sparkles size={15} />
          Basit
        </button>
        <button
          onClick={() => setCustomMode(true)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            customMode ? "bg-[#2a2a2a] text-white" : "text-[#a7a7a7]"
          }`}
        >
          <Music2 size={15} />
          Sözlü
        </button>
      </div>

      {/* Main textarea */}
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            customMode
              ? "[Verse 1]\nŞarkı sözlerini buraya yaz..."
              : "Mutlu bir yaz sabahı, sahilde pop şarkısı..."
          }
          rows={customMode ? 8 : 4}
          maxLength={customMode ? 5000 : 500}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-4 py-4 text-white text-sm placeholder-[#535353] resize-none focus:outline-none focus:border-[#535353] transition-colors"
        />
        <span className="absolute bottom-3 right-3 text-[#535353] text-xs tabular-nums">
          {prompt.length}/{customMode ? 5000 : 500}
        </span>
      </div>

      {/* Style chips (simple mode) */}
      {!customMode && (
        <div>
          <p className="text-[#a7a7a7] text-xs font-semibold uppercase tracking-widest mb-2.5 px-1">
            Stil
          </p>
          <div className="flex flex-wrap gap-2">
            {stylePresets.map((s) => (
              <button
                key={s}
                onClick={() => setStyle(style === s ? "" : s)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors pressable ${
                  style === s
                    ? "bg-white text-black"
                    : "bg-[#1a1a1a] text-[#a7a7a7] border border-[#2a2a2a]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Advanced (custom mode extras) */}
      {customMode && (
        <>
          <div>
            <label className="text-[#a7a7a7] text-xs font-semibold uppercase tracking-widest mb-2.5 block px-1">
              Stil
            </label>
            <input
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Pop, rock, electronic..."
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-4 py-3.5 text-white text-sm placeholder-[#535353] focus:outline-none focus:border-[#535353] transition-colors"
            />
          </div>
          <div>
            <label className="text-[#a7a7a7] text-xs font-semibold uppercase tracking-widest mb-2.5 block px-1">
              Şarkı Adı
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Şarkı adı..."
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-4 py-3.5 text-white text-sm placeholder-[#535353] focus:outline-none focus:border-[#535353] transition-colors"
            />
          </div>
        </>
      )}

      {/* Instrumental toggle */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Mic2 size={16} className="text-[#a7a7a7]" />
          <span className="text-sm text-[#a7a7a7]">Enstrümantal</span>
        </div>
        <button
          onClick={() => setInstrumental(!instrumental)}
          className={`relative w-12 h-6 rounded-full transition-colors pressable ${
            instrumental ? "bg-[#1db954]" : "bg-[#2a2a2a]"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              instrumental ? "translate-x-6" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full py-4 rounded-full font-bold text-base tracking-wide transition-all pressable disabled:opacity-50"
        style={{
          background: loading ? "#1a1a1a" : "#1db954",
          color: loading ? "#a7a7a7" : "black",
        }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            Oluşturuluyor...
          </span>
        ) : (
          "Şarkı Oluştur"
        )}
      </button>

      <p className="text-center text-[#535353] text-xs">
        Her seferinde 2 farklı şarkı oluşturulur · ~30–60 sn
      </p>
    </div>
  );
}
