"use client";

import { useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

const INSTRUMENT_TAGS = [
  { label: "Bağlama", tag: "[Bağlama solo]" },
  { label: "Ney", tag: "[Ney solo]" },
  { label: "Ud", tag: "[Ud solo]" },
  { label: "Kanun", tag: "[Kanun solo]" },
  { label: "Kemençe", tag: "[Kemençe solo]" },
  { label: "Kaval", tag: "[Kaval solo]" },
  { label: "Klarnet", tag: "[Klarnet solo]" },
  { label: "Darbuka", tag: "[Darbuka break]" },
  { label: "Davul", tag: "[Davul break]" },
  { label: "Zurna", tag: "[Zurna girişi]" },
  { label: "Tanbur", tag: "[Tanbur taksim]" },
  { label: "Bendir", tag: "[Bendir]" },
];

interface WizardStepLyricsProps {
  lyrics: string;
  title: string;
  loading: boolean;
  onLyricsChange: (lyrics: string) => void;
  onTitleChange: (title: string) => void;
  onRegenerate: () => void;
}

export default function WizardStepLyrics({
  lyrics,
  title,
  loading,
  onLyricsChange,
  onTitleChange,
  onRegenerate,
}: WizardStepLyricsProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showInstruments, setShowInstruments] = useState(false);

  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      onLyricsChange(
        lyrics + (lyrics.endsWith("\n") || !lyrics ? "" : "\n") + text + "\n",
      );
      return;
    }
    const start = ta.selectionStart ?? lyrics.length;
    const end = ta.selectionEnd ?? lyrics.length;
    const before = lyrics.slice(0, start);
    const after = lyrics.slice(end);
    const needLeadNl = before.length > 0 && !before.endsWith("\n");
    const needTrailNl = after.length > 0 && !after.startsWith("\n");
    const inserted = `${needLeadNl ? "\n" : ""}${text}${needTrailNl ? "\n" : ""}`;
    const next = before + inserted + after;
    onLyricsChange(next);
    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Loader2 size={24} className="animate-spin text-[#1db954]" />
        <p className="text-[#888] text-[13px]">Sözler yazılıyor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Başlık */}
      <div className="flex flex-col gap-1">
        <label className="text-[#666] text-[11px] font-semibold uppercase tracking-wider">
          Başlık
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={100}
          className="w-full bg-transparent border-b border-[#2a2a2a] px-0 py-2 text-white text-lg font-semibold placeholder-[#444] focus:outline-none focus:border-[#1db954] transition-colors"
        />
      </div>

      {/* Sözler */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-[#666] text-[11px] font-semibold uppercase tracking-wider">
            Sözler
          </label>
          <button
            type="button"
            onClick={onRegenerate}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#1db954] hover:text-white transition-colors pressable"
          >
            <RefreshCw size={11} />
            Yeniden Yaz
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={lyrics}
          onChange={(e) => onLyricsChange(e.target.value)}
          rows={14}
          maxLength={5000}
          className="w-full bg-[#141414] rounded-xl px-4 py-3 text-white text-sm placeholder-[#444] resize-none focus:outline-none focus:ring-1 focus:ring-[#1db954]/50 transition-all leading-relaxed font-mono"
        />
        <span className="text-[#444] text-[10px] tabular-nums self-end">
          {lyrics.length}/5000
        </span>
      </div>

      {/* Enstrüman tag'leri */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowInstruments((v) => !v)}
          className="self-start px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#1db954]/10 text-[#1db954] hover:bg-[#1db954]/20 transition-colors pressable"
        >
          {showInstruments ? "Enstrümanları Gizle" : "Enstrüman Ekle"}
        </button>
        {showInstruments && (
          <div className="flex flex-wrap gap-1.5">
            {INSTRUMENT_TAGS.map((t) => (
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
    </div>
  );
}
