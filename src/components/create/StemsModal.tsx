"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Download, AudioLines, Layers, Check } from "lucide-react";
import type { Song } from "@/types";

type StemType = "separate_vocal" | "split_stem";

interface StemEntry {
  url: string;
  label: string;
}

type StemsByType = Partial<
  Record<StemType, Record<string, unknown> | undefined>
>;

const STEM_LABELS: Record<string, string> = {
  vocal: "Vocal",
  vocals: "Vocal",
  instrumental: "Enstrümantal",
  no_vocal: "Enstrümantal",
  backing_vocals: "Geri vokaller",
  drums: "Davul",
  bass: "Bas",
  guitar: "Gitar",
  keyboard: "Klavye",
  strings: "Yaylılar",
  brass: "Bakır üflemeli",
  woodwinds: "Tahta üflemeli",
  percussion: "Perküsyon",
  synth: "Synth",
  fx: "FX",
};

function extractStems(info: Record<string, unknown> | undefined): StemEntry[] {
  if (!info) return [];
  const entries: StemEntry[] = [];
  for (const [key, value] of Object.entries(info)) {
    if (typeof value !== "string") continue;
    if (!value.startsWith("http")) continue;
    const cleanKey = key.replace(/_url$|Url$/i, "").toLowerCase();
    entries.push({
      url: value,
      label: STEM_LABELS[cleanKey] || cleanKey,
    });
  }
  return entries;
}

interface Props {
  open: boolean;
  song: Song | null;
  onClose: () => void;
}

export default function StemsModal({ open, song, onClose }: Props) {
  const [stems, setStems] = useState<StemsByType>({});
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState<StemType | null>(null);
  const [polling, setPolling] = useState<StemType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !song) return;
    setError(null);
    setLoading(true);
    fetch(`/api/stems?songId=${song.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.stems) setStems(d.stems);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, song]);

  // Stems üretildikten sonra polling — DB'ye kaydedilince çek
  useEffect(() => {
    if (!polling || !song) return;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/stems?songId=${song.id}`);
        const d = await r.json();
        if (d.stems?.[polling]) {
          setStems(d.stems);
          setPolling(null);
        }
      } catch {
        /* sessizce */
      }
    }, 4000);
    return () => clearInterval(id);
  }, [polling, song]);

  const handleRequest = async (type: StemType) => {
    if (!song || requesting) return;
    setRequesting(type);
    setError(null);
    try {
      const res = await fetch("/api/stems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: song.id, type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Stems üretimi başlatılamadı");
        return;
      }
      if (data.cached && data.stems) {
        setStems((prev) => ({ ...prev, [type]: data.stems }));
      } else {
        // Backgrounda işleniyor — polling başlat
        setPolling(type);
      }
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setRequesting(null);
    }
  };

  const handleDownload = (entry: StemEntry, songTitle: string) => {
    const safe = (songTitle || "song")
      .replace(/[^\p{L}\p{N}\s.-]+/gu, "")
      .trim()
      .slice(0, 40)
      .replace(/\s+/g, "_");
    const a = document.createElement("a");
    a.href = entry.url;
    a.download = `${safe}_${entry.label}.mp3`;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!open || !song) return null;

  const separateEntries = extractStems(stems.separate_vocal);
  const splitEntries = extractStems(stems.split_stem);
  const hasSeparate = separateEntries.length > 0;
  const hasSplit = splitEntries.length > 0;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md bg-[#0f0f0f] border border-[#222] rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a] flex-shrink-0">
          <div>
            <h2 className="text-white text-base font-semibold">Stems Ayır</h2>
            <p className="text-[#777] text-xs mt-0.5 truncate max-w-[280px]">
              {song.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#1a1a1a] flex items-center justify-center"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-[#777] text-sm py-4">
              <Loader2 size={14} className="animate-spin" />
              Yükleniyor…
            </div>
          )}

          {error && (
            <div className="text-[#ef4444] text-xs bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Separate vocal */}
          <StemSection
            icon={<AudioLines size={16} />}
            title="Vocal + Enstrümantal"
            description="Şarkıdan sadece vokal ve enstrümantal olarak iki track çıkar"
            cost="10 kredi"
            ready={hasSeparate}
            entries={separateEntries}
            requesting={requesting === "separate_vocal"}
            polling={polling === "separate_vocal"}
            onRequest={() => handleRequest("separate_vocal")}
            onDownload={(e) => handleDownload(e, song.title)}
          />

          {/* Split stem */}
          <StemSection
            icon={<Layers size={16} />}
            title="12 Stem Ayrımı"
            description="Davul, bas, gitar, klavye, vokaller… tek tek dosyalar"
            cost="50 kredi"
            ready={hasSplit}
            entries={splitEntries}
            requesting={requesting === "split_stem"}
            polling={polling === "split_stem"}
            onRequest={() => handleRequest("split_stem")}
            onDownload={(e) => handleDownload(e, song.title)}
          />
        </div>
      </div>
    </div>
  );
}

function StemSection({
  icon,
  title,
  description,
  cost,
  ready,
  entries,
  requesting,
  polling,
  onRequest,
  onDownload,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  cost: string;
  ready: boolean;
  entries: StemEntry[];
  requesting: boolean;
  polling: boolean;
  onRequest: () => void;
  onDownload: (entry: StemEntry) => void;
}) {
  return (
    <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-white flex-shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-white text-[13px] font-semibold">{title}</h3>
              {ready && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#19b35c]">
                  <Check size={10} /> hazır
                </span>
              )}
            </div>
            <p className="text-[#777] text-[11px] mt-1 leading-snug">
              {description}
            </p>
          </div>
        </div>
        {!ready && (
          <button
            onClick={onRequest}
            disabled={requesting || polling}
            className="flex-shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold bg-white text-black hover:bg-[#f0f0f0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {requesting || polling ? (
              <>
                <Loader2 size={11} className="animate-spin" />
                {polling ? "İşleniyor…" : "Başlatılıyor…"}
              </>
            ) : (
              cost
            )}
          </button>
        )}
      </div>

      {ready && entries.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {entries.map((entry) => (
            <button
              key={entry.url}
              onClick={() => onDownload(entry)}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] text-white text-[12px] transition-colors"
            >
              <span className="truncate">{entry.label}</span>
              <Download size={12} className="flex-shrink-0 text-[#888]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
