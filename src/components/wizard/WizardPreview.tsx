"use client";

import type { WizardMoodId, WizardThemeId } from "@/types";
import {
  MOOD_CARDS,
  GENRE_CARDS,
  THEME_TEMPLATES,
  MOOD_MAKAM_MAP,
  REGION_CARDS,
} from "@/lib/wizardMappings";
import { MAKAMS, type MakamId } from "@/lib/turkishMusicKB";

interface WizardPreviewProps {
  mood: WizardMoodId;
  genreId: string;
  theme: WizardThemeId | null;
  themeText: string;
  vocalGender: "m" | "f" | "instrumental";
  era: "modern" | "klasik" | "90lar";
  regionId: string | null;
}

const ERA_LABELS: Record<string, string> = {
  modern: "Modern",
  klasik: "Klasik",
  "90lar": "90'lar",
};

const VOCAL_LABELS: Record<string, string> = {
  m: "Erkek vokal",
  f: "Kadın vokal",
  instrumental: "Enstrümantal",
};

export default function WizardPreview({
  mood,
  genreId,
  theme,
  themeText,
  vocalGender,
  era,
  regionId,
}: WizardPreviewProps) {
  const moodCard = MOOD_CARDS.find((m) => m.id === mood);
  const genreCard = GENRE_CARDS.find((g) => g.id === genreId);
  const themeTemplate = THEME_TEMPLATES.find((t) => t.id === theme);
  const makamId = MOOD_MAKAM_MAP[mood]?.primary;
  const makamPreset = makamId ? MAKAMS[makamId as MakamId] : undefined;
  const regionCard = regionId
    ? REGION_CARDS.find((r) => r.id === regionId)
    : null;

  const topicPreview =
    themeText.trim().slice(0, 60) || themeTemplate?.label || "Genel";

  return (
    <div className="bg-[#141414] rounded-2xl p-4 flex flex-col gap-3">
      <p className="text-[#666] text-[11px] font-semibold uppercase tracking-wider">
        Özet
      </p>

      <div className="flex flex-wrap gap-2">
        {moodCard && (
          <span
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-white"
            style={{ backgroundColor: `${moodCard.color}40` }}
          >
            {moodCard.label}
          </span>
        )}
        {genreCard && (
          <span
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-white"
            style={{ backgroundColor: `${genreCard.color}40` }}
          >
            {genreCard.label}
          </span>
        )}
        {makamPreset && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#1db954] bg-[#1db954]/10">
            {makamPreset.label}
          </span>
        )}
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#aaa] bg-white/5">
          {VOCAL_LABELS[vocalGender]}
        </span>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#aaa] bg-white/5">
          {ERA_LABELS[era]}
        </span>
        {regionCard && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#aaa] bg-white/5">
            {regionCard.label}
          </span>
        )}
      </div>

      <p className="text-[#999] text-[12px] leading-relaxed">
        <span className="text-[#666]">Konu:</span> {topicPreview}
        {themeText.length > 60 && "..."}
      </p>
    </div>
  );
}
