"use client";

import type { WizardMoodId } from "@/types";
import { MOOD_CARDS } from "@/lib/wizardMappings";

interface WizardStepMoodProps {
  selected: WizardMoodId | null;
  onSelect: (mood: WizardMoodId) => void;
}

export default function WizardStepMood({
  selected,
  onSelect,
}: WizardStepMoodProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[#888] text-[13px] text-center">
        Şarkın nasıl hissettirmeli?
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {MOOD_CARDS.map((card) => {
          const isSelected = selected === card.id;
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
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ backgroundColor: `${card.color}30` }}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: card.color }}
                />
              </span>
              <span className="text-white text-[13px] font-semibold">
                {card.label}
              </span>
              <span className="text-[#666] text-[11px]">
                {card.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
