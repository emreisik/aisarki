"use client";

import React, { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePlayer } from "@/contexts/PlayerContext";
import { Loader2, Wand2, Sparkles, ChevronDown } from "lucide-react";
import { GenerateRequest, SunoApiResponse } from "@/types";

interface MusicGeneratorProps {
  onTaskStarted: (
    taskId: string,
    prompt: string,
    title: string,
    streamUrl?: string,
    songId?: string,
  ) => void;
}

// Suno desteklediği model'ler
const MODELS = [
  { id: "V5_5", label: "V5.5" },
  { id: "V5", label: "V5" },
  { id: "V4_5ALL", label: "V4.5 ALL" },
  { id: "V4_5PLUS", label: "V4.5+" },
  { id: "V4_5", label: "V4.5" },
  { id: "V4", label: "V4" },
] as const;

// Suno Sound Key valid values (generate-sounds endpoint için)
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

// Şarkı bölüm etiketleri (Türk müziği + genel yapı)
const SONG_SECTIONS: { label: string; tag: string }[] = [
  { label: "Intro", tag: "[Intro]" },
  { label: "Verse", tag: "[Verse]" },
  { label: "Pre-Chorus", tag: "[Pre-Chorus]" },
  { label: "Chorus", tag: "[Chorus]" },
  { label: "Bridge", tag: "[Bridge]" },
  { label: "Outro", tag: "[Outro]" },
];

const TURKISH_INSTRUMENT_TAGS: { label: string; tag: string }[] = [
  { label: "Bağlama solo", tag: "[Bağlama solo]" },
  { label: "Ney solo", tag: "[Ney solo]" },
  { label: "Ud solo", tag: "[Ud solo]" },
  { label: "Kanun solo", tag: "[Kanun solo]" },
  { label: "Kemençe solo", tag: "[Kemençe solo]" },
  { label: "Kaval solo", tag: "[Kaval solo]" },
  { label: "Klarnet solo", tag: "[Klarnet solo]" },
  { label: "Davul break", tag: "[Davul break]" },
  { label: "Darbuka break", tag: "[Darbuka break]" },
  { label: "Zurna girişi", tag: "[Zurna girişi]" },
  { label: "Tanbur taksim", tag: "[Tanbur taksim]" },
  { label: "Bendir", tag: "[Bendir]" },
  { label: "Vokal susar", tag: "[Vokal susar]" },
  { label: "Tutti", tag: "[Tutti — full ensemble]" },
];

