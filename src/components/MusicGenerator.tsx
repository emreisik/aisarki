"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
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

const MODELS = [
  { id: "V5_5", label: "V5.5" },
  { id: "V5", label: "V5" },
  { id: "V4_5ALL", label: "V4.5 ALL" },
  { id: "V4_5PLUS", label: "V4.5+" },
  { id: "V4_5", label: "V4.5" },
  { id: "V4", label: "V4" },
] as const;

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

/* ── Toggle bileşeni ── */
function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer select-none">
      <div>
        <span className="text-white text-[13px] font-semibold">{label}</span>
        {hint && <span className="text-[#555] text-[11px] ml-2">{hint}</span>}
      </div>
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

/* ── Etiket paleti ── */
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

  const [showInstruments, setShowInstruments] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {SONG_SECTIONS.map((s) => (
          <button
            key={s.tag}
            type="button"
            onClick={() => insertAtCursor(s.tag)}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 text-[#aaa] hover:bg-white/10 hover:text-white transition-colors pressable"
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowInstruments((v) => !v)}
          className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#1db954]/10 text-[#1db954] hover:bg-[#1db954]/20 transition-colors pressable"
        >
          {showInstruments ? "Gizle" : "Enstrümanlar"}
        </button>
      </div>
      {showInstruments && (
        <div className="flex flex-wrap gap-1.5">
          {TURKISH_INSTRUMENT_TAGS.map((t) => (
            <button
              key={t.tag}
              type="button"
              onClick={() => insertAtCursor(t.tag)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 text-[#888] hover:bg-white/10 hover:text-white transition-colors pressable"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Ana bileşen ── */
export default function MusicGenerator({ onTaskStarted }: MusicGeneratorProps) {
  const { data: session } = useSession();
  const { setShowGate } = usePlayer();

  const [tab, setTab] = useState<"music" | "sounds">("music");
  const [customMode, setCustomMode] = useState(true);
  const [model, setModel] = useState<string>("V5_5");
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [instrumental, setInstrumental] = useState(false);

  const [soundPrompt, setSoundPrompt] = useState("");
  const [soundKey, setSoundKey] = useState("Any");
  const [soundKeyOpen, setSoundKeyOpen] = useState(false);
  const [soundLoop, setSoundLoop] = useState(false);
  const [soundTempo, setSoundTempo] = useState<string>("");
  const [grabLyrics, setGrabLyrics] = useState(false);

  const [modelOpen, setModelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichError, setEnrichError] = useState("");
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState("");

  const styleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lyricsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  const searchParams = useSearchParams();
  const prefillApplied = useRef(false);
  useEffect(() => {
    if (prefillApplied.current) return;
    const qp = searchParams.get("prompt");
    if (!qp) return;
    prefillApplied.current = true;
    const match = qp.match(/^\[([^\]]+)\]\s*([\s\S]+)$/);
    if (match) {
      setCustomMode(true);
      setStyle(match[1]);
      setPrompt(match[2]);
    } else {
      setCustomMode(false);
      setPrompt(qp);
    }
  }, [searchParams]);

  const PROMPT_MAX = customMode ? 3000 : 500;
  const STYLE_MAX = 1000;
  const TITLE_MAX = 100;
  const LYRICS_MAX = 5000;

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
        if (customMode) setStyle(data.enriched);
        else setPrompt(data.enriched);
      }
    } catch {
      setEnrichError("Bağlantı hatası");
    } finally {
      setEnrichLoading(false);
    }
  };

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

    if (customMode) {
      if (!style.trim()) {
        setError("Müzik tarzı alanı zorunludur");
        return;
      }
      if (!title.trim()) {
        setError("Başlık alanı zorunludur");
        return;
      }
      if (!instrumental && !lyrics.trim()) {
        setError("Sözler zorunlu (veya Enstrümantal aç)");
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
      const payload: GenerateRequest & { model?: string } = {
        prompt: customMode ? lyrics.trim() : prompt.trim(),
        style: customMode ? style.trim() : undefined,
        title: customMode ? title.trim() : undefined,
        instrumental,
        customMode,
      };
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
    <div className="flex flex-col gap-5">
      {/* ── Tab seçici ── */}
      <div className="flex gap-1 p-1 rounded-full bg-[#1a1a1a]">
        {(["music", "sounds"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setError("");
            }}
            className={`flex-1 py-2 rounded-full text-[13px] font-semibold transition-all pressable ${
              tab === t ? "bg-white text-black" : "text-[#666] hover:text-white"
            }`}
          >
            {t === "music" ? "Müzik" : "Ses"}
          </button>
        ))}
      </div>

      {/* ── Müzik formu ── */}
      {tab === "music" && (
        <>
          {/* Kontroller: Özel Mod + Model */}
          <div className="flex items-center justify-between">
            <Toggle
              checked={customMode}
              onChange={setCustomMode}
              label="Özel Mod"
            />
            <div className="relative">
              <button
                type="button"
                onClick={() => setModelOpen((v) => !v)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] text-[#aaa] text-xs font-semibold hover:text-white transition-colors pressable"
              >
                {selectedModel.label}
                <ChevronDown
                  size={12}
                  className={`transition-transform ${modelOpen ? "rotate-180" : ""}`}
                />
              </button>
              {modelOpen && (
                <div className="absolute top-full right-0 mt-1 z-10 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-2xl py-1 min-w-[100px]">
                  {MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setModel(m.id);
                        setModelOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        m.id === model
                          ? "bg-[#1db954] text-white"
                          : "text-[#888] hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {customMode ? (
            <>
              {/* Başlık */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Şarkı adı"
                maxLength={TITLE_MAX}
                className="w-full bg-transparent border-b border-[#2a2a2a] px-0 py-3 text-white text-lg font-semibold placeholder-[#444] focus:outline-none focus:border-[#1db954] transition-colors"
              />

              {/* Müzik Tarzı */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[#666] text-[11px] font-semibold uppercase tracking-wider">
                    Müzik Tarzı
                  </label>
                  <button
                    type="button"
                    onClick={handleEnrichPrompt}
                    disabled={enrichLoading || !style.trim()}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#1db954] hover:text-white disabled:opacity-30 transition-colors pressable"
                  >
                    {enrichLoading ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Wand2 size={11} />
                    )}
                    {enrichLoading ? "Güzelleştiriliyor..." : "Güzelleştir"}
                  </button>
                </div>
                <textarea
                  ref={styleTextareaRef}
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="Hüzünlü Türk halk müziği, otantik erkek vokal, bağlama solo..."
                  rows={3}
                  maxLength={STYLE_MAX}
                  className="w-full bg-[#141414] rounded-xl px-4 py-3 text-white text-sm placeholder-[#444] resize-none focus:outline-none focus:ring-1 focus:ring-[#1db954]/50 transition-all leading-relaxed"
                />
                {enrichError && (
                  <p className="text-red-400 text-xs">{enrichError}</p>
                )}
              </div>

              {/* Enstrümantal */}
              <Toggle
                checked={instrumental}
                onChange={setInstrumental}
                label="Enstrümantal"
                hint="vokal olmadan"
              />

              {/* Sözler */}
              {!instrumental && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[#666] text-[11px] font-semibold uppercase tracking-wider">
                      Sözler
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateLyrics}
                      disabled={lyricsLoading || !style.trim()}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#1db954] hover:text-white disabled:opacity-30 transition-colors pressable"
                    >
                      {lyricsLoading ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Sparkles size={11} />
                      )}
                      {lyricsLoading ? "Yazılıyor..." : "AI ile Yaz"}
                    </button>
                  </div>
                  <textarea
                    ref={lyricsTextareaRef}
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder={
                      "[Verse]\nDağların ardında güneş batar usulca\n...\n\n[Chorus]\n..."
                    }
                    rows={8}
                    maxLength={LYRICS_MAX}
                    className="w-full bg-[#141414] rounded-xl px-4 py-3 text-white text-sm placeholder-[#444] resize-none focus:outline-none focus:ring-1 focus:ring-[#1db954]/50 transition-all leading-relaxed font-mono"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[#444] text-[10px] tabular-nums">
                      {lyrics.length}/{LYRICS_MAX}
                    </span>
                  </div>
                  {lyricsError && (
                    <p className="text-red-400 text-xs">{lyricsError}</p>
                  )}
                  <LyricsTagPalette
                    textareaRef={lyricsTextareaRef}
                    value={lyrics}
                    onChange={setLyrics}
                  />
                </div>
              )}
            </>
          ) : (
            /* Non-Custom Mode */
            <>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[#666] text-[11px] font-semibold uppercase tracking-wider">
                    Ne tür bir şarkı istiyorsun?
                  </label>
                  <button
                    type="button"
                    onClick={handleEnrichPrompt}
                    disabled={enrichLoading || !prompt.trim()}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#1db954] hover:text-white disabled:opacity-30 transition-colors pressable"
                  >
                    {enrichLoading ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Wand2 size={11} />
                    )}
                    {enrichLoading ? "Güzelleştiriliyor..." : "Güzelleştir"}
                  </button>
                </div>
                <textarea
                  ref={promptTextareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Sahilde özgür hissettiren bir şarkı, rüzgarın sesi..."
                  rows={4}
                  maxLength={PROMPT_MAX}
                  className="w-full bg-[#141414] rounded-xl px-4 py-3 text-white text-sm placeholder-[#444] resize-none focus:outline-none focus:ring-1 focus:ring-[#1db954]/50 transition-all leading-relaxed"
                />
                {enrichError && (
                  <p className="text-red-400 text-xs">{enrichError}</p>
                )}
              </div>
              <Toggle
                checked={instrumental}
                onChange={setInstrumental}
                label="Enstrümantal"
              />
            </>
          )}
        </>
      )}

      {/* ── Ses formu ── */}
      {tab === "sounds" && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-[#666] text-[11px] font-semibold uppercase tracking-wider">
              Prompt
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

          {/* Ses Anahtarı */}
          <div className="flex items-center justify-between py-2">
            <span className="text-white text-[13px] font-semibold">
              Anahtar
            </span>
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
        </>
      )}

      {/* ── Hata ── */}
      {error && (
        <p className="text-red-400 text-sm text-center py-1">{error}</p>
      )}

      {/* ── Üret butonu ── */}
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
        ) : tab === "music" ? (
          "Oluştur"
        ) : (
          "Ses Oluştur"
        )}
      </button>
    </div>
  );
}
