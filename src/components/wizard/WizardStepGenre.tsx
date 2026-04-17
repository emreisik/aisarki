"use client";

import type { WizardMoodId } from "@/types";
import type { GenreId } from "@/lib/turkishMusicKB";
import { sortGenresByAffinity, isGenreRecommended } from "@/lib/wizardMappings";

interface WizardStepGenreProps {
  selected: string | null;
  mood: WizardMoodId;
  onSelect: (genreId: string) => void;
}

export default function WizardStepGenre({
  selected,
  mood,
  onSelect,
}: WizardStepGenreProps) {
  const sortedGenres = sortGenresByAffinity(mood);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[#888] text-[13px] text-center">Hangi tarzda olsun?</p>
      <div className="grid grid-cols-2 gap-2.5">
        {sortedGenres.map((card) => {
          const isSelected = selected === card.id;
          const recommended = isGenreRecommended(mood, card.id as GenreId);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelect(card.id)}
              className={`relative flex flex-col items-center gap-1 py-4 px-3 rounded-2xl transition-all pressable active:scale-95 ${
                isSelected
                  ? "ring-2 ring-[#1db954] bg-[#1db954]/10"
                  : "bg-[#1a1a1a] hover:bg-[#222]"
              }`}
            >
              {recommended && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-[#1db954]/20 text-[#1db954] text-[9px] font-bold">
                  Uyumlu
                </span>
              )}
              <span
                className="w-3 h-3 rounded-full mb-1"
                style={{ backgroundColor: card.color }}
              />
              <span className="text-white text-[13px] font-semibold">
                {card.label}
              </span>
              <span className="text-[#666] text-[11px] text-center">
                {card.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