/* ── Türk müziği etiket paleti — şarkı sözüne etiket ekler ── */
function LyricsTagPalette({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
}) {
  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      onChange(
        value + (value.endsWith("\n") || !value ? "" : "\n") + text + "\n",
      );
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const needLeadNl = before.length > 0 && !before.endsWith("\n");
    const needTrailNl = after.length > 0 && !after.startsWith("\n");
    const inserted = `${needLeadNl ? "\n" : ""}${text}${needTrailNl ? "\n" : ""}`;
    const next = before + inserted + after;
    onChange(next);
    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div>
        <p className="text-[#6a6a6a] text-[10px] uppercase tracking-widest font-semibold mb-1.5">
          Bölüm
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SONG_SECTIONS.map((s) => (
            <button
              key={s.tag}
              type="button"
              onClick={() => insertAtCursor(s.tag)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#2a2a2a] border border-[#3a3a3a] text-white hover:border-[#a78bfa] hover:text-[#a78bfa] transition-colors pressable"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[#6a6a6a] text-[10px] uppercase tracking-widest font-semibold mb-1.5">
          Türk Enstrümanı Ekle
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TURKISH_INSTRUMENT_TAGS.map((t) => (
            <button
              key={t.tag}
              type="button"
              onClick={() => insertAtCursor(t.tag)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#1e1e1e] border border-[#3a3a3a] text-[#a78bfa] hover:border-[#a78bfa] hover:bg-[#a78bfa]/10 transition-colors pressable"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Ana component — Suno playground birebir ── */
export default function MusicGenerator({ onTaskStarted }: MusicGeneratorProps) {
  const { data: session } = useSession();
  const { setShowGate } = usePlayer();

  // Tab: Music Generation veya Sounds Generation
  const [tab, setTab] = useState<"music" | "sounds">("music");

  // Music Generation state'leri
  const [customMode, setCustomMode] = useState(true);
  const [model, setModel] = useState<string>("V5_5");
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("");
  const [prompt, setPrompt] = useState(""); // non-custom description
  const [lyrics, setLyrics] = useState("");
  const [instrumental, setInstrumental] = useState(false);

  // Sounds Generation state'leri
  const [soundPrompt, setSoundPrompt] = useState("");
  const [soundKey, setSoundKey] = useState("Any");
  const [soundKeyOpen, setSoundKeyOpen] = useState(false);
  const [soundLoop, setSoundLoop] = useState(false);
  const [soundTempo, setSoundTempo] = useState<string>(""); // empty = auto
  const [grabLyrics, setGrabLyrics] = useState(false);

  // UI state
  const [modelOpen, setModelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // AI yardımcıları
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichError, setEnrichError] = useState("");
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState("");

  const styleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lyricsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Karakter limitleri (Suno docs'a göre model bazlı değişebilir, güvenli üst limitler)
  const PROMPT_MAX = customMode ? 3000 : 500;
  const STYLE_MAX = 1000;
  const TITLE_MAX = 100;
  const LYRICS_MAX = 5000;

  // Fikri Güzelleştir (Claude ile zengin betimleme)
  const handleEnrichPrompt = async () => {
    const target = customMode ? style : prompt;
    if (!target.trim()) {
      setEnrichError("Önce bir fikir yaz");
      return;
    }
    setEnrichError("");
    setEnrichLoading(true);
    try {
      const res = await fetch("/api/enrich-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: target.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEnrichError(data.error || "Fikir güzelleştirilemedi");
        return;
      }
      if (data.enriched) {
        // Custom mode'da style alanına yaz, non-custom'da prompt'a
        if (customMode) setStyle(data.enriched);
        else setPrompt(data.enriched);
      }
    } catch {
      setEnrichError("Bağlantı hatası");
    } finally {
      setEnrichLoading(false);
    }
  };

  // AI ile Söz Yaz (Claude)
  const handleGenerateLyrics = async () => {
    const topic = (customMode ? style : prompt).trim();
    if (!topic) {
      setLyricsError("Önce bir stil/fikir yaz");
      return;
    }
    setLyricsError("");
    setLyricsLoading(true);
    try {
      const res = await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLyricsError(data.error || "Sözler oluşturulamadı");
        return;
      }
      if (data.lyrics) setLyrics(data.lyrics);
    } catch {
      setLyricsError("Bağlantı hatası");
    } finally {
      setLyricsLoading(false);
    }
  };

  const handleGenerateSounds = async () => {
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

  const handleGenerate = async () => {
    if (tab === "sounds") return handleGenerateSounds();
    if (!session?.user) {
      setShowGate(true);
      return;
    }

    // Validasyon
    if (customMode) {
      if (!style.trim()) {
        setError("Style of Music alanı zorunludur");
        return;
      }
      if (!title.trim()) {
        setError("Title alanı zorunludur");
        return;
      }
      if (!instrumental && !lyrics.trim()) {
        setError("Sözler zorunlu (veya Instrumental aç)");
        return;
      }
    } else {
      if (!prompt.trim()) {
        setError("Fikir/açıklama yaz");
        return;
      }
    }

    setError("");
    setLoading(true);

    try {
      // Custom mode'da: prompt = lyrics (Suno için), style ayrı
      // Non-custom mode'da: prompt = description, style yok
      const payload: GenerateRequest & { model?: string } = {
        prompt: customMode ? lyrics.trim() : prompt.trim(),
        style: customMode ? style.trim() : undefined,
        title: customMode ? title.trim() : undefined,
        instrumental,
        customMode,
      };
      // Model seçimini body'e ekle (/api/generate default V4_5ALL, override için)
      (payload as unknown as Record<string, unknown>).model = model;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: SunoApiResponse = await res.json();

      if (!res.ok) {
        setError((data as { error?: string }).error || "Hata oluştu");
        return;
      }
      const taskId = data.data?.taskId;
      if (!taskId) {
        setError(
          (data as { error?: string }).error ||
            data.msg ||
            "Görev başlatılamadı",
        );
        return;
      }

      const sunoSongs = data.data?.sunoData;
      const firstSong = sunoSongs?.[0];
      const streamUrl = firstSong?.stream_audio_url;
      const songId = firstSong?.id;

      onTaskStarted(
        taskId,
        (customMode ? style : prompt).trim(),
        (title || (customMode ? style : prompt)).trim().slice(0, 40),
        streamUrl,
        songId,
      );

      // Form'u temizle
      setPrompt("");
      setStyle("");
      setTitle("");
      setLyrics("");
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  const selectedModel = MODELS.find((m) => m.id === model) ?? MODELS[0];

  return (
    <div className="flex flex-col bg-[#141414] rounded-2xl overflow-hidden border border-[#2a2a2a]">
      {/* Tab bar: Music Generation | Sounds Generation */}
      <div className="flex gap-1 p-1 bg-[#0f0f0f] border-b border-[#2a2a2a]">
        <button
          type="button"
          onClick={() => {
            setTab("music");
            setError("");
          }}
          className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-all pressable"
          style={{
            background:
              tab === "music"
                ? "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)"
                : "transparent",
            color: tab === "music" ? "white" : "#7a7a7a",
          }}
        >
          Music Generation
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("sounds");
            setError("");
          }}
          className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-all pressable"
          style={{
            background:
              tab === "sounds"
                ? "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)"
                : "transparent",
            color: tab === "sounds" ? "white" : "#7a7a7a",
          }}
        >
          Sounds Generation
        </button>
      </div>

      {/* Üst bar: Music → Custom Mode + Model selector | Sounds → V5 sabit */}
      {tab === "music" ? (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#2a2a2a]">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span
              className="relative w-10 h-6 rounded-full transition-colors"
              style={{ background: customMode ? "#7c3aed" : "#3a3a3a" }}
            >
              <input
                type="checkbox"
                checked={customMode}
                onChange={(e) => setCustomMode(e.target.checked)}
                className="sr-only"
              />
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: customMode ? "18px" : "2px" }}
              />
            </span>
            <span className="text-white text-sm font-semibold">
              Custom Mode
            </span>
          </label>

          {/* Model selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setModelOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1e1e] border border-[#3a3a3a] text-white text-sm font-semibold hover:border-[#5a5a5a] transition-colors pressable"
            >
              {selectedModel.label}
              <ChevronDown
                size={14}
                className={`transition-transform ${modelOpen ? "rotate-180" : ""}`}
              />
            </button>
            {modelOpen && (
              <div className="absolute top-full right-0 mt-1 z-10 bg-[#1e1e1e] border border-[#3a3a3a] rounded-lg shadow-xl py-1 min-w-[120px]">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setModel(m.id);
                      setModelOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                      m.id === model
                        ? "bg-[#7c3aed] text-white"
                        : "text-[#a7a7a7] hover:bg-[#2a2a2a] hover:text-white"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <span className="text-[#6a6a6a] text-xs">
            Sounds üretimi sadece V5 destekler
          </span>
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1e1e] border border-[#3a3a3a] text-white text-sm font-semibold"
            title="Suno Sounds endpoint'i sadece V5 modelini destekler"
          >
            V5
          </span>
        </div>
      )}

      <div className="p-4 flex flex-col gap-4">
        {tab === "sounds" && (
          <>
            {/* Sounds Generation form */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#a7a7a7] text-xs font-semibold uppercase tracking-wider">
                Prompt
              </label>
              <div className="relative">
                <textarea
                  value={soundPrompt}
                  onChange={(e) => setSoundPrompt(e.target.value)}
                  placeholder="Enter prompt"
                  rows={6}
                  maxLength={500}
                  className="w-full bg-[#1e1e1e] border-2 border-[#3a3a3a] rounded-xl px-4 py-3 pr-16 text-white text-base placeholder-[#6a6a6a] resize-none focus:outline-none focus:border-[#7c3aed] transition-colors leading-relaxed"
                />
                <span className="absolute bottom-2.5 right-3 text-[#6a6a6a] text-[11px] tabular-nums">
                  {soundPrompt.length}/500
                </span>
              </div>
            </div>

            {/* Grab Lyrics toggle */}
            <label className="flex items-center justify-between cursor-pointer select-none bg-[#1e1e1e] border-2 border-[#3a3a3a] rounded-xl px-4 py-3">
              <span className="text-white text-sm font-semibold">
                Grab Lyrics
              </span>
              <span
                className="relative w-10 h-6 rounded-full transition-colors"
                style={{ background: grabLyrics ? "#7c3aed" : "#3a3a3a" }}
              >
                <input
                  type="checkbox"
                  checked={grabLyrics}
                  onChange={(e) => setGrabLyrics(e.target.checked)}
                  className="sr-only"
                />
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  style={{ left: grabLyrics ? "18px" : "2px" }}
                />
              </span>
            </label>

            {/* Sound Key dropdown */}
            <div className="flex flex-col gap-1.5 bg-[#1e1e1e] border-2 border-[#3a3a3a] rounded-xl px-4 py-3">
              <label className="text-white text-sm font-semibold">
                Sound Key
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSoundKeyOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#141414] border border-[#3a3a3a] text-white text-sm hover:border-[#5a5a5a] transition-colors pressable"
                >
                  {soundKey}
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${soundKeyOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {soundKeyOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-10 max-h-48 overflow-y-auto scroll-area bg-[#141414] border border-[#3a3a3a] rounded-lg shadow-xl py-1">
                    {SOUND_KEYS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setSoundKey(k);
                          setSoundKeyOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                          k === soundKey
                            ? "bg-[#7c3aed] text-white"
                            : "text-[#a7a7a7] hover:bg-[#2a2a2a] hover:text-white"
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sound Loop toggle */}
            <label className="flex items-center justify-between cursor-pointer select-none bg-[#1e1e1e] border-2 border-[#3a3a3a] rounded-xl px-4 py-3">
              <span className="text-white text-sm font-semibold">
                Sound Loop
              </span>
              <span
                className="relative w-10 h-6 rounded-full transition-colors"
                style={{ background: soundLoop ? "#7c3aed" : "#3a3a3a" }}
              >
                <input
                  type="checkbox"
                  checked={soundLoop}
                  onChange={(e) => setSoundLoop(e.target.checked)}
                  className="sr-only"
                />
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  style={{ left: soundLoop ? "18px" : "2px" }}
                />
              </span>
            </label>

            {/* Sound Tempo */}
            <div className="flex flex-col gap-1.5 bg-[#1e1e1e] border-2 border-[#3a3a3a] rounded-xl px-4 py-3">
              <label className="text-white text-sm font-semibold">
                Sound Tempo
              </label>
              <input
                type="number"
                min={1}
                max={300}
                value={soundTempo}
                onChange={(e) => setSoundTempo(e.target.value)}
                placeholder="Auto"
                className="w-full bg-[#141414] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm placeholder-[#6a6a6a] focus:outline-none focus:border-[#7c3aed] transition-colors"
              />
            </div>
          </>
        )}

        {tab === "music" &&
          (customMode ? (
            <>
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#a7a7a7] text-xs font-semibold uppercase tracking-wider">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Şarkı adı"
                  maxLength={TITLE_MAX}
                  className="w-full bg-[#1e1e1e] border-2 border-[#3a3a3a] rounded-xl px-4 py-3 text-white text-base placeholder-[#6a6a6a] focus:outline-none focus:border-[#7c3aed] transition-colors"
                />
              </div>

              {/* Style of Music */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[#a7a7a7] text-xs font-semibold uppercase tracking-wider">
                    Style of Music
                  </label>
                  <button
                    type="button"
                    onClick={handleEnrichPrompt}
                    disabled={enrichLoading || !style.trim()}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#a78bfa] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors pressable"
                  >
                    {enrichLoading ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Güzelleştiriliyor...
                      </>
                    ) : (
                      <>
                        <Wand2 size={12} />
                        Fikrimi Güzelleştir
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <textarea
                    ref={styleTextareaRef}
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="Traditional Turkish folk music from Sivas region, sorrowful authentic male vocal, long-air intro, emotional bağlama lead..."
                    rows={6}
                    maxLength={STYLE_MAX}
                    className="w-full bg-[#1e1e1e] border-2 border-[#3a3a3a] rounded-xl px-4 py-3 pr-16 text-white text-sm placeholder-[#6a6a6a] resize-none focus:outline-none focus:border-[#7c3aed] transition-colors leading-relaxed"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[#6a6a6a] text-[11px] tabular-nums">
                    {style.length}/{STYLE_MAX}
                  </span>
                </div>
                {enrichError && (
                  <p className="text-red-400 text-xs">{enrichError}</p>
                )}
              </div>

              {/* Instrumental toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <span
                  className="relative w-10 h-6 rounded-full transition-colors"
                  style={{ background: instrumental ? "#7c3aed" : "#3a3a3a" }}
                >
                  <input
                    type="checkbox"
                    checked={instrumental}
                    onChange={(e) => setInstrumental(e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                    style={{ left: instrumental ? "18px" : "2px" }}
                  />
                </span>
                <span className="text-white text-sm font-semibold">
                  Instrumental
                </span>
                <span className="text-[#6a6a6a] text-xs">
                  (vokal olmadan sadece enstrümental)
                </span>
              </label>

              {/* Lyrics — sadece instrumental kapalıysa */}
              {!instrumental && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[#a7a7a7] text-xs font-semibold uppercase tracking-wider">
                      Lyrics
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateLyrics}
                      disabled={lyricsLoading || !style.trim()}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#1db954] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors pressable"
                    >
                      {lyricsLoading ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Sözler yazılıyor...
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} />
                          AI ile Söz Yaz
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <textarea
                      ref={lyricsTextareaRef}
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      placeholder={`[Verse]\nSuşehri'nin dağlarına akşam çöker usuldan\n...\n\n[Bağlama solo]\n\n[Chorus]\n...`}
                      rows={10}
                      maxLength={LYRICS_MAX}
                      className="w-full bg-[#1e1e1e] border-2 border-[#3a3a3a] rounded-xl px-4 py-3 pr-20 text-white text-sm placeholder-[#6a6a6a] resize-none focus:outline-none focus:border-[#7c3aed] transition-colors leading-relaxed font-mono"
                    />
                    <span className="absolute bottom-2.5 right-3 text-[#6a6a6a] text-[11px] tabular-nums">
                      {lyrics.length}/{LYRICS_MAX}
                    </span>
                  </div>
                  {lyricsError && (
                    <p className="text-red-400 text-xs">{lyricsError}</p>
                  )}
                  {/* Türk enstrüman etiketleri — sözlere insert et */}
                  <LyricsTagPalette
                    textareaRef={lyricsTextareaRef}
                    value={lyrics}
                    onChange={setLyrics}
                  />
                </div>
              )}
            </>
          ) : (
            /* Non-Custom Mode — sade description */
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[#a7a7a7] text-xs font-semibold uppercase tracking-wider">
                  Şarkı Açıklaması
                </label>
                <button
                  type="button"
                  onClick={handleEnrichPrompt}
                  disabled={enrichLoading || !prompt.trim()}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#a78bfa] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors pressable"
                >
                  {enrichLoading ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Güzelleştiriliyor...
                    </>
                  ) : (
                    <>
                      <Wand2 size={12} />
                      Fikrimi Güzelleştir
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <textarea
                  ref={promptTextareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Sahilde özgür hissettiren bir şarkı, rüzgarın sesi..."
                  rows={5}
                  maxLength={PROMPT_MAX}
                  className="w-full bg-[#1e1e1e] border-2 border-[#3a3a3a] rounded-xl px-4 py-3 pr-16 text-white text-base placeholder-[#6a6a6a] resize-none focus:outline-none focus:border-[#7c3aed] transition-colors leading-relaxed"
                />
                <span className="absolute bottom-2.5 right-3 text-[#6a6a6a] text-[11px] tabular-nums">
                  {prompt.length}/{PROMPT_MAX}
                </span>
              </div>
              {enrichError && (
                <p className="text-red-400 text-xs">{enrichError}</p>
              )}
              {/* Non-custom modda da instrumental toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none mt-1">
                <span
                  className="relative w-10 h-6 rounded-full transition-colors"
                  style={{ background: instrumental ? "#7c3aed" : "#3a3a3a" }}
                >
                  <input
                    type="checkbox"
                    checked={instrumental}
                    onChange={(e) => setInstrumental(e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                    style={{ left: instrumental ? "18px" : "2px" }}
                  />
                </span>
                <span className="text-white text-sm font-semibold">
                  Instrumental
                </span>
              </label>
            </div>
          ))}

        {/* Hata mesajı */}
        {error && (
          <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Generate Music butonu */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-3.5 rounded-full font-bold text-base tracking-wide transition-all pressable disabled:opacity-50"
          style={{
            background: loading
              ? "#2a2a2a"
              : "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
            color: loading ? "#6a6a6a" : "white",
            boxShadow: loading ? "none" : "0 4px 20px rgba(124, 58, 237, 0.4)",
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Başlatılıyor...
            </span>
          ) : (
            "Generate Music"
          )}
        </button>
      </div>
    </div>
  );
}
