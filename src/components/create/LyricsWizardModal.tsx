"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { localizeApiError } from "@/lib/sunoErrors";

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (lyrics: string) => void;
  // Opsiyonel: form'dan gelen KB bağlamı — prefill için
  artistId?: string;
  genreId?: string;
  regionId?: string;
  makamId?: string;
};

const MOODS = [
  "Hüzünlü",
  "Umutlu",
  "Coşkulu",
  "Yaslı",
  "Aşık",
  "Öfkeli",
  "Nostaljik",
  "Meditatif",
];

export default function LyricsWizardModal({
  open,
  onClose,
  onApply,
  artistId,
  genreId,
  regionId,
  makamId,
}: Props) {
  const toast = useToast();
  const [topic, setTopic] = useState("");
  const [mood, setMood] = useState<string>("");
  const [customNotes, setCustomNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Konu gerekli");
      return;
    }
    setError("");
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          mood: mood || undefined,
          customNotes: customNotes.trim() || undefined,
          artistId: artistId || undefined,
          regionId: regionId || undefined,
          makamId: makamId || undefined,
          // genre'yi freeform note olarak geçir (lyrics endpoint genre destekliyor olabilir)
          ...(genreId ? { era: undefined } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const e = localizeApiError(data, "Sözler üretilemedi");
        setError(`${e.title}${e.message ? `: ${e.message}` : ""}`);
        toast.error(e.title, e.message);
        return;
      }
      setResult(data.lyrics || "");
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result.trim()) return;
    onApply(result.trim());
    setTopic("");
    setMood("");
    setCustomNotes("");
    setResult("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[560px] max-h-[90vh] overflow-y-auto bg-[#111] rounded-[24px] border border-[#222] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f1f1f] sticky top-0 bg-[#111] z-10">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#19b35c]" />
            <h2 className="text-white text-[17px] font-semibold">
              AI ile Söz Yaz
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
          <div>
            <label className="block text-white text-[13px] font-medium mb-2">
              Konu <span className="text-red-400">*</span>
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Örn: Ayrılıktan sonra şehirde yalnız bir gece"
              rows={3}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-white text-[14px] placeholder-[#555] focus:outline-none focus:border-[#444] resize-none"
              maxLength={2000}
            />
          </div>

          <div>
            <label className="block text-white text-[13px] font-medium mb-2">
              Duygu
            </label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(mood === m ? "" : m)}
                  className={`px-3 py-1.5 rounded-full text-[12px] transition-colors ${
                    mood === m
                      ? "bg-white text-black"
                      : "bg-[#1a1a1a] text-white hover:bg-[#222]"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-white text-[13px] font-medium mb-2">
              Ek Notlar <span className="text-[#666]">(opsiyonel)</span>
            </label>
            <textarea
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Özel istekler: kimden bahsediyorsun, hangi mekân, anahtar kelimeler..."
              rows={2}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-white text-[13px] placeholder-[#555] focus:outline-none focus:border-[#444] resize-none"
              maxLength={2000}
            />
          </div>

          {(artistId || genreId || regionId || makamId) && (
            <div className="flex flex-wrap gap-1.5 px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
              <span className="text-[#666] text-[11px] mr-1">Bağlam:</span>
              {artistId && (
                <span className="text-[11px] text-white bg-[#1a1a1a] px-2 py-0.5 rounded">
                  {artistId}
                </span>
              )}
              {genreId && (
                <span className="text-[11px] text-white bg-[#1a1a1a] px-2 py-0.5 rounded">
                  {genreId}
                </span>
              )}
              {regionId && (
                <span className="text-[11px] text-white bg-[#1a1a1a] px-2 py-0.5 rounded">
                  {regionId}
                </span>
              )}
              {makamId && (
                <span className="text-[11px] text-white bg-[#1a1a1a] px-2 py-0.5 rounded">
                  {makamId}
                </span>
              )}
            </div>
          )}

          {error && <p className="text-red-400 text-[13px]">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="w-full h-11 rounded-full bg-gradient-to-r from-[#082122] via-[#295b53] to-[#19b35c] text-white text-[14px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Üretiliyor...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Sözleri Üret
              </>
            )}
          </button>

          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-white text-[13px] font-medium">
                  Üretilen Sözler
                </label>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="text-[12px] text-[#19b35c] hover:underline disabled:opacity-40"
                >
                  Yeniden üret
                </button>
              </div>
              <textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                rows={14}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-white text-[13px] font-mono focus:outline-none focus:border-[#444] resize-none leading-[20px]"
              />
              <button
                onClick={handleApply}
                className="w-full h-11 rounded-full bg-white text-black text-[14px] font-semibold hover:bg-[#eee]"
              >
                Forma Ekle
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
