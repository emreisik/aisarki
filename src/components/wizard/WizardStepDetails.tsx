"use client";

import { REGION_CARDS, resolveDefaultVocalGender } from "@/lib/wizardMappings";
import type { GenreId } from "@/lib/turkishMusicKB";

interface WizardStepDetailsProps {
  vocalGender: "m" | "f" | "instrumental";
  era: "modern" | "klasik" | "90lar";
  regionId: string | null;
  genreId: string | null;
  onVocalChange: (v: "m" | "f" | "instrumental") => void;
  onEraChange: (v: "modern" | "klasik" | "90lar") => void;
  onRegionChange: (v: string | null) => void;
}

const VOCAL_OPTIONS = [
  { id: "m" as const, label: "Erkek Vokal" },
  { id: "f" as const, label: "Kadın Vokal" },
  { id: "instrumental" as const, label: "Enstrümantal" },
];

const ERA_OPTIONS = [
  { id: "modern" as const, label: "Modern" },
  { id: "klasik" as const, label: "Klasik" },
  { id: "90lar" as const, label: "90'lar" },
];

export default function WizardStepDetails({
  vocalGender,
  era,
  regionId,
  onVocalChange,
  onEraChange,
  onRegionChange,
}: WizardStepDetailsProps) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[#888] text-[13px] text-center">
        Son detaylar (opsiyonel)
      </p>

      {/* Vokal seçimi */}
      <div className="flex flex-col gap-2">
        <label className="text-[#666] text-[11px] font-semibold uppercase tracking-wider">
          Vokal
        </label>
        <div className="flex gap-2">
          {VOCAL_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onVocalChange(opt.id)}
              className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all pressable active:scale-95 ${
                vocalGender === opt.id
                  ? "bg-[#1db954] text-black"
                  : "bg-[#1a1a1a] text-[#888] hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dönem seçimi */}
      <div className="flex flex-col gap-2">
        <label className="text-[#666] text-[11px] font-semibold uppercase tracking-wider">
          Dönem
        </label>
        <div className="flex gap-2">
          {ERA_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onEraChange(opt.id)}
              className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all pressable active:scale-95 ${
                era === opt.id
                  ? "bg-[#1db954] text-black"
                  : "bg-[#1a1a1a] text-[#888] hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bölge seçimi */}
      <div className="flex flex-col gap-2">
        <label className="text-[#666] text-[11px] font-semibold uppercase tracking-wider">
          Bölge
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          <button
            type="button"
            onClick={() => onRegionChange(null)}
            className={`flex-shrink-0 py-2 px-4 rounded-xl text-[12px] font-semibold transition-all pressable active:scale-95 ${
              regionId === null
                ? "bg-[#1db954] text-black"
                : "bg-[#1a1a1a] text-[#888] hover:text-white"
            }`}
          >
            Otomatik
          </button>
          {REGION_CARDS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onRegionChange(r.id)}
              className={`flex-shrink-0 py-2 px-4 rounded-xl text-[12px] font-semibold transition-all pressable active:scale-95 ${
                regionId === r.id
                  ? "bg-[#1db954] text-black"
                  : "bg-[#1a1a1a] text-[#888] hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
