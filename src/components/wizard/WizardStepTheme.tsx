"use client";

import type { WizardThemeId } from "@/types";
import { THEME_TEMPLATES } from "@/lib/wizardMappings";

interface WizardStepThemeProps {
  selected: WizardThemeId | null;
  themeText: string;
  onSelect: (theme: WizardThemeId) => void;
  onTextChange: (text: string) => void;
}

export default function WizardStepTheme({
  selected,
  themeText,
  onSelect,
  onTextChange,
}: WizardStepThemeProps) {
  const handleTemplateClick = (id: WizardThemeId) => {
    const template = THEME_TEMPLATES.find((t) => t.id === id);
    onSelect(id);
    if (template) {
      onTextChange(template.contextHint);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[#888] text-[13px] text-center">
        Şarkının konusu ne olsun?
      </p>

      {/* Hazır temalar */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {THEME_TEMPLATES.map((t) => {
          const isSelected = selected === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTemplateClick(t.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 py-3 px-4 rounded-xl transition-all pressable active:scale-95 ${
                isSelected
                  ? "ring-2 ring-[#1db954] bg-[#1db954]/10"
                  : "bg-[#1a1a1a] hover:bg-[#222]"
              }`}
            >
              <span className="text-white text-[13px] font-semibold">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Serbest metin */}
      <div className="flex flex-col gap-1">
        <label className="text-[#666] text-[11px] font-semibold uppercase tracking-wider">
          {selected && selected !== "custom"
            ? "Detaylandır veya değiştir"
            : "Kendi konunu yaz"}
        </label>
        <textarea
          value={themeText}
          onChange={(e) => {
            onTextChange(e.target.value);
            if (selected !== "custom" && e.target.value.trim()) {
              const template = THEME_TEMPLATES.find((t) => t.id === selected);
              if (template && e.target.value !== template.contextHint) {
                // Kullanıcı şablonu düzenledi, custom'a geç
              }
            }
          }}
          onFocus={() => {
            if (!selected) onSelect("custom");
          }}
          placeholder="Örn: Yaz akşamı sahilde yürürken hissedilen huzur..."
          rows={3}
          maxLength={500}
          className="w-full bg-[#141414] rounded-xl px-4 py-3 text-white text-sm placeholder-[#444] resize-none focus:outline-none focus:ring-1 focus:ring-[#1db954]/50 transition-all leading-relaxed"
        />
        <span className="text-[#444] text-[10px] tabular-nums self-end">
          {themeText.length}/500
        </span>
      </div>
    </div>
  );
}
